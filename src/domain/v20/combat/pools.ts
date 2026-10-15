// The dice pools of the Combat tab: what an attack rolls for the character, wound included. Computed on
// every draw, never stored. The attribute, ability and wound arithmetic is `dicePool`'s; this adds the
// manoeuvre's accuracy dice.

import type { V20Character } from '../character';
import { MINUS_SIGN } from '../text';
import { dicePool, type DicePool } from '../resources';
import type { AbilityKey, AttributeKey } from '../traits';
import type { Manoeuvre } from './data/manoeuvres';

export interface CombatPool {
  /** The dice to roll, never below 0, and 0 when the character is incapacitated. */
  dice: number;
  /** "Dexterity 3 + Brawl 1 + accuracy 1 − wound 1". */
  formula: string;
  incapacitated: boolean;
}

/** The pool of an attribute and an ability, with `accuracy` dice added before the wound comes off. */
export function traitsPool(character: V20Character, attribute: AttributeKey, ability: AbilityKey, accuracy = 0): CombatPool {
  const pool: DicePool = dicePool(character, { attribute: `attributes.${attribute}`, ability: `abilities.${ability}` });
  const base = (pool.attribute?.rating ?? 0) + (pool.ability?.rating ?? 0);
  const penalty = pool.woundPenalty ?? 0;
  const terms = [pool.attribute, pool.ability].filter((term) => term !== undefined).map((term) => `${term.label} ${term.rating}`);
  const parts = [terms.join(' + ')];
  if (accuracy > 0) parts.push(`+ accuracy ${accuracy}`);
  if (penalty > 0) parts.push(`${MINUS_SIGN} wound ${penalty}`);
  return {
    dice: pool.incapacitated ? 0 : Math.max(0, base + accuracy - penalty),
    formula: parts.join(' '),
    incapacitated: pool.incapacitated,
  };
}

/** The accuracy dice a manoeuvre adds: a number, or nothing for one the book calls "Special". */
export const accuracyDice = (manoeuvre: Manoeuvre): number => (manoeuvre.accuracy === 'special' ? 0 : manoeuvre.accuracy);

/**
 * The pool of a manoeuvre. Where the book allows either of two abilities (Sweep: Brawl or Melee) the one
 * that gives the larger pool is used. A rating of 0 in the ability still rolls the attribute alone.
 */
export function manoeuvrePool(character: V20Character, manoeuvre: Manoeuvre): CombatPool {
  const accuracy = accuracyDice(manoeuvre);
  const first = traitsPool(character, manoeuvre.attribute, manoeuvre.ability, accuracy);
  if (manoeuvre.alternateAbility === undefined) return first;
  const other = traitsPool(character, manoeuvre.attribute, manoeuvre.alternateAbility, accuracy);
  return other.dice > first.dice ? other : first;
}

/** The pool for attacking with a weapon of the chart: Dexterity + Melee, or Dexterity + Firearms. */
export function weaponPool(character: V20Character, kind: 'melee' | 'ranged'): CombatPool {
  return traitsPool(character, 'dexterity', kind === 'melee' ? 'melee' : 'firearms');
}
