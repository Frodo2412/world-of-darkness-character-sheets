import { field, setField, setText, showUnlessFocused } from './dom';
import type { RollState, RollView } from './roll';

/** The parts of the panel the Weapon roll draws into and reads from. */
export interface RollParts {
  root: HTMLElement;
  weapon: HTMLSelectElement;
  manoeuvre: HTMLSelectElement;
  target: HTMLSelectElement;
  range: HTMLSelectElement;
  dice: HTMLInputElement;
  difficulty: HTMLInputElement;
}

export function rollParts(root: HTMLElement): RollParts {
  const input = <T extends HTMLElement>(name: string): T => root.querySelector<T>(`[data-input="${name}"]`)!;
  return {
    root,
    weapon: input('weapon'),
    manoeuvre: input('manoeuvre'),
    target: input('target'),
    range: input('range'),
    dice: input('dice'),
    difficulty: input('difficulty'),
  };
}

/** Shows the player's choices in the pickers and entries, and what they make of the attack in the result card. */
export function drawRoll(parts: RollParts, state: RollState, view: RollView): void {
  showUnlessFocused(parts.weapon, state.weapon ?? '');
  showUnlessFocused(parts.manoeuvre, state.manoeuvre ?? '');
  showUnlessFocused(parts.target, state.target ?? '');
  showUnlessFocused(parts.range, state.range ?? '');
  showUnlessFocused(parts.dice, String(state.diceModifier));
  showUnlessFocused(parts.difficulty, String(state.difficultyModifier));
  setField(parts.root, 'target-note', view.targetNote);
  setField(parts.root, 'range-note', view.rangeNote);

  field(parts.root, 'choose-manoeuvre').hidden = view.attack !== undefined;
  field(parts.root, 'attack').hidden = view.attack === undefined;
  if (view.attack === undefined) return;
  setText(field(parts.root, 'attack-pool'), view.attack.dice);
  setText(field(parts.root, 'attack-formula'), view.attack.formula);
  setText(field(parts.root, 'accuracy'), view.attack.accuracy);
  setText(field(parts.root, 'difficulty'), view.attack.difficulty);
}
