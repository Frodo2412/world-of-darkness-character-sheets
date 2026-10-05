import { blankBuild, type DisciplineEntry, type V20Build } from '../domain/v20/creation/build';
import { CLAN_NAMES, EXTRA_FREEBIES_RANGE, GENERATION_TABLE, RANKS } from '../domain/v20/creation/rules';
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

function isV20Build(value: unknown, id: string): value is V20Build {
  if (typeof value !== 'object' || value === null) return false;
  const { disciplines, ...fixed } = value as V20Build;
  const { disciplines: _template, ...template } = blankBuild(id);
  if (!hasShapeOf(fixed, template) || !isDisciplineList(disciplines)) return false;
  const build = value as V20Build;
  return (
    build.id === id &&
    build.system === 'v20' &&
    build.kind === 'build' &&
    build.schemaVersion === 1 &&
    GENERATION_TABLE.some((row) => row.generation === build.settings.baseGeneration) &&
    isWholeInRange(build.settings.extraFreebies, EXTRA_FREEBIES_RANGE.min, EXTRA_FREEBIES_RANGE.max) &&
    (build.clan === '' || (CLAN_NAMES as readonly string[]).includes(build.clan)) &&
    Object.values(build.ranks).every((rank) => rank === '' || (RANKS as readonly string[]).includes(rank)) &&
    Object.values(build.traits).every((dots) => isDotCount(dots.creation) && isDotCount(dots.freebie)) &&
    isDotCount(build.bloodPool)
  );
}

/** The only way stored text becomes a build. */
function parseRecord(text: string, id: string): V20Build | undefined {
  try {
    const value: unknown = JSON.parse(text);
    return isV20Build(value, id) ? value : undefined;
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
