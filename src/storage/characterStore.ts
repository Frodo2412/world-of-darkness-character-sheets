import { blankCharacter, type V20Character } from '../domain/v20/character';
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

function isV20Character(value: unknown, id: string): value is V20Character {
  if (!hasShapeOf(value, blankCharacter(id))) return false;
  const character = value as V20Character;
  return (
    character.id === id &&
    character.system === 'v20' &&
    character.schemaVersion === 1 &&
    HEALTH_LEVELS.every((level) => DAMAGE_TYPES.includes(character.health[level.key])) &&
    Object.values(character.specialties).every((specialty) => typeof specialty === 'string')
  );
}

/** A record saved before specialties existed has none: it is read as a character with no specialties. */
function withSpecialties(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || 'specialties' in value) return value;
  return { ...value, specialties: {} };
}

/** The only way stored text becomes a character. */
function parseRecord(text: string, id: string): V20Character | undefined {
  try {
    const value: unknown = withSpecialties(JSON.parse(text));
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
