// The dice pools of the Combat tab's tables: what a character rolls to use a manoeuvre or a weapon,
// less the wound. Computed on every draw, never stored.

import type { V20Character } from '../character';
import { poolFormula } from '../poolText';
import { dicePool, type PoolSelection } from '../resources';
import type { Manoeuvre } from './data/manoeuvres';
import type { Weapon } from './data/types';

/** The reason every pool reads 0 dice while the health track is full. Shared by every tab that shows a pool. */
export const INCAPACITATED_REASON = 'Incapacitated: every pool is 0 dice.';

export interface CombatPool {
  /** The dice the character rolls: floored at 0, and 0 while Incapacitated. */
  dice: number;
  /** The attribute and ability less the wound before any floor: what a modifier is added to. */
  raw: number;
  /** The words of the pool with full labels: "Dexterity 3 + Brawl 1 − wound 1". */
  formula: string;
  incapacitated: boolean;
  /** Why the pool reads 0 dice, when the character is Incapacitated. */
  reason?: string;
}

function readPool(character: V20Character, selection: PoolSelection): CombatPool {
  const pool = dicePool(character, selection);
  const read: CombatPool = { dice: pool.total ?? 0, raw: pool.raw ?? 0, formula: poolFormula(pool), incapacitated: pool.incapacitated };
  if (pool.incapacitated) read.reason = INCAPACITATED_REASON;
  return read;
}

/** The pool of a manoeuvre: its attribute and ability (the first one named when the entry allows either). */
export function manoeuvrePool(character: V20Character, manoeuvre: Manoeuvre): CombatPool {
  return readPool(character, { attribute: `attributes.${manoeuvre.attribute}`, ability: `abilities.${manoeuvre.ability}` });
}

/** The pool of a weapon: Dexterity + Melee for a melee weapon, Dexterity + Firearms for a ranged one. */
export function weaponPool(character: V20Character, weapon: Weapon): CombatPool {
  return readPool(character, {
    attribute: 'attributes.dexterity',
    ability: weapon.kind === 'melee' ? 'abilities.melee' : 'abilities.firearms',
  });
}
