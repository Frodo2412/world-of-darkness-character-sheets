import { describe, expect, test } from 'vitest';
import { blankBuild, type V20Build } from '../domain/v20/creation/build';
import { setBaseGeneration, setExtraFreebies } from '../domain/v20/creation/updates';
import type { UpdateResult } from '../domain/v20/creation/result';
import { buildKeyFor, createBuildStore } from './buildStore';
import { createCharacterStore, keyFor } from './characterStore';
import type { StoragePort } from './storagePort';

/** An in-memory stand-in for `localStorage`. */
function fakeStorage(initial: Record<string, string> = {}): StoragePort & { items: Map<string, string> } {
  const items = new Map(Object.entries(initial));
  return {
    items,
    get length() {
      return items.size;
    },
    key: (index) => [...items.keys()][index] ?? null,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}

/** A storage whose writes and removals all throw, as a full or blocked browser storage does. */
function refusingStorage(initial: Record<string, string> = {}): StoragePort {
  const storage = fakeStorage(initial);
  return {
    ...storage,
    get length() {
      return storage.length;
    },
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
    removeItem: () => {
      throw new Error('SecurityError');
    },
  };
}

function sequentialIds(...ids: string[]): () => string {
  let next = 0;
  return () => ids[next++];
}

function appliedBuild(result: UpdateResult): V20Build {
  if (result.status !== 'applied') throw new Error(`refused: ${result.reason}`);
  return result.build;
}

const record = (fields: Record<string, unknown>): string =>
  JSON.stringify({ ...blankBuild('a'), ...fields });

describe('buildStore', () => {
  test('a new store lists no builds', () => {
    expect(createBuildStore(fakeStorage()).list()).toEqual([]);
  });

  test('create returns a blank build and stores it', () => {
    const store = createBuildStore(fakeStorage(), sequentialIds('a'));

    expect(store.create()).toEqual({ status: 'created', build: blankBuild('a') });
    expect(store.load('a')).toEqual({ status: 'found', build: blankBuild('a') });
  });

  test('two creates give distinct builds, listed oldest first', () => {
    const store = createBuildStore(fakeStorage());

    const first = store.create();
    const second = store.create();
    if (first.status !== 'created' || second.status !== 'created') throw new Error('not created');

    expect(first.build.id).not.toBe(second.build.id);
    expect(store.list()).toEqual([
      { kind: 'build', build: first.build },
      { kind: 'build', build: second.build },
    ]);
  });

  test('a build changed by the updates round-trips through storage', () => {
    const store = createBuildStore(fakeStorage());
    const created = store.create();
    if (created.status !== 'created') throw new Error('not created');
    let build = appliedBuild(setBaseGeneration(created.build, 9));
    build = appliedBuild(setExtraFreebies(build, '30'));

    expect(store.save(build)).toEqual({ status: 'saved' });
    expect(store.load(build.id)).toEqual({ status: 'found', build });
  });

  test('an unknown id is not found', () => {
    expect(createBuildStore(fakeStorage()).load('missing')).toEqual({ status: 'not-found' });
  });

  test.each([
    ['unparseable text', '{not json'],
    ['a non-object', '42'],
    ['a missing settings field', JSON.stringify({ ...blankBuild('a'), settings: { baseGeneration: 13 } })],
    ['a mismatched id', record({ id: 'b' })],
    ['a character record', record({ kind: 'character' })],
    ['another system', record({ system: 'w20' })],
    ['a future schema version', record({ schemaVersion: 2 })],
    ['a generation above 13th', record({ settings: { baseGeneration: 14, extraFreebies: 0 } })],
    ['a generation below 4th', record({ settings: { baseGeneration: 3, extraFreebies: 0 } })],
    ['negative extra freebies', record({ settings: { baseGeneration: 13, extraFreebies: -1 } })],
    ['extra freebies above 999', record({ settings: { baseGeneration: 13, extraFreebies: 1000 } })],
    ['fractional extra freebies', record({ settings: { baseGeneration: 13, extraFreebies: 2.5 } })],
    ['textual extra freebies', record({ settings: { baseGeneration: 13, extraFreebies: '5' } })],
  ])('%s loads as unreadable and is not rewritten', (_label, text) => {
    const storage = fakeStorage({ [buildKeyFor('a')]: text });
    const store = createBuildStore(storage);

    expect(store.load('a')).toEqual({ status: 'unreadable', id: 'a' });
    expect(store.list()).toEqual([{ kind: 'unreadable', id: 'a' }]);
    expect(storage.items.get(buildKeyFor('a'))).toBe(text);
  });

  test('a refused write fails create and save', () => {
    const store = createBuildStore(refusingStorage());

    expect(store.create()).toEqual({ status: 'failed' });
    expect(store.save(blankBuild('a'))).toEqual({ status: 'failed' });
  });

  test('delete removes one build and reports a refused removal', () => {
    const storage = fakeStorage();
    const store = createBuildStore(storage, sequentialIds('a', 'b'));
    store.create();
    store.create();

    expect(store.delete('a')).toEqual({ status: 'deleted' });
    expect(store.list()).toEqual([{ kind: 'build', build: blankBuild('b') }]);
    expect(store.delete('missing')).toEqual({ status: 'deleted' });

    const refusing = createBuildStore(refusingStorage({ [buildKeyFor('a')]: record({}) }));
    expect(refusing.delete('a')).toEqual({ status: 'failed' });
  });

  test('builds and characters in one storage are each listed only by their own store', () => {
    const storage = fakeStorage();
    const builds = createBuildStore(storage, sequentialIds('b1'));
    const characters = createCharacterStore(storage, sequentialIds('c1'));
    builds.create();
    characters.create();

    expect(builds.list()).toEqual([{ kind: 'build', build: blankBuild('b1') }]);
    expect(characters.list().map((entry) => entry.kind)).toEqual(['character']);
    expect([...storage.items.keys()].sort()).toEqual([buildKeyFor('b1'), keyFor('c1')].sort());
  });
});
