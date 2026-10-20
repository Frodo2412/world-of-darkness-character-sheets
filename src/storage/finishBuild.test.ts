import { describe, expect, test } from 'vitest';
import { blankCharacter } from '../domain/v20/character';
import { completeBuild } from '../domain/v20/creation/testing/play';
import { toCharacter } from '../domain/v20/creation/toCharacter';
import { buildKeyFor, createBuildStore } from './buildStore';
import { createCharacterStore, keyFor } from './characterStore';
import { finishBuild } from './finishBuild';
import type { StoragePort } from './storagePort';

function fakeStorage(refuse: { set?: (key: string) => boolean; remove?: boolean } = {}) {
  const items = new Map<string, string>();
  const storage: StoragePort = {
    get length() {
      return items.size;
    },
    key: (index) => [...items.keys()][index] ?? null,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      if (refuse.set?.(key)) throw new Error('QuotaExceededError');
      items.set(key, value);
    },
    removeItem: (key) => {
      if (refuse.remove) throw new Error('SecurityError');
      items.delete(key);
    },
  };
  return { storage, items };
}

function arrange(refuse: Parameters<typeof fakeStorage>[0] = {}) {
  const { storage, items } = fakeStorage();
  const build = completeBuild('Brujah');
  createBuildStore(storage).save(build);
  const refusing = fakeStorage(refuse);
  for (const [key, value] of items) refusing.items.set(key, value);
  return { build, items: refusing.items, builds: createBuildStore(refusing.storage), characters: createCharacterStore(refusing.storage) };
}

describe('finishBuild', () => {
  test('saves the character under the build id, then removes the build', () => {
    const { build, items, builds, characters } = arrange();
    expect(finishBuild(builds, characters, build)).toBe('finished');
    expect(characters.load(build.id)).toEqual({ status: 'found', character: toCharacter(build) });
    expect(items.has(buildKeyFor(build.id))).toBe(false);
  });

  test('saves nothing and removes nothing while something is outstanding', () => {
    const { build, items, builds, characters } = arrange();
    const unrecorded = { ...build, bloodPool: null };

    expect(finishBuild(builds, characters, unrecorded)).toBe('not-finishable');
    expect(items.has(buildKeyFor(build.id))).toBe(true);
    expect(characters.load(build.id)).toEqual({ status: 'not-found' });
  });

  test('keeps the build when the character cannot be saved', () => {
    const { build, items, builds, characters } = arrange({ set: (key) => key === keyFor('abc') });
    expect(finishBuild(builds, characters, build)).toBe('save-failed');
    expect(items.has(buildKeyFor(build.id))).toBe(true);
    expect(characters.load(build.id)).toEqual({ status: 'not-found' });
  });

  test('keeps the character when the build cannot be removed', () => {
    const { build, builds, characters } = arrange({ remove: true });
    expect(finishBuild(builds, characters, build)).toBe('finished-build-kept');
    expect(characters.load(build.id).status).toBe('found');
  });

  test('never overwrites a character already under the id, and removes the lingering build', () => {
    const { build, items, builds, characters } = arrange();
    const renamed = { ...blankCharacter(build.id), header: { ...blankCharacter(build.id).header, name: 'Lucita the Elder' } };
    characters.save(renamed);
    expect(finishBuild(builds, characters, build)).toBe('already-finished');
    expect(characters.load(build.id)).toEqual({ status: 'found', character: renamed });
    expect(items.has(buildKeyFor(build.id))).toBe(false);
  });

  test('reports a build finished in another tab as finished, even though this tab still holds it unfinishable', () => {
    const { build, items, builds, characters } = arrange();
    const staleCopy = { ...build, bloodPool: null };
    characters.save(toCharacter(build));
    expect(finishBuild(builds, characters, staleCopy)).toBe('already-finished');
    expect(items.has(buildKeyFor(build.id))).toBe(false);
  });

  test('keeps the build and the unreadable record when the character under the id cannot be read', () => {
    const { build, items, builds, characters } = arrange();
    items.set(keyFor(build.id), '{not a character');
    expect(finishBuild(builds, characters, build)).toBe('character-unreadable');
    expect(items.has(buildKeyFor(build.id))).toBe(true);
    expect(items.get(keyFor(build.id))).toBe('{not a character');
  });

  test('keeps the build, and says so, when it is already finished elsewhere but cannot be removed', () => {
    const { build, items, builds, characters } = arrange({ remove: true });
    characters.save(toCharacter(build));
    expect(finishBuild(builds, characters, build)).toBe('already-finished-build-kept');
    expect(items.has(buildKeyFor(build.id))).toBe(true);
    expect(characters.load(build.id).status).toBe('found');
  });

  test('reports a build deleted in another tab as missing, even though this tab still holds it unfinishable', () => {
    const { build, builds, characters } = arrange();
    builds.delete(build.id);
    expect(finishBuild(builds, characters, { ...build, bloodPool: null })).toBe('build-missing');
  });

  test('does nothing for a build no longer stored', () => {
    const { build, builds, characters } = arrange();
    builds.delete(build.id);
    expect(finishBuild(builds, characters, build)).toBe('build-missing');
    expect(characters.load(build.id)).toEqual({ status: 'not-found' });
  });
});
