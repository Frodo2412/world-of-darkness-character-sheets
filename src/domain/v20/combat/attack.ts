// The attack pool of the Weapon roll panel: the manoeuvre's pool with the player's modifiers, and the
// difficulty the rulebook's range and called-shot tables give. Nothing is rolled and nothing is stored.

import type { V20Character } from '../character';
import { CALLED_SHOTS, RANGE_BANDS, type CalledShot, type RangeBand } from './data/modifiers';
import type { Manoeuvre } from './data/manoeuvres';
import type { Weapon } from './data/types';
import { manoeuvrePool, type CombatPool } from './pools';

/** The difficulty of an ordinary attack, before the manoeuvre, the target and the range change it. */
export const BASE_DIFFICULTY = 6;
export const LEAST_DIFFICULTY = 2;
export const MOST_DIFFICULTY = 10;

/** What the player sets for one attack; page state, never stored. */
export interface AttackModifiers {
  /** Dice added to or taken from the pool. */
  dice: number;
  /** Added to or taken from the difficulty. */
  difficulty: number;
  /** The part of the target aimed at, from the called-shot table. */
  target?: CalledShot['key'];
  /** How far the target is; only a ranged attack has one. */
  range?: RangeBand['key'];
}

export const NO_MODIFIERS: AttackModifiers = { dice: 0, difficulty: 0 };

export interface AttackPool extends CombatPool {
  /** "+1", "+0"; "Special" for a manoeuvre whose accuracy the book explains in its entry. */
  accuracy: string;
  /** The difficulty to roll against, between 2 and 10. */
  difficulty: number;
  /** The difficulty a manoeuvre's own table row shows, with the range band's base and no player modifiers. */
  manoeuvreDifficulty: number;
}

export const calledShotOf = (key: CalledShot['key'] | undefined): CalledShot | undefined => CALLED_SHOTS.find((shot) => shot.key === key);

export const rangeBandOf = (key: RangeBand['key'] | undefined): RangeBand | undefined => RANGE_BANDS.find((band) => band.key === key);

const clamp = (value: number): number => Math.min(MOST_DIFFICULTY, Math.max(LEAST_DIFFICULTY, value));

/** The difficulty before the player's own modifier: the range band's for a ranged attack, else the ordinary one. */
export function baseDifficulty(manoeuvre: Manoeuvre, weapon: Weapon | undefined, modifiers: Pick<AttackModifiers, 'range' | 'target'>): number {
  const band = weapon?.kind === 'ranged' || manoeuvre.section === 'ranged' ? (rangeBandOf(modifiers.range) ?? rangeBandOf('short')!) : undefined;
  return (band?.difficulty ?? BASE_DIFFICULTY) + manoeuvre.difficulty + (calledShotOf(modifiers.target)?.difficulty ?? 0);
}

/** The attack pool, accuracy and difficulty of a manoeuvre, with the weapon and the player's modifiers. */
export function attackPool(character: V20Character, manoeuvre: Manoeuvre, weapon: Weapon | undefined, modifiers: AttackModifiers = NO_MODIFIERS): AttackPool {
  const pool = manoeuvrePool(character, manoeuvre);
  const dice = pool.incapacitated ? 0 : Math.max(0, pool.unfloored + modifiers.dice);
  const rangeOnly = { range: modifiers.range };
  return {
    ...pool,
    dice,
    accuracy: manoeuvre.accuracy === 'special' ? 'Special' : `+${manoeuvre.accuracy}`,
    difficulty: clamp(baseDifficulty(manoeuvre, weapon, modifiers) + modifiers.difficulty),
    manoeuvreDifficulty: clamp(baseDifficulty(manoeuvre, weapon, rangeOnly)),
  };
}
