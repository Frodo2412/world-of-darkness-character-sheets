import { describe, expect, test } from 'vitest';
import { blankCharacter, type V20Character } from '../character';
import { attackPool, BASE_DIFFICULTY, type AttackInput } from './attack';
import { MANOEUVRES } from './data/manoeuvres';
import { CALLED_SHOTS, RANGE_BANDS } from './data/modifiers';

const manoeuvre = (name: string) => MANOEUVRES.find((entry) => entry.name === name)!;
const calledShot = (key: string) => CALLED_SHOTS.find((entry) => entry.key === key)!;
const rangeBand = (key: string) => RANGE_BANDS.find((entry) => entry.key === key)!;

function swordsman(arrange: (character: V20Character) => void = () => {}): V20Character {
  const character = blankCharacter('abc');
  character.attributes.dexterity = 3;
  arrange(character);
  return character;
}

const attack = (overrides: Partial<AttackInput> = {}) =>
  attackPool({
    character: swordsman(),
    manoeuvre: manoeuvre('Weapon Strike'),
    diceModifier: 0,
    difficultyModifier: 0,
    ...overrides,
  });

describe('attackPool', () => {
  test('is the manoeuvre\'s pool against the standard difficulty 6, with its accuracy beside it', () => {
    expect(attack()).toEqual({
      dice: 3,
      formula: 'Dexterity 3 + Melee 0',
      incapacitated: false,
      accuracy: 0,
      difficulty: 6,
    });
    expect(BASE_DIFFICULTY).toBe(6);
  });

  test('the manoeuvre\'s own accuracy and difficulty come from it', () => {
    const burst = attack({ manoeuvre: manoeuvre('Three-Round Burst'), character: swordsman((c) => void (c.abilities.firearms = 2)) });

    expect(burst).toMatchObject({ dice: 5, accuracy: 2, difficulty: 7 });
    expect(attack({ manoeuvre: manoeuvre('Multiple Shots') }).accuracy).toBe('special');
  });

  test('a dice modifier adds to the pool and a difficulty modifier to the difficulty', () => {
    expect(attack({ diceModifier: 1, difficultyModifier: 1 })).toMatchObject({
      dice: 4,
      formula: 'Dexterity 3 + Melee 0 + dice modifier 1',
      difficulty: 7,
    });
    expect(attack({ difficultyModifier: -2 }).difficulty).toBe(4);
  });

  test('a dice modifier larger than the pool floors it at 0 and says what was taken off', () => {
    expect(attack({ diceModifier: -5 })).toMatchObject({ dice: 0, formula: 'Dexterity 3 + Melee 0 − dice modifier 5' });
  });

  test('the wound comes off before the modifier, and both are in the words', () => {
    const hurt = swordsman((c) => void (c.health.hurt = 'lethal'));

    expect(attack({ character: hurt, diceModifier: 2 })).toMatchObject({
      dice: 4,
      formula: 'Dexterity 3 + Melee 0 − wound 1 + dice modifier 2',
    });
  });

  test.each([
    ['medium', 7, 1],
    ['small', 8, 2],
    ['precise', 9, 3],
  ])('the %s called shot adds its difficulty from the Targeting table', (key, difficulty) => {
    expect(attack({ target: calledShot(key) }).difficulty).toBe(difficulty);
  });

  test.each([
    ['point-blank', 4],
    ['short', 6],
    ['long', 8],
  ])('the %s range replaces the base difficulty', (key, difficulty) => {
    expect(attack({ range: rangeBand(key) }).difficulty).toBe(difficulty);
  });

  test('range, manoeuvre, called shot and modifier all add up', () => {
    const burst = manoeuvre('Three-Round Burst');

    expect(attack({ manoeuvre: burst, range: rangeBand('long'), target: calledShot('small'), difficultyModifier: 1 }).difficulty).toBe(
      8 + 1 + 2 + 1,
    );
  });

  test('an Incapacitated character attacks with 0 dice whatever the modifier, and the reason is kept', () => {
    const down = swordsman((c) => {
      for (const level of Object.keys(c.health) as (keyof typeof c.health)[]) c.health[level] = 'lethal';
    });

    expect(attack({ character: down, diceModifier: 4 })).toMatchObject({
      dice: 0,
      formula: 'Dexterity 3 + Melee 0',
      incapacitated: true,
      reason: 'Incapacitated: every pool is 0 dice.',
    });
  });
});
