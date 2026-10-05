import { describe, expect, test } from 'vitest';
import { blankCharacter, setHeaderField, type V20Character } from './character';
import { bloodPoolMaximum, woundState } from './resources';
import type { DamageType, HealthLevelKey } from './traits';

const withGeneration = (generation: string): V20Character =>
  setHeaderField(blankCharacter('abc'), 'generation', generation);

describe('bloodPoolMaximum', () => {
  test.each([
    [4, 50],
    [5, 40],
    [6, 30],
    [7, 20],
    [8, 15],
    [9, 14],
    [10, 13],
    [11, 12],
    [12, 11],
    [13, 10],
    [14, 10],
    [15, 10],
  ])('generation %i has a maximum of %i and it is not assumed', (generation, maximum) => {
    expect(bloodPoolMaximum(withGeneration(String(generation)))).toEqual({ maximum, assumed: false });
  });

  test.each([3, 16])('generation %i is not recognised, so the sheet maximum is assumed', (generation) => {
    expect(bloodPoolMaximum(withGeneration(String(generation)))).toEqual({ maximum: 50, assumed: true });
  });

  test.each(['10th', '10th generation', '  10  ', 'Tenth, so 10'])('reads the number in %j', (text) => {
    expect(bloodPoolMaximum(withGeneration(text))).toEqual({ maximum: 13, assumed: false });
  });

  test.each(['', '   ', 'banana', 'tenth'])('%j has no readable number, so the sheet maximum is assumed', (text) => {
    expect(bloodPoolMaximum(withGeneration(text))).toEqual({ maximum: 50, assumed: true });
  });

  test('does not change the character it was given', () => {
    const original = withGeneration('10th');

    bloodPoolMaximum(original);

    expect(original).toEqual(withGeneration('10th'));
  });
});

describe('woundState', () => {
  const marked = (damage: Partial<Record<HealthLevelKey, DamageType>>): V20Character => {
    const character = blankCharacter('abc');
    return { ...character, health: { ...character.health, ...damage } };
  };

  test('is none for an empty track', () => {
    expect(woundState(blankCharacter('abc'))).toBeUndefined();
  });

  test.each<[HealthLevelKey, string, number]>([
    ['hurt', 'Hurt', 1],
    ['injured', 'Injured', 1],
    ['wounded', 'Wounded', 2],
    ['mauled', 'Mauled', 2],
    ['crippled', 'Crippled', 5],
  ])('damage on %s alone is %s with a penalty of %i', (level, label, penalty) => {
    expect(woundState(marked({ [level]: 'lethal' }))).toEqual({ level, label, penalty });
  });

  test('Bruised alone is no wound', () => {
    expect(woundState(marked({ bruised: 'aggravated' }))).toBeUndefined();
  });

  test.each<DamageType>(['bashing', 'lethal', 'aggravated'])('%s damage counts as much as any other', (damage) => {
    expect(woundState(marked({ wounded: damage }))).toEqual({ level: 'wounded', label: 'Wounded', penalty: 2 });
  });

  test('takes the most severe level when the damage is not contiguous', () => {
    expect(woundState(marked({ hurt: 'bashing', crippled: 'lethal' }))).toEqual({
      level: 'crippled',
      label: 'Crippled',
      penalty: 5,
    });
  });

  test('ignores Bruised when a worse level is marked', () => {
    expect(woundState(marked({ bruised: 'bashing', hurt: 'bashing' }))).toEqual({
      level: 'hurt',
      label: 'Hurt',
      penalty: 1,
    });
  });

  test('Incapacitated alone is its own state', () => {
    expect(woundState(marked({ incapacitated: 'aggravated' }))).toBe('incapacitated');
  });

  test('Incapacitated wins over every other level', () => {
    expect(woundState(marked({ bruised: 'bashing', hurt: 'lethal', crippled: 'aggravated', incapacitated: 'bashing' }))).toBe(
      'incapacitated',
    );
  });

  test('does not change the character it was given', () => {
    const original = marked({ hurt: 'lethal', incapacitated: 'bashing' });

    woundState(original);

    expect(original).toEqual(marked({ hurt: 'lethal', incapacitated: 'bashing' }));
  });
});
