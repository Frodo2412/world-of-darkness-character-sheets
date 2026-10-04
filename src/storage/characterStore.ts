import { blankCharacter, type V20Character } from '../domain/v20/character';
import { DAMAGE_TYPES, HEALTH_LEVELS } from '../domain/v20/traits';

/** The part of the Web Storage API the store needs; `localStorage` satisfies it. */
export interface StoragePort {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

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

const keyFor = (id: string): string => KEY_PREFIX + id;

function serialise(character: V20Character): string {
  return JSON.stringify(character);
}

/** Whether `value` has every field of `template`, each of the same kind, all the way down. */
function hasShapeOf(value: unknown, template: unknown): boolean {
  if (Array.isArray(template)) {
    return (
      Array.isArray(value) &&
      value.length === template.length &&
      value.every((item) => hasShapeOf(item, template[0]))
    );
  }
  if (typeof template === 'object' && template !== null) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const fields = value as Record<string, unknown>;
    return Object.entries(template).every(([key, expected]) => hasShapeOf(fields[key], expected));
  }
  if (typeof template === 'number') return typeof value === 'number' && Number.isFinite(value);
  return typeof value === typeof template;
}

function isV20Character(value: unknown, id: string): value is V20Character {
  if (!hasShapeOf(value, blankCharacter(id))) return false;
  const character = value as V20Character;
  return (
    character.id === id &&
    character.system === 'v20' &&
    character.schemaVersion === 1 &&
    HEALTH_LEVELS.every((level) => DAMAGE_TYPES.includes(character.health[level.key]))
  );
}

/** The only way stored text becomes a character. */
function parseRecord(text: string, id: string): V20Character | undefined {
  try {
    const value: unknown = JSON.parse(text);
    return isV20Character(value, id) ? value : undefined;
  } catch {
    return undefined;
  }
}

function storedIds(storage: StoragePort): string[] {
  const ids: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(KEY_PREFIX)) ids.push(key.slice(KEY_PREFIX.length));
  }
  // Generated ids sort in creation order, so sorting them gives oldest first
  // whatever order the browser enumerates keys in.
  return ids.sort();
}

const TIMESTAMP_WIDTH = 9;

function randomHex(bytes: number): string {
  // getRandomValues, unlike randomUUID, also exists on plain-HTTP origins.
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('');
}

/**
 * A unique id that sorts after `latestId`, the newest id already in use.
 * It is the creation time unless the clock has not moved past `latestId`
 * (two creates in one millisecond, or a clock set backwards).
 */
export function generateId(latestId?: string): string {
  const latest = latestId === undefined ? NaN : parseInt(latestId.slice(0, TIMESTAMP_WIDTH), 36);
  const createdAt = Number.isNaN(latest) ? Date.now() : Math.max(Date.now(), latest + 1);
  return `${createdAt.toString(36).padStart(TIMESTAMP_WIDTH, '0')}-${randomHex(4)}`;
}

/** The browser's storage, or undefined where the browser withholds it from the page. */
export function browserStorage(): StoragePort | undefined {
  try {
    const storage = globalThis.localStorage;
    // Some browsers hand over the object and only refuse when it is used.
    void storage.length;
    return storage;
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
      const character = blankCharacter(newId(storedIds(storage).at(-1)));
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
      return storedIds(storage).flatMap((id): RosterEntry[] => {
        const result = load(id);
        if (result.status === 'found') return [{ kind: 'character', character: result.character }];
        return result.status === 'unreadable' ? [{ kind: 'unreadable', id }] : [];
      });
    },
  };
}
