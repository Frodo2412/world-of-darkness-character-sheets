// Pure reads of what a build has spent of its freebie points.

import type { BuildTraitRef, V20Build } from './build';
import { FIXED_TRAIT_REFS } from './build';
import { dotsOf, kindOf } from './ratings';
import { FREEBIE_COSTS, STANDARD_FREEBIE_BUDGET } from './rules';

export const freebieCost = (ref: BuildTraitRef): number => FREEBIE_COSTS[kindOf(ref)];

export function freebieBudget(build: V20Build): number {
  return STANDARD_FREEBIE_BUDGET + build.settings.extraFreebies;
}

/** Every freebie dot the build holds, at its kind's cost. */
export function freebiesSpent(build: V20Build): number {
  const fixed = FIXED_TRAIT_REFS.reduce(
    (sum, ref) => sum + dotsOf(build, ref).freebie * freebieCost(ref),
    0,
  );
  const disciplines = build.disciplines.reduce(
    (sum, entry) => sum + entry.freebie * FREEBIE_COSTS.discipline,
    0,
  );
  return fixed + disciplines;
}

export function freebiesRemaining(build: V20Build): number {
  return freebieBudget(build) - freebiesSpent(build);
}
