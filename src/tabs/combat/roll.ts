// What the Weapon roll panel holds and shows. The state is page state: the player's choices and
// entries while the tab is open, never stored.

import { attackPool } from '../../domain/v20/combat/attack';
import { MANOEUVRES } from '../../domain/v20/combat/data/manoeuvres';
import { CALLED_SHOTS, RANGE_BANDS } from '../../domain/v20/combat/data/modifiers';
import type { V20Character } from '../../domain/v20/character';
import { diceLabel } from '../../domain/v20/identity';
import { accuracyText, calledShotNote, rangeNote } from './text';

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
}

/** What the player enters or chooses for one roll: forgotten on leaving the tab. The weapon and manoeuvre are kept. */
export const clearedEntries = (): Pick<RollState, 'diceModifier' | 'difficultyModifier' | 'target' | 'range'> => ({
  diceModifier: 0,
  difficultyModifier: 0,
  target: undefined,
  range: undefined,
});

export const blankRoll = (): RollState => ({ ...clearedEntries(), weapon: undefined, manoeuvre: undefined });

export interface RollView {
  /** The attack pool in words; absent until a manoeuvre is chosen. */
  attack?: { dice: string; formula: string; accuracy: string; difficulty: string };
  /** What the chosen Target adds, or empty. */
  targetNote: string;
  /** What the chosen Range means, or empty. */
  rangeNote: string;
}

export function rollView(character: V20Character, state: RollState): RollView {
  const manoeuvre = MANOEUVRES.find(({ name }) => name === state.manoeuvre);
  const target = CALLED_SHOTS.find(({ key }) => key === state.target);
  const range = RANGE_BANDS.find(({ key }) => key === state.range);
  const view: RollView = {
    targetNote: target === undefined ? '' : calledShotNote(target),
    rangeNote: range === undefined ? '' : rangeNote(range),
  };
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
