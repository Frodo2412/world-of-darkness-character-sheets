// The damage pool of the Weapon roll panel: the weapon's damage dice, plus the extra successes of the
// attack roll, plus what the called shot adds. Computed on every draw, never stored.

import type { V20Character } from '../character';
import { woundState } from '../resources';
import type { CalledShot } from './data/modifiers';
import type { Weapon } from './data/types';
import { INCAPACITATED_REASON } from './pools';

/** Damage dice rolls are made against difficulty 6 (V20 p. 272). */
export const DAMAGE_DIFFICULTY = 6;

export interface DamagePool {
  /** The dice rolled: never below 0, and 0 while Incapacitated. */
  dice: number;
  /** The words of the pool: "Strength 3 + 1 + extra successes 2 + Target 1", or "4" for a fixed pool. */
  formula: string;
  /** What the weapon's damage is, when the chart gives it: bashing or lethal. A firearm's has none. */
  type?: 'bashing' | 'lethal';
  difficulty: number;
  /** The extra successes counted: the entry, or 0 when it was negative. */
  extraSuccesses: number;
  incapacitated: boolean;
  /** Why the pool reads 0 dice, when the character is Incapacitated. */
  reason?: string;
}

/** The weapon's own dice and the words that make them: Strength-based damage uses the character's Strength. */
function weaponDice(character: V20Character, weapon: Weapon): { dice: number; words: string } {
  const { strength, flat } = weapon.damage;
  if (flat !== undefined) return { dice: flat, words: String(flat) };
  const bonus = strength ?? 0;
  return { dice: character.attributes.strength + bonus, words: `Strength ${character.attributes.strength}${bonus === 0 ? '' : ` + ${bonus}`}` };
}

/**
 * The weapon's damage plus the extra successes plus the Target's damage bonus. A negative entry of extra
 * successes counts as 0: it never lowers the weapon's own damage.
 */
export function damagePool(character: V20Character, weapon: Weapon, extraSuccesses: number, target?: CalledShot): DamagePool {
  const base = weaponDice(character, weapon);
  const extra = Math.max(0, extraSuccesses);
  const targetBonus = target?.damage ?? 0;
  const incapacitated = woundState(character) === 'incapacitated';
  const words = [base.words, extra > 0 ? `extra successes ${extra}` : '', targetBonus > 0 ? `Target ${targetBonus}` : ''].filter((part) => part !== '');
  const pool: DamagePool = {
    dice: incapacitated ? 0 : Math.max(0, base.dice + extra + targetBonus),
    formula: words.join(' + '),
    difficulty: DAMAGE_DIFFICULTY,
    extraSuccesses: extra,
    incapacitated,
  };
  if (weapon.kind === 'melee') pool.type = weapon.type;
  if (incapacitated) pool.reason = INCAPACITATED_REASON;
  return pool;
}
