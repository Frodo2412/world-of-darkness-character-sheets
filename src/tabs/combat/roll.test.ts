import { describe, expect, test } from 'vitest';
import { blankCharacter, type V20Character } from '../../domain/v20/character';
import { blankRoll, clearedEntries, rollView, type RollState } from './roll';

function character(): V20Character {
  const made = blankCharacter('abc');
  made.attributes.dexterity = 3;
  made.abilities.melee = 0;
  return made;
}

const roll = (overrides: Partial<RollState> = {}): RollState => ({ ...blankRoll(), ...overrides });

describe('rollView', () => {
  test('shows no attack until a manoeuvre is chosen', () => {
    expect(rollView(character(), roll({ weapon: 'Sap' })).attack).toBeUndefined();
  });

  test('words the attack pool, accuracy and difficulty of the chosen manoeuvre', () => {
    expect(rollView(character(), roll({ manoeuvre: 'Weapon Strike' })).attack).toEqual({
      dice: '3 dice',
      formula: 'Dexterity 3 + Melee 0',
      accuracy: 'Normal',
      difficulty: '6',
    });
  });

  test('the dice, difficulty, Target and Range choices change it and are described', () => {
    const view = rollView(character(), roll({ manoeuvre: 'Multiple Shots', diceModifier: 1, difficultyModifier: 1, target: 'small', range: 'long' }));

    expect(view.attack).toMatchObject({ dice: '4 dice', difficulty: '11' });
    expect(view.targetNote).toBe('Targeting table: difficulty +2, damage +1 (V20 p. 274)');
    expect(view.rangeNote).toBe("Long range: up to 2 times the weapon's range, difficulty 8 (V20 p. 278)");
  });

  test('the Medium Target says it has no damage modifier, and point blank says how near it is', () => {
    const view = rollView(character(), roll({ target: 'medium', range: 'point-blank' }));

    expect(view.targetNote).toBe('Targeting table: difficulty +1, damage no modifier (V20 p. 274)');
    expect(view.rangeNote).toBe('Point blank: within 2 meters, difficulty 4 (V20 p. 278)');
  });

  test('words the damage pool of the chosen weapon, with the extra successes and the Target', () => {
    const strong = character();
    strong.attributes.strength = 3;

    expect(rollView(strong, roll({ weapon: 'Sap', extraSuccesses: 2 })).damage).toEqual({
      dice: '6 dice',
      formula: 'Strength 3 + 1 + extra successes 2',
      type: 'Bashing damage',
      difficulty: '6',
    });
    expect(rollView(strong, roll({ weapon: 'Revolver, Lt.', target: 'small' })).damage).toEqual({
      dice: '5 dice',
      formula: '4 + Target 1',
      type: '',
      difficulty: '6',
    });
  });

  test('shows no damage pool until a weapon is chosen', () => {
    expect(rollView(character(), roll({ manoeuvre: 'Strike' })).damage).toBeUndefined();
  });

  test('says an entry of extra successes was kept at 0 only while it was', () => {
    expect(rollView(character(), roll({ extraCorrected: true })).extraHint).toBe('Extra successes kept at 0 or more.');
    expect(rollView(character(), roll()).extraHint).toBe('');
  });

  test('a choice no row matches is the same as none', () => {
    expect(rollView(character(), roll({ manoeuvre: 'Nonesuch', target: 'huge', range: 'far' }))).toEqual({ targetNote: '', rangeNote: '', extraHint: '' });
  });
});

describe('clearedEntries', () => {
  test('forgets the entries and choices of one roll but not the weapon and manoeuvre', () => {
    const used = roll({ weapon: 'Sap', manoeuvre: 'Strike', diceModifier: 2, difficultyModifier: -1, target: 'small', range: 'short', extraSuccesses: 3, extraCorrected: true });

    expect({ ...used, ...clearedEntries() }).toEqual({
      weapon: 'Sap',
      manoeuvre: 'Strike',
      diceModifier: 0,
      difficultyModifier: 0,
      target: undefined,
      range: undefined,
      extraSuccesses: 0,
      extraCorrected: false,
    });
  });
});
