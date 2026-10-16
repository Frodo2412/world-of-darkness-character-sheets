// What the Weapon roll panel holds and shows. The state is page state: the player's choices and
// entries while the tab is open, never stored.

import { attackPool } from '../../domain/v20/combat/attack';
import { damagePool } from '../../domain/v20/combat/damage';
import { MANOEUVRES } from '../../domain/v20/combat/data/manoeuvres';
import { CALLED_SHOTS, RANGE_BANDS } from '../../domain/v20/combat/data/modifiers';
import { RANGED_WEAPONS } from '../../domain/v20/combat/data/ranged';
import type { Weapon } from '../../domain/v20/combat/data/types';
import { MELEE_WEAPONS } from '../../domain/v20/combat/data/weapons';
import type { V20Character } from '../../domain/v20/character';
import { diceLabel } from '../../domain/v20/identity';
import { accuracyText, calledShotNote, rangeNote } from './text';

/** Every weapon of the Melee and Ranged Weapons Charts, melee first. */
export const WEAPONS: readonly Weapon[] = [...MELEE_WEAPONS, ...RANGED_WEAPONS];

export interface RollState {
  /** The weapon chosen, by name. */
  weapon?: string;
  /** The manoeuvre chosen, by name. */
  manoeuvre?: string;
  /** Dice the player adds to (or, negative, takes off) the attack pool. */
  diceModifier: number;
  /** Added to the attack's difficulty. */
  difficultyModifier: number;
  /** The Target, by the key of its Targeting table row. */
  target?: string;
  /** The Range, by key. */
  range?: string;
  /** Extra successes of the attack roll, as entered; a negative entry is kept until it is committed. */
  extraSuccesses: number;
  /** The entry of extra successes was below 0 and was kept at 0: the player is told so until they enter a valid number. */
  extraCorrected: boolean;
}

/** What the player enters or chooses for one roll: forgotten on leaving the tab. The weapon and manoeuvre are kept. */
export const clearedEntries = (): Pick<RollState, 'diceModifier' | 'difficultyModifier' | 'target' | 'range' | 'extraSuccesses' | 'extraCorrected'> => ({
  diceModifier: 0,
  difficultyModifier: 0,
  target: undefined,
  range: undefined,
  extraSuccesses: 0,
  extraCorrected: false,
});

export const blankRoll = (): RollState => ({ ...clearedEntries(), weapon: undefined, manoeuvre: undefined });

export interface RollView {
  /** The attack pool in words; absent until a manoeuvre is chosen. */
  attack?: { dice: string; formula: string; accuracy: string; difficulty: string };
  /** What the chosen Target adds, or empty. */
  targetNote: string;
  /** What the chosen Range means, or empty. */
  rangeNote: string;
  /** The damage pool in words; absent until a weapon is chosen. */
  damage?: { dice: string; formula: string; type: string; difficulty: string };
  /** Said beside the extra successes when the entry was kept at 0; empty otherwise. */
  extraHint: string;
}

/** What the player is told when an entry of extra successes is below 0. */
export const EXTRA_SUCCESSES_HINT = 'Extra successes kept at 0 or more.';

/** Said instead of a Range's difficulty when a close combat manoeuvre is chosen: the Range does not apply to it. */
export const RANGE_MELEE_NOTE = 'Range applies to ranged manoeuvres only.';

const capitalised = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

export function rollView(character: V20Character, state: RollState): RollView {
  const manoeuvre = MANOEUVRES.find(({ name }) => name === state.manoeuvre);
  const target = CALLED_SHOTS.find(({ key }) => key === state.target);
  const range = RANGE_BANDS.find(({ key }) => key === state.range);
  const view: RollView = {
    targetNote: target === undefined ? '' : calledShotNote(target),
    rangeNote: range === undefined ? '' : manoeuvre?.section === 'melee' ? RANGE_MELEE_NOTE : rangeNote(range),
    extraHint: state.extraCorrected ? EXTRA_SUCCESSES_HINT : '',
  };
  const weapon = WEAPONS.find(({ name }) => name === state.weapon);
  if (weapon !== undefined) {
    const damage = damagePool(character, weapon, state.extraSuccesses, target);
    view.damage = {
      dice: diceLabel(damage.dice),
      formula: damage.formula,
      type: damage.type === undefined ? '' : `${capitalised(damage.type)} damage`,
      difficulty: String(damage.difficulty),
    };
  }
  if (manoeuvre !== undefined) {
    const attack = attackPool({
      character,
      manoeuvre,
      diceModifier: state.diceModifier,
      difficultyModifier: state.difficultyModifier,
      target,
      range,
    });
    view.attack = {
      dice: diceLabel(attack.dice),
      formula: attack.formula,
      accuracy: accuracyText(attack.accuracy),
      difficulty: String(attack.difficulty),
    };
  }
  return view;
}
