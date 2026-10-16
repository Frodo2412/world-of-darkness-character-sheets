// The attack pool of the Weapon roll panel: the manoeuvre's pool with the player's dice modifier, and
// the difficulty the attack is made against. Computed on every draw, never stored.

import type { V20Character } from '../character';
import { MINUS_SIGN } from '../text';
import type { Manoeuvre } from './data/manoeuvres';
import type { CalledShot, RangeBand } from './data/modifiers';
import { manoeuvrePool, type CombatPool } from './pools';

/** Most attacks are made against difficulty 6 (V20 p. 272); a chosen Range replaces it for a ranged manoeuvre. */
export const BASE_DIFFICULTY = 6;

export interface AttackInput {
  character: V20Character;
  manoeuvre: Manoeuvre;
  /** Dice the player adds to the pool (negative takes dice off). */
  diceModifier: number;
  /** Added to the difficulty (negative lowers it). */
  difficultyModifier: number;
  /** The called shot, from the Targeting table. */
  target?: CalledShot;
  /** How far the target is. */
  range?: RangeBand;
}

export interface AttackPool extends CombatPool {
  /** Dice added to the roll to hit, shown beside the pool and not part of it. */
  accuracy: Manoeuvre['accuracy'];
  /** The base difficulty (the Range's when one is chosen for a ranged manoeuvre), then the manoeuvre's, the Target's and the player's modifier. */
  difficulty: number;
}

/** " + dice modifier 2" or " − dice modifier 5": what the player's dice modifier does to the pool's words; nothing for 0. */
function modifierWords(diceModifier: number): string {
  if (diceModifier === 0) return '';
  return ` ${diceModifier > 0 ? '+' : MINUS_SIGN} dice modifier ${Math.abs(diceModifier)}`;
}

/**
 * The attack: the manoeuvre's pool (less the wound) plus the dice modifier, floored once at 0 over the whole sum,
 * and 0 while Incapacitated whatever the modifier. Accuracy is the manoeuvre's own.
 */
export function attackPool({ character, manoeuvre, diceModifier, difficultyModifier, target, range }: AttackInput): AttackPool {
  const pool = manoeuvrePool(character, manoeuvre);
  const base = manoeuvre.section === 'ranged' ? (range?.difficulty ?? BASE_DIFFICULTY) : BASE_DIFFICULTY;
  const difficulty = base + manoeuvre.difficulty + (target?.difficulty ?? 0) + difficultyModifier;
  return {
    ...pool,
    dice: pool.incapacitated ? 0 : Math.max(0, pool.raw + diceModifier),
    formula: pool.incapacitated ? pool.formula : pool.formula + modifierWords(diceModifier),
    accuracy: manoeuvre.accuracy,
    difficulty,
  };
}
