// The damage pool of the Weapon roll panel: the weapon's (or the manoeuvre's) damage dice, the extra
// successes the player scored and the called shot's bonus. The wound takes nothing off damage.

import type { V20Character } from '../character';
import { woundState } from '../resources';
import type { CalledShot } from './data/modifiers';
import type { Damage } from './data/types';

/** What the player is told when the extra successes are put right. */
export const EXTRA_SUCCESSES_MESSAGE = 'Extra successes kept at 0 or more.';

/** Extra successes are a whole number of 0 or more: anything else becomes the nearest that is, and says so. */
export function clampExtraSuccesses(value: number): { extra: number; corrected: boolean } {
  const extra = Number.isNaN(value) ? 0 : Math.max(0, Math.trunc(value));
  return { extra, corrected: extra !== value };
}

export interface DamagePool {
  /** The dice to roll, never below 0, and 0 when the character is incapacitated. */
  dice: number;
  /** "Strength 3 + weapon 1 + extra successes 2". */
  formula: string;
  incapacitated: boolean;
}

/**
 * The damage pool for `damage` (a weapon's or a manoeuvre's): Strength-based damage uses the character's
 * Strength, flat damage is the pool as the chart prints it.
 */
export function damagePool(character: V20Character, damage: Damage, extraSuccesses: number, target?: CalledShot): DamagePool {
  const incapacitated = woundState(character) === 'incapacitated';
  const strength = character.attributes.strength;
  const parts: string[] = [];
  let base: number;
  if (damage.strength !== undefined) {
    base = strength + damage.strength;
    parts.push(`Strength ${strength}`);
    if (damage.strength > 0) parts.push(`+ weapon ${damage.strength}`);
  } else {
    base = damage.flat ?? 0;
    parts.push(`Weapon ${base}`);
  }
  const extra = Math.max(0, Math.trunc(extraSuccesses));
  parts.push(`+ extra successes ${extra}`);
  if (target !== undefined && target.damage > 0) parts.push(`+ target ${target.damage}`);
  return {
    dice: incapacitated ? 0 : Math.max(0, base + extra + (target?.damage ?? 0)),
    formula: parts.join(' '),
    incapacitated,
  };
}
