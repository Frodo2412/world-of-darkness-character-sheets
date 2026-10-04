import { blankCharacter, type V20Character } from '../domain/v20/character';

/** The part of the Web Storage API the store needs; `localStorage` satisfies it. */
export interface StoragePort {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type RosterEntry = { kind: 'character'; character: V20Character };
export type LoadResult = { status: 'found'; character: V20Character } | { status: 'not-found' };
export type CreateResult = { status: 'created'; character: V20Character };
export type SaveResult = { status: 'saved' };
export type DeleteResult = { status: 'deleted' };

export interface CharacterStore {
  create(): CreateResult;
  save(character: V20Character): SaveResult;
  load(id: string): LoadResult;
  /** Removes one character; an id that is not stored is left as it is. */
  delete(id: string): DeleteResult;
  /** Every stored character, oldest first. */
  list(): RosterEntry[];
}

const KEY_PREFIX = 'wod-sheets:character:';

const keyFor = (id: string): string => KEY_PREFIX + id;

function serialise(character: V20Character): string {
  return JSON.stringify(character);
}

function deserialise(text: string): V20Character {
  return JSON.parse(text) as V20Character;
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

export function createCharacterStore(
  storage: StoragePort,
  newId: (latestId?: string) => string = generateId,
): CharacterStore {
  function save(character: V20Character): SaveResult {
    storage.setItem(keyFor(character.id), serialise(character));
    return { status: 'saved' };
  }

  function load(id: string): LoadResult {
    const text = storage.getItem(keyFor(id));
    if (text === null) return { status: 'not-found' };
    return { status: 'found', character: deserialise(text) };
  }

  return {
    create() {
      const character = blankCharacter(newId(storedIds(storage).at(-1)));
      save(character);
      return { status: 'created', character };
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
        return result.status === 'found' ? [{ kind: 'character', character: result.character }] : [];
      });
    },
  };
}
