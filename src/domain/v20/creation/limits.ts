// What a build may not exceed: the generation's ceilings, the fixed ceilings
// and the freebie budget. `violations` is the one list of hard rule breaks.

import type { BuildTraitRef, V20Build } from './build';
import { FIXED_TRAIT_REFS } from './build';
import { freebieBudget, freebiesSpent } from './freebies';
import {
  creationRating,
  creationStepOf,
  fixedRating,
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

const MOST_POTENT = GENERATION_TABLE[0].generation;
const LEAST_POTENT = GENERATION_TABLE[GENERATION_TABLE.length - 1].generation;

export const GENERATION_REF: BuildTraitRef = `background:${GENERATION_BACKGROUND}`;

/** "4th", "9th", "13th": every generation the builder offers ends in "th". */
export const ordinal = (generation: number): string => `${generation}th`;

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

/** A hard rule break, as a sentence naming what to lower and the step to do it on. */
export interface Violation {
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
  if (ref === 'humanity' || ref === 'willpower') {
    return { message: `Remove ${dotWord(value - max)} of ${label} first.`, step: 'finishing' };
  }
  // A bought dot is removed on Finishing touches; creation dots where they were placed.
  const step = creationRating(build, ref) > max ? creationStepOf(ref) : 'finishing';
  return { message: `Lower ${label} to ${max} first.`, step };
}

/** Every hard violation the build has. None blocks an update the build already had. */
export function violations(build: V20Build): Violation[] {
  const found: Violation[] = [];

  const generationDots = rating(build, GENERATION_REF);
  const improved = build.settings.baseGeneration - generationDots;
  if (improved < MOST_POTENT) {
    found.push({
      message: `Lower the Generation background to ${build.settings.baseGeneration - MOST_POTENT} first.`,
      step: 'advantages',
    });
  }

  const traits: BuildTraitRef[] = [
    ...FIXED_TRAIT_REFS,
    ...build.disciplines.map((entry): BuildTraitRef => `discipline:${entry.name}`),
  ];
  for (const ref of traits) {
    if (ref === GENERATION_REF && improved < MOST_POTENT) continue;
    const violation = traitViolation(build, ref);
    if (violation) found.push(violation);
  }

  const { bloodPoolMax } = limits(build);
  if (build.bloodPool > bloodPoolMax) {
    found.push({ message: `Lower the starting blood pool to ${bloodPoolMax} first.`, step: 'finishing' });
  }

  const spent = freebiesSpent(build);
  const budget = freebieBudget(build);
  if (spent > budget) {
    found.push({
      message: `${spent} freebie points are spent, so at least ${spent - budget} points of purchases must be removed first.`,
      step: 'finishing',
    });
  }
  return found;
}

