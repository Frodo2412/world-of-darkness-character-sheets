import {
  DOSSIER_FIELDS,
  blankCharacter,
  type DossierField,
  type V20Character,
} from '../domain/v20/character';
import {
  validBackgrounds,
  validFlaws,
  validHavens,
  validMerits,
  validOtherTraits,
} from '../domain/v20/dossier/validate';
import { validJournal } from '../domain/v20/journal/validate';
import type { Check } from '../domain/v20/shape';
import { DAMAGE_TYPES, HEALTH_LEVELS } from '../domain/v20/traits';
import { generateId, hasShapeOf, storedIds, type StoragePort } from './storagePort';

export { browserStorage, generateId, type StoragePort } from './storagePort';

/** A stored record that is not a character this version can read. It is never rewritten. */
export type RosterEntry =
  | { kind: 'character'; character: V20Character }
  | { kind: 'unreadable'; id: string };
export type LoadResult =
  | { status: 'found'; character: V20Character }
  | { status: 'not-found' }
  | { status: 'unreadable'; id: string };
/** `failed` means the browser refused the write: storage is full, disabled or blocked. */
export type CreateResult = { status: 'created'; character: V20Character } | { status: 'failed' };
export type SaveResult = { status: 'saved' } | { status: 'failed' };
export type DeleteResult = { status: 'deleted' };

export interface CharacterStore {
  create(): CreateResult;
  save(character: V20Character): SaveResult;
  load(id: string): LoadResult;
  /** Removes one character; an id that is not stored is left as it is. */
  delete(id: string): DeleteResult;
  /** Every stored record, oldest first, readable or not. */
  list(): RosterEntry[];
}

const KEY_PREFIX = 'wod-sheets:character:';

/** The storage key holding the record for `id`. */
export const keyFor = (id: string): string => KEY_PREFIX + id;

function serialise(character: V20Character): string {
  return JSON.stringify(character);
}

/** One validator per dossier field; the record type makes a missing entry a compile error. */
const DOSSIER_VALIDATORS: Record<DossierField, Check> = {
  merits: validMerits,
  flaws: validFlaws,
  otherTraits: validOtherTraits,
  havens: validHavens,
  journal: validJournal,
};

/** Fields a record saved before they existed may lack: each reads as its blank default. */
const BACKFILLED_FIELDS = ['specialties', ...DOSSIER_FIELDS] as const;

/** The fields every record has always had, checked against a blank character's shape. */
const LEGACY_TEMPLATE: Record<string, unknown> = (() => {
  const template: Record<string, unknown> = { ...blankCharacter('') };
  // Backgrounds may exceed the six blank rows, so they have their own check.
  for (const field of [...DOSSIER_FIELDS, 'backgrounds']) delete template[field];
  return template;
})();

function isV20Character(value: unknown, id: string): value is V20Character {
  if (!hasShapeOf(value, LEGACY_TEMPLATE)) return false;
  const character = value as V20Character;
  return (
    character.id === id &&
    character.system === 'v20' &&
    character.schemaVersion === 1 &&
    HEALTH_LEVELS.every((level) => DAMAGE_TYPES.includes(character.health[level.key])) &&
    Object.values(character.specialties).every((specialty) => typeof specialty === 'string') &&
    validBackgrounds(character.backgrounds) &&
    DOSSIER_FIELDS.every((field) => DOSSIER_VALIDATORS[field](character[field]))
  );
}

/** A record saved before a field existed has none: it is read with that field's blank default. */
function withBlankDefaults(value: unknown, id: string): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return value;
  const blank = blankCharacter(id);
  const missing = BACKFILLED_FIELDS.filter((field) => !(field in value));
  return { ...value, ...Object.fromEntries(missing.map((field) => [field, blank[field]])) };
}

/** The only way stored text becomes a character. */
function parseRecord(text: string, id: string): V20Character | undefined {
  try {
    const value: unknown = withBlankDefaults(JSON.parse(text), id);
    return isV20Character(value, id) ? value : undefined;
  } catch {
    return undefined;
  }
}

export function createCharacterStore(
  storage: StoragePort,
  newId: (latestId?: string) => string = generateId,
): CharacterStore {
  function save(character: V20Character): SaveResult {
    try {
      storage.setItem(keyFor(character.id), serialise(character));
      return { status: 'saved' };
    } catch {
      return { status: 'failed' };
    }
  }

  function load(id: string): LoadResult {
    const text = storage.getItem(keyFor(id));
    if (text === null) return { status: 'not-found' };
    const character = parseRecord(text, id);
    return character ? { status: 'found', character } : { status: 'unreadable', id };
  }

  return {
    create() {
      const character = blankCharacter(newId(storedIds(storage, KEY_PREFIX).at(-1)));
      return save(character).status === 'saved'
        ? { status: 'created', character }
        : { status: 'failed' };
    },
    save,
    load,
    delete(id) {
      storage.removeItem(keyFor(id));
      return { status: 'deleted' };
    },
    list() {
      return storedIds(storage, KEY_PREFIX).flatMap((id): RosterEntry[] => {
        const result = load(id);
        if (result.status === 'found') return [{ kind: 'character', character: result.character }];
        return result.status === 'unreadable' ? [{ kind: 'unreadable', id }] : [];
      });
    },
  };
}
