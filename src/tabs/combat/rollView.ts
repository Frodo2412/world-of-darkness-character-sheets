// What the Weapon roll panel shows for the choices on it. Pure: every figure comes from the character,
// the rulebook data and the player's modifiers, and none of it is stored.

import type { V20Character } from '../../domain/v20/character';
import { attackPool, baseDifficulty, calledShotOf, clampDifficulty, type AttackModifiers, type AttackPool } from '../../domain/v20/combat/attack';
import { damagePool, type DamagePool } from '../../domain/v20/combat/damage';
import { MANOEUVRES, type Manoeuvre } from '../../domain/v20/combat/data/manoeuvres';
import { manoeuvreAvailability, type Availability } from '../../domain/v20/combat/requirements';
import { damageText, weaponNamed } from '../../domain/v20/combat/rows';
import type { Weapon } from '../../domain/v20/combat/data/types';

/** What the player has chosen on the panel: page state, forgotten when the tab is left. */
export interface RollState {
  weapon?: string;
  manoeuvre: string;
  target: string;
  range: string;
  dice: number;
  difficulty: number;
  extra: number;
}

export const OPENING_ROLL: RollState = { manoeuvre: 'Strike', target: '', range: 'short', dice: 0, difficulty: 0, extra: 0 };

export interface RollView {
  manoeuvre: Manoeuvre;
  weapon: Weapon | undefined;
  availability: Availability;
  /** Undefined while the manoeuvre is unavailable. */
  attack?: AttackPool;
  /** The difficulty shown in the difficulty field: the base the choices give, with the player's modifier. */
  difficultyShown: number;
  damage: DamageView;
}

export type DamageView =
  | { kind: 'pool'; pool: DamagePool; formula: string; type: string | undefined }
  | { kind: 'none'; reason: string };

export const manoeuvreOf = (name: string): Manoeuvre => MANOEUVRES.find((entry) => entry.name === name) ?? MANOEUVRES[0];

const capital = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** The modifiers the attack pool is given. */
export function modifiersOf(state: RollState): AttackModifiers {
  return {
    dice: state.dice,
    difficulty: state.difficulty,
    ...(state.target === '' ? {} : { target: state.target as AttackModifiers['target'] }),
    range: state.range as AttackModifiers['range'],
  };
}

function damageOf(character: V20Character, manoeuvre: Manoeuvre, weapon: Weapon | undefined, state: RollState): DamageView {
  const target = calledShotOf(modifiersOf(state).target);
  const aggravated = manoeuvre.effects.includes('aggravated') ? 'Aggravated' : undefined;
  switch (manoeuvre.damage.kind) {
    case 'dice': {
      const pool = damagePool(character, manoeuvre.damage.dice, state.extra, target);
      return { kind: 'pool', pool, formula: pool.formula, type: aggravated };
    }
    case 'weapon': {
      if (weapon === undefined) return { kind: 'none', reason: 'Select a weapon to see its damage.' };
      const pool = damagePool(character, weapon.damage, state.extra, target);
      return { kind: 'pool', pool, formula: pool.formula, type: weapon.kind === 'melee' ? capital(weapon.type) : undefined };
    }
    case 'special':
      return { kind: 'none', reason: 'This manoeuvre’s damage is special: see its entry in the rulebook.' };
    case 'none':
      return { kind: 'none', reason: 'This manoeuvre does no damage.' };
  }
}

/** Everything the panel draws for the character and the player's choices. */
export function rollView(character: V20Character, state: RollState): RollView {
  const manoeuvre = manoeuvreOf(state.manoeuvre);
  const weapon = weaponNamed(state.weapon);
  const availability = manoeuvreAvailability(character, manoeuvre, weapon);
  const modifiers = modifiersOf(state);
  const view: RollView = {
    manoeuvre,
    weapon,
    availability,
    difficultyShown: attackPool(character, manoeuvre, weapon, modifiers).difficulty,
    damage: damageOf(character, manoeuvre, weapon, state),
  };
  if (availability.unavailable === undefined) view.attack = attackPool(character, manoeuvre, weapon, modifiers);
  return view;
}

/** The difficulty the choices give before the player's own modifier: what typing a difficulty is measured from. */
export function difficultyBase(state: RollState): number {
  const manoeuvre = manoeuvreOf(state.manoeuvre);
  return baseDifficulty(manoeuvre, weaponNamed(state.weapon), modifiersOf(state));
}

export { damageText };

/**
 * The modifier that makes the difficulty shown the one wanted. It is measured from the base, not from what is
 * shown, and the wanted figure is held to the rulebook's range first, so a difficulty already pinned at the
 * ceiling or floor leaves nothing hidden for the other button to undo.
 */
export function difficultyModifierFor(state: RollState, wanted: number): number {
  return clampDifficulty(wanted) - difficultyBase(state);
}
