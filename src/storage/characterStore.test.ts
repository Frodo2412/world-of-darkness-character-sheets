import { describe, expect, test } from 'vitest';
import { blankCharacter } from '../domain/v20/character';
import { createCharacterStore, generateId, type StoragePort } from './characterStore';

/** An in-memory stand-in for `localStorage`. */
function fakeStorage(initial: Record<string, string> = {}): StoragePort {
  const items = new Map(Object.entries(initial));
  return {
    get length() {
      return items.size;
    },
    key: (index) => [...items.keys()][index] ?? null,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}

function sequentialIds(...ids: string[]): () => string {
  let next = 0;
  return () => ids[next++];
}

const listedIds = (store: ReturnType<typeof createCharacterStore>) =>
  store.list().map((entry) => entry.character.id);

describe('characterStore', () => {
  test('a new store lists no characters', () => {
    expect(createCharacterStore(fakeStorage()).list()).toEqual([]);
  });

  test('create returns a blank character and stores it', () => {
    const store = createCharacterStore(fakeStorage(), sequentialIds('a'));

    const result = store.create();

    expect(result).toEqual({ status: 'created', character: blankCharacter('a') });
    expect(store.load('a')).toEqual({ status: 'found', character: blankCharacter('a') });
  });

  test('two creates give distinct characters', () => {
    const store = createCharacterStore(fakeStorage());

    const first = store.create().character;
    const second = store.create().character;

    expect(first.id).not.toBe(second.id);
    expect(listedIds(store).sort()).toEqual([first.id, second.id].sort());
  });

  test('a saved character round-trips with every field intact', () => {
    const store = createCharacterStore(fakeStorage());
    const character = blankCharacter('lucita');
    character.header.name = 'Lucita';
    character.header.clan = 'Lasombra';
    character.attributes.strength = 4;
    character.disciplines[0] = { name: 'Dominate', rating: 3 };
    character.health.hurt = 'aggravated';
    character.notes = 'line one\nline two';

    expect(store.save(character)).toEqual({ status: 'saved' });

    expect(store.load('lucita')).toEqual({ status: 'found', character });
  });

  test('saving again replaces the stored character rather than adding one', () => {
    const store = createCharacterStore(fakeStorage(), sequentialIds('a'));
    const { character } = store.create();

    store.save({ ...character, notes: 'edited' });

    expect(store.list()).toHaveLength(1);
    expect(store.load('a')).toMatchObject({ character: { notes: 'edited' } });
  });

  test('saving one character leaves another untouched', () => {
    const store = createCharacterStore(fakeStorage(), sequentialIds('a', 'b'));
    const first = store.create().character;
    store.create();

    store.save({ ...first, notes: 'edited' });

    expect(store.load('b')).toEqual({ status: 'found', character: blankCharacter('b') });
  });

  test('an unknown id loads as not found', () => {
    const store = createCharacterStore(fakeStorage(), sequentialIds('a'));
    store.create();

    expect(store.load('missing')).toEqual({ status: 'not-found' });
  });

  test('list is ordered by id whatever order the storage enumerates keys in', () => {
    const storage = fakeStorage();
    const store = createCharacterStore(storage, sequentialIds('c', 'a', 'b'));
    store.create();
    store.create();
    store.create();

    expect(listedIds(store)).toEqual(['a', 'b', 'c']);
    expect(listedIds(store)).toEqual(['a', 'b', 'c']);
  });

  test('list ignores storage entries that belong to something else', () => {
    const storage = fakeStorage({ theme: 'dark', 'other-app:character:x': '{}' });
    const store = createCharacterStore(storage, sequentialIds('a'));
    store.create();

    expect(listedIds(store)).toEqual(['a']);
  });

  test('a store over the same storage sees characters saved earlier', () => {
    const storage = fakeStorage();
    createCharacterStore(storage, sequentialIds('a')).create();

    expect(listedIds(createCharacterStore(storage))).toEqual(['a']);
  });
});

describe('generateId', () => {
  test('gives a different id each time', () => {
    const ids = new Set(Array.from({ length: 50 }, generateId));
    expect(ids.size).toBe(50);
  });

  test('later ids sort after earlier ones', () => {
    const realNow = Date.now;
    try {
      Date.now = () => 1_000;
      const earlier = generateId();
      Date.now = () => 2_000_000_000_000;
      const later = generateId();
      expect([later, earlier].sort()).toEqual([earlier, later]);
    } finally {
      Date.now = realNow;
    }
  });
});
