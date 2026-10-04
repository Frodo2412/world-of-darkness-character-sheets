// Every change to a build. Each returns an UpdateResult and never mutates its
// input: a refusal hands back the same build, an applied change a new one.

import type { BuildSettings, V20Build } from './build';
import { commit, refuse, type UpdateResult } from './result';
import { EXTRA_FREEBIES_RANGE, GENERATION_TABLE } from './rules';

const FIRST_GENERATION = GENERATION_TABLE[0].generation;
const LAST_GENERATION = GENERATION_TABLE[GENERATION_TABLE.length - 1].generation;

const EXTRA_FREEBIES_REFUSAL = `Extra freebie points must be a whole number from ${EXTRA_FREEBIES_RANGE.min} to ${EXTRA_FREEBIES_RANGE.max}.`;

function withSettings(build: V20Build, change: Partial<BuildSettings>): V20Build {
  return { ...build, settings: { ...build.settings, ...change } };
}

export function setBaseGeneration(build: V20Build, generation: number): UpdateResult {
  if (!GENERATION_TABLE.some((row) => row.generation === generation)) {
    return refuse(
      build,
      `Base generation must be a whole number from ${FIRST_GENERATION}th to ${LAST_GENERATION}th.`,
    );
  }
  return commit(build, withSettings(build, { baseGeneration: generation }), []);
}

/** Takes the player's text: surrounding spaces are ignored, anything but a whole number in range is refused. */
export function setExtraFreebies(build: V20Build, text: string): UpdateResult {
  const entry = text.trim();
  const value = /^\d+$/.test(entry) ? Number(entry) : Number.NaN;
  if (!(value >= EXTRA_FREEBIES_RANGE.min && value <= EXTRA_FREEBIES_RANGE.max)) {
    return refuse(build, EXTRA_FREEBIES_REFUSAL);
  }
  return commit(build, withSettings(build, { extraFreebies: value }), []);
}
