import { blankBuild, type DisciplineEntry, type V20Build } from '../domain/v20/creation/build';
import { isClanName, isConceptKind } from '../domain/v20/creation/ratings';
import { EXTRA_FREEBIES_RANGE, GENERATION_TABLE, RANKS } from '../domain/v20/creation/rules';
import { generateId, hasShapeOf, storedIds, type StoragePort } from './storagePort';

/** A stored record that is not a build this version can read. It is never rewritten. */
export type BuildEntry = { kind: 'build'; build: V20Build } | { kind: 'unreadable'; id: string };
export type BuildLoadResult =
  | { status: 'found'; build: V20Build }
  | { status: 'not-found' }
  | { status: 'unreadable'; id: string };
/** `failed` means the browser refused the write: storage is full, disabled or blocked. */
export type BuildCreateResult = { status: 'created'; build: V20Build } | { status: 'failed' };
export type BuildSaveResult = { status: 'saved' } | { status: 'failed' };
/** Unlike a character delete, a build delete reports a refused removal. */
export type BuildDeleteResult = { status: 'deleted' } | { status: 'failed' };

export interface BuildStore {
  create(): BuildCreateResult;
  save(build: V20Build): BuildSaveResult;
  load(id: string): BuildLoadResult;
  /** Removes one build; an id that is not stored is left as it is. */
  delete(id: string): BuildDeleteResult;
  /** Every stored build record, oldest first, readable or not. */
  list(): BuildEntry[];
}

const KEY_PREFIX = 'wod-sheets:build:';

/** The storage key holding the build record for `id`. */
export const buildKeyFor = (id: string): string => KEY_PREFIX + id;

const isWholeInRange = (value: number, min: number, max: number): boolean =>
  Number.isInteger(value) && value >= min && value <= max;

const isDotCount = (value: number): boolean => Number.isInteger(value) && value >= 0;

/** The Discipline list has no fixed length, so each entry is checked by hand. */
function isDisciplineList(value: unknown): value is DisciplineEntry[] {
  if (!Array.isArray(value)) return false;
  const template: DisciplineEntry = { name: '', writeIn: false, creation: 0, freebie: 0 };
  const names = new Set<string>();
  return value.every((entry) => {
    if (!hasShapeOf(entry, template)) return false;
    const { name, creation, freebie } = entry as DisciplineEntry;
    const key = name.trim().toLowerCase();
    if (key === '' || names.has(key)) return false;
    names.add(key);
    return isDotCount(creation) && isDotCount(freebie);
  });
}

type Fields = Record<string, unknown>;

const isFields = (value: unknown): value is Fields =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isLegacyRecord = (raw: unknown): raw is Fields & { concept: Fields } =>
  isFields(raw) && isFields(raw.concept) && !('conceptKind' in raw.concept);

function upgradedLegacyRecord(raw: Fields & { concept: Fields }): Fields {
  return {
    ...raw,
    bloodPool: raw.bloodPool === 0 ? null : raw.bloodPool,
    // Only what the old shape lacked is defaulted: a `drive` it somehow has is kept.
    concept: { conceptKind: '', drive: '', ...raw.concept },
  };
}

function isV20Build(value: unknown, id: string): value is V20Build {
  if (typeof value !== 'object' || value === null) return false;
  // Neither has a fixed shape: the list is checked entry by entry, the Blood Pool is null or a count.
  const { disciplines, bloodPool: _pool, ...fixed } = value as V20Build;
  const { disciplines: _disciplines, bloodPool: _blank, ...template } = blankBuild(id);
  if (!hasShapeOf(fixed, template) || !isDisciplineList(disciplines)) return false;
  const build = value as V20Build;
  return (
    (build.concept.conceptKind === '' || isConceptKind(build.concept.conceptKind)) &&
    build.id === id &&
    build.system === 'v20' &&
    build.kind === 'build' &&
    build.schemaVersion === 1 &&
    GENERATION_TABLE.some((row) => row.generation === build.settings.baseGeneration) &&
    isWholeInRange(build.settings.extraFreebies, EXTRA_FREEBIES_RANGE.min, EXTRA_FREEBIES_RANGE.max) &&
    (build.clan === '' || isClanName(build.clan)) &&
    Object.values(build.ranks).every((rank) => rank === '' || (RANKS as readonly string[]).includes(rank)) &&
    Object.values(build.traits).every((dots) => isDotCount(dots.creation) && isDotCount(dots.freebie)) &&
    (build.bloodPool === null || isDotCount(build.bloodPool))
  );
}

/**
 * Reads a stored value as a build, or undefined if it is not one. A record
 * written before the Blood Pool was recorded explicitly (it has no
 * `concept.conceptKind`) is brought to the current shape first: its Blood Pool
 * of 0, which was only ever the default, reads as not recorded and the new
 * concept fields start empty. A record that has `conceptKind` is read as it is,
 * so a recorded 0 stays 0.
 */
function readStoredBuild(raw: unknown, id: string): V20Build | undefined {
  // A legacy Blood Pool was always a number, so anything else is damage and the record stays unreadable.
  const value = isLegacyRecord(raw) && typeof raw.bloodPool === 'number' ? upgradedLegacyRecord(raw) : raw;
  return isV20Build(value, id) ? value : undefined;
}

/** The only way stored text becomes a build. */
function parseRecord(text: string, id: string): V20Build | undefined {
  try {
    return readStoredBuild(JSON.parse(text), id);
  } catch {
    return undefined;
  }
}

export function createBuildStore(
  storage: StoragePort,
  newId: (latestId?: string) => string = generateId,
): BuildStore {
  function save(build: V20Build): BuildSaveResult {
    try {
      storage.setItem(buildKeyFor(build.id), JSON.stringify(build));
      return { status: 'saved' };
    } catch {
      return { status: 'failed' };
    }
  }

  function load(id: string): BuildLoadResult {
    const text = storage.getItem(buildKeyFor(id));
    if (text === null) return { status: 'not-found' };
    const build = parseRecord(text, id);
    return build ? { status: 'found', build } : { status: 'unreadable', id };
  }

  return {
    create() {
      const build = blankBuild(newId(storedIds(storage, KEY_PREFIX).at(-1)));
      return save(build).status === 'saved' ? { status: 'created', build } : { status: 'failed' };
    },
    save,
    load,
    delete(id) {
      try {
        storage.removeItem(buildKeyFor(id));
        return { status: 'deleted' };
      } catch {
        return { status: 'failed' };
      }
    },
    list() {
      return storedIds(storage, KEY_PREFIX).flatMap((id): BuildEntry[] => {
        const result = load(id);
        if (result.status === 'found') return [{ kind: 'build', build: result.build }];
        return result.status === 'unreadable' ? [{ kind: 'unreadable', id }] : [];
      });
    },
  };
}
