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

export interface CharacterStore {
  create(): CreateResult;
  save(character: V20Character): SaveResult;
  load(id: string): LoadResult;
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
  // Ids start with their creation time, so sorting them gives oldest first
  // whatever order the browser enumerates keys in.
  return ids.sort();
}

/** A unique id that sorts by creation time. */
export function generateId(): string {
  const createdAt = Date.now().toString(36).padStart(9, '0');
  return `${createdAt}-${crypto.randomUUID().slice(0, 8)}`;
}

export function createCharacterStore(
  storage: StoragePort,
  newId: () => string = generateId,
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
      const character = blankCharacter(newId());
      save(character);
      return { status: 'created', character };
    },
    save,
    load,
    list() {
      return storedIds(storage).flatMap((id): RosterEntry[] => {
        const result = load(id);
        return result.status === 'found' ? [{ kind: 'character', character: result.character }] : [];
      });
    },
  };
}
