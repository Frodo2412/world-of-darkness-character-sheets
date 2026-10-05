// The rules behind the live resources on the play view: what the Blood Pool
// can hold and how wounded the character is. Computed on every draw, never stored.

import type { V20Character } from './character';
import { GENERATION_TABLE } from './generations';
import { generationNumber } from './identity';
import { BLOOD_POOL_RANGE, HEALTH_LEVELS, type HealthLevelKey } from './traits';

const LEAST_POTENT = GENERATION_TABLE[GENERATION_TABLE.length - 1];
/** The table stops at the 13th, but V20 gives every generation up to the 15th the same pool. */
const LAST_RECOGNISED_GENERATION = 15;

export interface BloodPoolMaximum {
  maximum: number;
  /** True when the Generation text gave no recognised generation and the sheet's own maximum stands in. */
  assumed: boolean;
}

/** The most blood the character can hold, read from the Generation text. */
export function bloodPoolMaximum(character: V20Character): BloodPoolMaximum {
  const generation = generationNumber(character.header.generation);
  const row = GENERATION_TABLE.find((candidate) => candidate.generation === generation);
  if (row) return { maximum: row.bloodPoolMax, assumed: false };
  if (generation !== undefined && generation > LEAST_POTENT.generation && generation <= LAST_RECOGNISED_GENERATION) {
    return { maximum: LEAST_POTENT.bloodPoolMax, assumed: false };
  }
  return { maximum: BLOOD_POOL_RANGE.max, assumed: true };
}

export interface Wound {
  level: HealthLevelKey;
  label: string;
  /** Dice taken off every pool. */
  penalty: number;
}

/**
 * The wound the health track shows: the most severe level holding any damage,
 * whatever the damage type and wherever the gaps are. Incapacitated is its own
 * state, not a number; none when the track is empty or only Bruised is marked.
 */
export function woundState(character: V20Character): Wound | 'incapacitated' | undefined {
  const worst = [...HEALTH_LEVELS].reverse().find((level) => character.health[level.key] !== 'empty');
  if (worst === undefined) return undefined;
  if (!('dicePenalty' in worst)) return 'incapacitated';
  if (worst.dicePenalty === 0) return undefined;
  return { level: worst.key, label: worst.label, penalty: worst.dicePenalty };
}
