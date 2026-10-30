// What a build may not exceed: the generation's ceilings, the fixed ceilings
// and the freebie budget. `violations` is the one list of hard rule breaks.

import { ordinal } from '../identity';
import type { BuildTraitRef, V20Build } from './build';
import { allTraitRefs, backgroundRef } from './build';
import { freebieBudget, freebiesSpent } from './freebies';
import {
  creationRating,
  creationStepOf,
  dotsOf,
  fixedRating,
  isVirtueDerived,
  kindOf,
  rating,
  traitLabel,
} from './ratings';
import {
  FIXED_MAXIMUMS,
  GENERATION_BACKGROUND,
  GENERATION_TABLE,
  type BuildStep,
  type GenerationRow,
} from './rules';

export { freebieBudget } from './freebies';

/** The best generation there is: Generation dots cannot push the effective generation past it. */
export const MOST_POTENT = GENERATION_TABLE[0].generation;
const LEAST_POTENT = GENERATION_TABLE[GENERATION_TABLE.length - 1].generation;

export const GENERATION_REF: BuildTraitRef = backgroundRef(GENERATION_BACKGROUND);

export { ordinal };

/** What a Generation dot past the top is refused with. */
export const PAST_BEST_GENERATION = `The effective generation cannot be better than ${ordinal(MOST_POTENT)}.`;

/** The most Generation dots the base generation can use before the effective generation passes the best there is. */
export const generationBackgroundTop = (build: V20Build): number =>
  Math.max(0, build.settings.baseGeneration - MOST_POTENT);

/** The base generation improved by one per Generation dot. A stored build past 4th reads as 4th. */
export function effectiveGeneration(build: V20Build): number {
  const base = build.settings.baseGeneration;
  if (!GENERATION_TABLE.some((row) => row.generation === base)) {
    throw new Error(`No generation ${base} in the table`);
  }
  const improved = build.settings.baseGeneration - rating(build, GENERATION_REF);
  return Math.min(LEAST_POTENT, Math.max(MOST_POTENT, improved));
}

/** The generation row for the build's effective generation. */
export function limits(build: V20Build): GenerationRow {
  const generation = effectiveGeneration(build);
  return GENERATION_TABLE.find((row) => row.generation === generation)!;
}

/** The highest rating `ref` may have in this build. The page draws a control to it. */
export function maximumFor(build: V20Build, ref: BuildTraitRef): number {
  const fixed = fixedRating(build, ref);
  if (fixed !== undefined) return fixed;
  if (ref === GENERATION_REF) return FIXED_MAXIMUMS.generationBackground;
  switch (kindOf(ref)) {
    case 'virtue':
      return FIXED_MAXIMUMS.virtue;
    case 'humanity':
      return FIXED_MAXIMUMS.humanity;
    case 'willpower':
      return FIXED_MAXIMUMS.willpower;
    default:
      return limits(build).maxTrait;
  }
}

/**
 * The highest rating creation dots alone can give `ref`: `maximumFor`, except that an Ability
 * stops at 3 before freebie points (dots already bought sit on top of that).
 */
export function creationMaximum(build: V20Build, ref: BuildTraitRef): number {
  const max = maximumFor(build, ref);
  if (kindOf(ref) !== 'ability') return max;
  return Math.min(max, FIXED_MAXIMUMS.abilityCreation + dotsOf(build, ref).freebie);
}

/** What a refused Blood Pool entry says: the range the generation allows. */
export function bloodPoolRangeMessage(build: V20Build): string {
  return `The Blood Pool must be a whole number from 0 to ${limits(build).bloodPoolMax}.`;
}

/**
 * A hard rule break, as a sentence naming what to lower and the step to do it on. `key` names the rule
 * broken and `amount` how far past it the build is, so a repair that only shrinks the excess can be told
 * from a new break even when the sentence carries the excess ("at least 5 points").
 */
export interface Violation {
  key: string;
  amount: number;
  message: string;
  step: BuildStep;
}

const dotWord = (count: number): string => (count === 1 ? 'a freebie dot' : `${count} freebie dots`);

function traitViolation(build: V20Build, ref: BuildTraitRef): Violation | undefined {
  const max = maximumFor(build, ref);
  const value = rating(build, ref);
  if (value <= max) return undefined;
  const label = traitLabel(ref);
  // Humanity and Willpower follow the Virtues; only their freebie dots can be lowered.
  if (isVirtueDerived(ref)) {
    return { key: `trait:${ref}`, amount: value - max, message: `Remove ${dotWord(value - max)} of ${label} first.`, step: 'finishing' };
  }
  // A bought dot is removed on Finishing touches; creation dots where they were placed.
  const step = creationRating(build, ref) > max ? creationStepOf(ref) : 'finishing';
  return { key: `trait:${ref}`, amount: value - max, message: `Lower ${label} to ${max} first.`, step };
}

/** Every hard violation the build has. None blocks an update the build already had. */
export function violations(build: V20Build): Violation[] {
  const found: Violation[] = [];

  const generationDots = rating(build, GENERATION_REF);
  const generationTop = generationBackgroundTop(build);
  const pastBest = generationDots > generationTop;
  if (pastBest) {
    found.push({
      key: 'generation',
      amount: generationDots - generationTop,
      message: `Lower the Generation background to ${generationTop} first.`,
      step: 'advantages',
    });
  }

  for (const ref of allTraitRefs(build)) {
    if (ref === GENERATION_REF && pastBest) continue;
    const violation = traitViolation(build, ref);
    if (violation) found.push(violation);
  }

  const { bloodPoolMax } = limits(build);
  if (build.bloodPool !== null && build.bloodPool > bloodPoolMax) {
    found.push({
      key: 'bloodPool',
      amount: build.bloodPool - bloodPoolMax,
      message: `Lower the starting Blood Pool to ${bloodPoolMax} first.`,
      step: 'finishing',
    });
  }

  const spent = freebiesSpent(build);
  const budget = freebieBudget(build);
  if (spent > budget) {
    found.push({
      key: 'freebies',
      amount: spent - budget,
      message: `${spent} freebie points are spent, so at least ${spent - budget} points of purchases must be removed first.`,
      step: 'finishing',
    });
  }
  return found;
}

