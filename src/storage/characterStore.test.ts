import { afterEach, describe, expect, test, vi } from 'vitest';
import { blankCharacter } from '../domain/v20/character';
import {
  browserStorage,
  createCharacterStore,
  generateId,
  type StoragePort,
} from './characterStore';

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

/** Creates a character, failing the test if the store could not. */
function createIn(store: ReturnType<typeof createCharacterStore>) {
  const result = store.create();
  if (result.status !== 'created') throw new Error('the store could not create a character');
  return result.character;
}

const listedIds = (store: ReturnType<typeof createCharacterStore>) =>
  store.list().map((entry) => (entry.kind === 'character' ? entry.character.id : entry.id));

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

    const first = createIn(store);
    const second = createIn(store);

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
    const character = createIn(store);

    store.save({ ...character, notes: 'edited' });

    expect(store.list()).toHaveLength(1);
    expect(store.load('a')).toMatchObject({ character: { notes: 'edited' } });
  });

  test('saving one character leaves another untouched', () => {
    const store = createCharacterStore(fakeStorage(), sequentialIds('a', 'b'));
    const first = createIn(store);
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
    const character = createIn(store);
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

describe('characterStore with unreadable records', () => {
  const KEY = 'wod-sheets:character:';
  const valid = (id: string) => JSON.stringify(blankCharacter(id));
  const altered = (id: string, change: (record: Record<string, any>) => void): string => {
    const record = JSON.parse(valid(id));
    change(record);
    return JSON.stringify(record);
  };

  const UNREADABLE: [string, string][] = [
    ['text that is not JSON', '{not json'],
    ['an empty value', ''],
    ['JSON that is not an object', '"just a string"'],
    ['JSON null', 'null'],
    ['an array', '[]'],
    ['an object that is not a character', '{"hello":"world"}'],
    ['another game system', altered('bad', (record) => (record.system = 'mage'))],
    ['a schema version from the future', altered('bad', (record) => (record.schemaVersion = 2))],
    ['no schema version', altered('bad', (record) => delete record.schemaVersion)],
    ['an id that differs from its key', altered('bad', (record) => (record.id = 'other'))],
    ['a missing section', altered('bad', (record) => delete record.attributes)],
    ['a missing trait', altered('bad', (record) => delete record.attributes.strength)],
    ['a rating that is text', altered('bad', (record) => (record.abilities.brawl = '3'))],
    ['a rating that is null', altered('bad', (record) => (record.virtues.courage = null))],
    ['a header field that is a number', altered('bad', (record) => (record.header.name = 7))],
    ['five discipline rows', altered('bad', (record) => record.disciplines.pop())],
    ['a discipline row with no name', altered('bad', (record) => delete record.disciplines[0].name)],
    ['disciplines that are not a list', altered('bad', (record) => (record.disciplines = {}))],
    ['an unknown damage type', altered('bad', (record) => (record.health.hurt = 'fire'))],
    ['notes that are not text', altered('bad', (record) => (record.notes = ['a']))],
  ];

  test.each(UNREADABLE)('%s loads as unreadable', (_description, text) => {
    const store = createCharacterStore(fakeStorage({ [KEY + 'bad']: text }));

    expect(store.load('bad')).toEqual({ status: 'unreadable', id: 'bad' });
  });

  test.each(UNREADABLE)('%s is listed as unreadable beside its readable neighbours', (_d, text) => {
    const storage = fakeStorage({ [KEY + 'a']: valid('a'), [KEY + 'bad']: text, [KEY + 'c']: valid('c') });

    expect(createCharacterStore(storage).list()).toEqual([
      { kind: 'character', character: blankCharacter('a') },
      { kind: 'unreadable', id: 'bad' },
      { kind: 'character', character: blankCharacter('c') },
    ]);
  });

  test('reading never rewrites or removes what is stored', () => {
    const records = { [KEY + 'a']: valid('a'), [KEY + 'bad']: '{not json', [KEY + 'worse']: 'null' };
    const storage = fakeStorage(records);
    const store = createCharacterStore(storage);

    store.list();
    store.load('bad');
    store.load('worse');

    expect(Object.fromEntries(Object.keys(records).map((key) => [key, storage.getItem(key)]))).toEqual(
      records,
    );
    expect(storage.length).toBe(3);
  });

  test('a record with fields this version does not know is still readable', () => {
    const text = altered('a', (record) => (record.merits = ['Eidetic Memory']));
    const store = createCharacterStore(fakeStorage({ [KEY + 'a']: text }));

    expect(store.load('a')).toMatchObject({ status: 'found', character: { id: 'a' } });
  });

  test('a record with a health level this version does not know is still readable', () => {
    const text = altered('a', (record) => (record.health.torpor = 'staked'));
    const store = createCharacterStore(fakeStorage({ [KEY + 'a']: text }));

    expect(store.load('a')).toMatchObject({ status: 'found', character: { id: 'a' } });
  });

  test('an unreadable record can be deleted', () => {
    const storage = fakeStorage({ [KEY + 'a']: valid('a'), [KEY + 'bad']: '{not json' });
    const store = createCharacterStore(storage);

    store.delete('bad');

    expect(store.list()).toEqual([{ kind: 'character', character: blankCharacter('a') }]);
  });

  test('a new character can be created beside an unreadable record', () => {
    const store = createCharacterStore(fakeStorage({ [KEY + 'bad']: '{not json' }), sequentialIds('z'));

    store.create();

    expect(store.list()).toEqual([
      { kind: 'unreadable', id: 'bad' },
      { kind: 'character', character: blankCharacter('z') },
    ]);
  });
});

describe('characterStore when the browser refuses to write', () => {
  /** A storage that reads normally but refuses writes while `refusing` is true. */
  function refusingStorage(initial: Record<string, string> = {}) {
    const storage = fakeStorage(initial);
    const control = { refusing: true };
    const port: StoragePort = {
      get length() {
        return storage.length;
      },
      key: (index) => storage.key(index),
      getItem: (key) => storage.getItem(key),
      removeItem: (key) => storage.removeItem(key),
      setItem: (key, value) => {
        if (control.refusing) throw new DOMException('quota exceeded', 'QuotaExceededError');
        storage.setItem(key, value);
      },
    };
    return { port, control };
  }

  test('save reports the failure instead of throwing', () => {
    const { port } = refusingStorage();

    expect(createCharacterStore(port).save(blankCharacter('a'))).toEqual({ status: 'failed' });
  });

  test('a failed save leaves the earlier saved character as it was', () => {
    const saved = JSON.stringify(blankCharacter('a'));
    const { port } = refusingStorage({ 'wod-sheets:character:a': saved });
    const store = createCharacterStore(port);

    store.save({ ...blankCharacter('a'), notes: 'edited' });

    expect(store.load('a')).toEqual({ status: 'found', character: blankCharacter('a') });
  });

  test('create reports the failure and lists nothing', () => {
    const { port } = refusingStorage();
    const store = createCharacterStore(port, sequentialIds('a'));

    expect(store.create()).toEqual({ status: 'failed' });
    expect(store.list()).toEqual([]);
  });

  test('saving works again once the browser accepts writes', () => {
    const { port, control } = refusingStorage();
    const store = createCharacterStore(port);
    const edited = { ...blankCharacter('a'), notes: 'edited' };
    store.save(edited);

    control.refusing = false;

    expect(store.save(edited)).toEqual({ status: 'saved' });
    expect(store.load('a')).toEqual({ status: 'found', character: edited });
  });
});

describe('browserStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("is the browser's storage when it is available", () => {
    const storage = fakeStorage();
    vi.stubGlobal('localStorage', storage);

    expect(browserStorage()).toBe(storage);
  });

  test('is undefined when the browser refuses to hand storage over', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('denied', 'SecurityError');
      },
    });

    try {
      expect(browserStorage()).toBeUndefined();
    } finally {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    }
  });

  test('is undefined when storage exists but cannot be used', () => {
    vi.stubGlobal('localStorage', {
      get length(): number {
        throw new DOMException('denied', 'SecurityError');
      },
    });

    expect(browserStorage()).toBeUndefined();
  });

  test('is undefined when the browser has no storage at all', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(browserStorage()).toBeUndefined();
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

    const created = [createIn(store), createIn(store), createIn(store)].map(
      (character) => character.id,
    );

    expect(listedIds(store)).toEqual(created);
  });
});
