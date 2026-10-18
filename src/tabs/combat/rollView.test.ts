import { describe, expect, test } from 'vitest';
import { blankCharacter } from '../../domain/v20/character';
import { difficultyModifierFor, OPENING_ROLL, rollView, type RollState } from './rollView';

const character = blankCharacter('abc');
const shownFor = (state: RollState): number => rollView(character, state).difficultyShown;

describe('difficultyModifierFor', () => {
  test('makes the difficulty shown the one wanted', () => {
    const state: RollState = { ...OPENING_ROLL, difficulty: 1 };

    expect(shownFor({ ...state, difficulty: difficultyModifierFor(state, 6) })).toBe(6);
  });

  test('stepping down from a difficulty held at the ceiling moves it at once, with no hidden modifier left behind', () => {
    const state: RollState = { ...OPENING_ROLL, difficulty: 8 };
    expect(shownFor(state)).toBe(10);

    const down: RollState = { ...state, difficulty: difficultyModifierFor(state, shownFor(state) - 1) };

    expect(shownFor(down)).toBe(9);
    expect(shownFor({ ...down, difficulty: difficultyModifierFor(down, shownFor(down) + 1) })).toBe(10);
    expect(shownFor({ ...down, difficulty: difficultyModifierFor(down, 11) })).toBe(10);
    expect(difficultyModifierFor(state, 11)).toBe(difficultyModifierFor(state, 10));
  });

  test('stepping up from a difficulty held at the floor does not pile up a hidden modifier', () => {
    const state: RollState = { ...OPENING_ROLL, difficulty: -8 };
    expect(shownFor(state)).toBe(2);

    const up: RollState = { ...state, difficulty: difficultyModifierFor(state, shownFor(state) + 1) };

    expect(shownFor(up)).toBe(3);
    expect(difficultyModifierFor(state, -5)).toBe(difficultyModifierFor(state, 2));
  });
});
