import { describe, expect, test } from 'vitest';
import { blankBuild, type V20Build } from '../domain/v20/creation/build';
import {
  setBaseGeneration,
  setClan,
  setBloodPool,
  setConceptKind,
  setConceptText,
  setDrive,
  setExtraFreebies,
} from '../domain/v20/creation/updates';
import { outstanding } from '../domain/v20/creation/progress';
import type { UpdateResult } from '../domain/v20/creation/result';
import {
  addCreationDiscipline,
  clan,
  completeBrujah,
  freebie,
  play,
} from '../domain/v20/creation/testing/play';
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

const withConcept = (fields: Record<string, unknown>) => ({ concept: { ...blankBuild('a').concept, ...fields } });

/** A record as it was stored before the Blood Pool was recorded explicitly: no conceptKind, no drive. */
function legacyRecord(fields: Record<string, unknown>): string {
  const { conceptKind: _kind, drive: _drive, ...concept } = blankBuild('a').concept;
  return JSON.stringify({ ...blankBuild('a'), concept, ...fields });
}

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

  test('a build with concept text and a clan round-trips through storage', () => {
    const store = createBuildStore(fakeStorage(), sequentialIds('a'));
    store.create();
    let build = appliedBuild(setConceptText(blankBuild('a'), 'name', 'Lucita'));
    build = appliedBuild(setClan(build, 'Lasombra'));

    expect(store.save(build)).toEqual({ status: 'saved' });
    expect(store.load('a')).toEqual({ status: 'found', build });
  });

  test('a build played through every kind of update round-trips through storage', () => {
    const store = createBuildStore(fakeStorage(), sequentialIds('a'));
    store.create();
    const build = play(
      { ...completeBrujah(), id: 'a' },
      clan('Caitiff'),
      addCreationDiscipline('Flight'),
      freebie('discipline:Flight', 1),
      freebie('humanity', 8),
    );
    const withPool = appliedBuild(setBloodPool(build, '7'));

    expect(store.save(withPool)).toEqual({ status: 'saved' });
    expect(store.load('a')).toEqual({ status: 'found', build: withPool });
  });

  test('a recorded Blood Pool, including 0, survives a round trip; an unrecorded one stays null', () => {
    const store = createBuildStore(fakeStorage(), sequentialIds('a'));
    store.create();
    const blank = blankBuild('a');
    for (const text of ['0', '7', '']) {
      const build = appliedBuild(setBloodPool(blank, text));
      expect(store.save(build)).toEqual({ status: 'saved' });
      expect(store.load('a')).toEqual({ status: 'found', build });
    }
    expect(store.load('a')).toMatchObject({ build: { bloodPool: null } });
  });

  test('a sample concept and a drive round-trip through storage', () => {
    const store = createBuildStore(fakeStorage(), sequentialIds('a'));
    store.create();
    const build = appliedBuild(setDrive(appliedBuild(setConceptKind(blankBuild('a'), 'Reporter')), 'Find the truth'));

    expect(store.save(build)).toEqual({ status: 'saved' });
    expect(store.load('a')).toEqual({ status: 'found', build });
  });

  test.each([
    ['0', 0, null],
    ['7', 7, 7],
  ])('a build saved before this change with a Blood Pool of %s reads as %j', (_label, stored, expected) => {
    const storage = fakeStorage({ [buildKeyFor('a')]: legacyRecord({ bloodPool: stored }) });
    const loaded = createBuildStore(storage).load('a');

    expect(loaded).toEqual({
      status: 'found',
      build: { ...blankBuild('a'), bloodPool: expected },
    });
    expect(storage.items.get(buildKeyFor('a'))).toBe(legacyRecord({ bloodPool: stored }));
  });

  test('a legacy record keeps its concept text and gains an empty sample concept and drive', () => {
    const concept = { ...blankBuild('a').concept, name: 'Lucita' };
    const { conceptKind: _kind, drive: _drive, ...legacyConcept } = concept;
    const storage = fakeStorage({ [buildKeyFor('a')]: legacyRecord({ concept: legacyConcept }) });

    expect(createBuildStore(storage).load('a')).toEqual({
      status: 'found',
      build: { ...blankBuild('a'), concept: { ...concept, conceptKind: '', drive: '' } },
    });
  });

  test('a new record with a recorded Blood Pool of 0 is not mistaken for a legacy one', () => {
    const storage = fakeStorage({ [buildKeyFor('a')]: record({ bloodPool: 0 }) });

    expect(createBuildStore(storage).load('a')).toMatchObject({ status: 'found', build: { bloodPool: 0 } });
  });

  test('a new record with a Blood Pool above its maximum opens, and the build lists it to lower', () => {
    const storage = fakeStorage({ [buildKeyFor('a')]: record({ bloodPool: 11 }) });
    const loaded = createBuildStore(storage).load('a');

    if (loaded.status !== 'found') throw new Error('not found');
    expect(loaded.build.bloodPool).toBe(11);
    expect(outstanding(loaded.build)).toContainEqual({
      step: 'finishing',
      message: 'Lower the starting blood pool to 10 first.',
    });
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
    ['an unknown clan', record({ clan: 'Baali' })],
    ['a missing clan', JSON.stringify({ ...blankBuild('a'), clan: undefined })],
    ['a missing concept field', JSON.stringify({ ...blankBuild('a'), concept: { name: 'Lucita' } })],
    ['an unknown rank', record({ ranks: { ...blankBuild('a').ranks, physical: 'first' } })],
    ['a fractional dot count', record({ traits: { ...blankBuild('a').traits, 'attribute:strength': { creation: 1.5, freebie: 0 } } })],
    ['a negative freebie count', record({ traits: { ...blankBuild('a').traits, 'humanity': { creation: 0, freebie: -1 } } })],
    ['a missing trait', record({ traits: { 'attribute:strength': { creation: 0, freebie: 0 } } })],
    ['a Discipline list that is not a list', record({ disciplines: {} })],
    ['a Discipline without a name', record({ disciplines: [{ name: ' ', writeIn: true, creation: 1, freebie: 0 }] })],
    ['a repeated Discipline', record({ disciplines: [{ name: 'Auspex', writeIn: false, creation: 1, freebie: 0 }, { name: 'auspex', writeIn: false, creation: 0, freebie: 1 }] })],
    ['a malformed Discipline entry', record({ disciplines: [{ name: 'Auspex', creation: 1 }] })],
    ['a negative blood pool', record({ bloodPool: -1 })],
    ['a fractional blood pool', record({ bloodPool: 2.5 })],
    ['a textual blood pool', record({ bloodPool: 'ten' })],
    ['a missing blood pool', JSON.stringify({ ...blankBuild('a'), bloodPool: undefined })],
    ['a negative blood pool in a record saved before this change', legacyRecord({ bloodPool: -1 })],
    ['a sample concept outside the fourteen', record(withConcept({ conceptKind: 'Vampire' }))],
    ['a sample concept that is not text', record(withConcept({ conceptKind: 5 }))],
    ['a drive that is not text', record(withConcept({ drive: 5 }))],
    ['a drive that is null', record(withConcept({ drive: null }))],
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
