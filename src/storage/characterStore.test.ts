import { afterEach, describe, expect, test, vi } from 'vitest';
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
    expect(listedIds(store)).toEqual([first.id, second.id]);
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
  });

  test('list ignores storage entries that belong to something else', () => {
    const store = createCharacterStore(fakeStorage({ theme: 'dark' }), sequentialIds('a'));
    const { character } = store.create();
    // Same length as the store's own key prefix, so only a prefix check tells it apart.
    const foreignKey = 'x'.repeat('wod-sheets:character:'.length) + character.id;
    const storage = fakeStorage({
      theme: 'dark',
      [foreignKey]: JSON.stringify(character),
    });

    expect(listedIds(createCharacterStore(storage))).toEqual([]);
  });

  test('a store over the same storage sees characters saved earlier', () => {
    const storage = fakeStorage();
    createCharacterStore(storage, sequentialIds('a')).create();

    expect(listedIds(createCharacterStore(storage))).toEqual(['a']);
  });
});

describe('characterStore delete', () => {
  /** Everything in the storage, so a test can see exactly what changed. */
  const contents = (storage: StoragePort): Record<string, string | null> =>
    Object.fromEntries(
      Array.from({ length: storage.length }, (_, index) => storage.key(index)!).map((key) => [
        key,
        storage.getItem(key),
      ]),
    );

  test('removes the character from the store', () => {
    const store = createCharacterStore(fakeStorage(), sequentialIds('a', 'b'));
    store.create();
    store.create();

    expect(store.delete('a')).toEqual({ status: 'deleted' });

    expect(listedIds(store)).toEqual(['b']);
    expect(store.load('a')).toEqual({ status: 'not-found' });
  });

  test('leaves every other stored entry exactly as it was', () => {
    const storage = fakeStorage({ theme: 'dark' });
    const store = createCharacterStore(storage, sequentialIds('a', 'b', 'c'));
    store.create();
    store.create();
    store.create();
    const expected = contents(storage);
    delete expected[Object.keys(expected).find((key) => key.endsWith(':b'))!];

    store.delete('b');

    expect(contents(storage)).toEqual(expected);
  });

  test('deleting an id that is not stored changes nothing', () => {
    const storage = fakeStorage();
    const store = createCharacterStore(storage, sequentialIds('a'));
    store.create();
    const before = contents(storage);

    expect(store.delete('missing')).toEqual({ status: 'deleted' });

    expect(contents(storage)).toEqual(before);
  });

  test('deleting the last character leaves an empty roster', () => {
    const store = createCharacterStore(fakeStorage(), sequentialIds('a'));
    store.create();

    store.delete('a');

    expect(store.list()).toEqual([]);
  });
});

describe('generateId', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const idAt = (time: number, latestId?: string): string => {
    vi.useFakeTimers({ now: time });
    return generateId(latestId);
  };

  test('gives a different id each time', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateId()));
    expect(ids.size).toBe(50);
  });

  test('an id created later sorts after one created earlier', () => {
    const earlier = idAt(1_000);
    const later = idAt(2_000_000_000_000);

    expect([later, earlier].sort()).toEqual([earlier, later]);
  });

  test('ids keep sorting by time when the timestamp gains a digit', () => {
    const lastEightDigit = 36 ** 8 - 1;
    const earlier = idAt(lastEightDigit);
    const later = idAt(lastEightDigit + 1);

    expect([later, earlier].sort()).toEqual([earlier, later]);
  });

  test('an id sorts after the latest one when created in the same millisecond', () => {
    const latest = idAt(5_000);
    const next = idAt(5_000, latest);

    expect(next > latest).toBe(true);
  });

  test('an id sorts after the latest one when the clock has gone backwards', () => {
    const latest = idAt(2_000_000_000_000);
    const next = idAt(1_000, latest);

    expect(next > latest).toBe(true);
  });

  test('an id is still generated when the latest one has no timestamp', () => {
    expect(idAt(5_000, '-')).toMatch(/^0000003uw-[0-9a-f]{8}$/);
  });
});

describe('characterStore with generated ids', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test('characters created in the same millisecond are listed in creation order', () => {
    vi.useFakeTimers({ now: 5_000 });
    const store = createCharacterStore(fakeStorage());

    const created = [store.create(), store.create(), store.create()].map(
      (result) => result.character.id,
    );

    expect(listedIds(store)).toEqual(created);
  });
});
