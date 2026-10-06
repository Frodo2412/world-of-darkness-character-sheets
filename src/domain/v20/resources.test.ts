import { describe, expect, test } from 'vitest';
import { blankCharacter, setHeaderField, type V20Character } from './character';
import { bloodPoolMaximum, dicePool, woundState } from './resources';
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

describe('dicePool', () => {
  const character = (): V20Character => {
    const base = blankCharacter('abc');
    return {
      ...base,
      attributes: { ...base.attributes, intelligence: 4, strength: 1 },
      abilities: { ...base.abilities, investigation: 3, brawl: 0 },
      customAbilities: { ...base.customAbilities, knowledges: { name: 'Art History', rating: 2 } },
    };
  };
  const withHealth = (damage: Partial<Record<HealthLevelKey, DamageType>>): V20Character => {
    const base = character();
    return { ...base, health: { ...base.health, ...damage } };
  };

  test('names nothing and totals nothing when nothing is selected', () => {
    expect(dicePool(character(), {})).toEqual({ incapacitated: false });
  });

  test('names only the attribute when only an attribute is selected, with no total', () => {
    expect(dicePool(character(), { attribute: 'attributes.intelligence' })).toEqual({
      attribute: { label: 'Intelligence', rating: 4 },
      incapacitated: false,
    });
  });

  test('names only the ability when only an ability is selected, with no total', () => {
    expect(dicePool(character(), { ability: 'abilities.investigation' })).toEqual({
      ability: { label: 'Investigation', rating: 3 },
      incapacitated: false,
    });
  });

  test('adds the attribute and the ability when both are selected', () => {
    expect(dicePool(character(), { attribute: 'attributes.intelligence', ability: 'abilities.investigation' })).toEqual({
      attribute: { label: 'Intelligence', rating: 4 },
      ability: { label: 'Investigation', rating: 3 },
      total: 7,
      incapacitated: false,
    });
  });

  const both = { attribute: 'attributes.intelligence', ability: 'abilities.investigation' } as const;

  test.each<[HealthLevelKey, number, number]>([
    ['hurt', 1, 6],
    ['injured', 1, 6],
    ['wounded', 2, 5],
    ['mauled', 2, 5],
    ['crippled', 5, 2],
  ])('damage on %s takes %i off the total, leaving %i', (level, penalty, total) => {
    expect(dicePool(withHealth({ [level]: 'lethal' }), both)).toMatchObject({ wound: penalty, total, incapacitated: false });
  });

  test('a bruise alone takes nothing off and adds no wound term', () => {
    const pool = dicePool(withHealth({ bruised: 'bashing' }), both);
    expect(pool.total).toBe(7);
    expect(pool).not.toHaveProperty('wound');
  });

  test('a wound is named even before the pool is complete, with no total', () => {
    expect(dicePool(withHealth({ hurt: 'lethal' }), { attribute: 'attributes.intelligence' })).toEqual({
      attribute: { label: 'Intelligence', rating: 4 },
      wound: 1,
      incapacitated: false,
    });
  });

  test('the total never goes below zero', () => {
    const pool = dicePool(withHealth({ crippled: 'lethal' }), { attribute: 'attributes.strength', ability: 'abilities.brawl' });
    expect(pool).toMatchObject({ wound: 5, total: 0 });
  });

  test('an incapacitated character has a total of zero once both are selected, and no wound term', () => {
    const pool = dicePool(withHealth({ incapacitated: 'lethal' }), both);
    expect(pool).toEqual({
      attribute: { label: 'Intelligence', rating: 4 },
      ability: { label: 'Investigation', rating: 3 },
      total: 0,
      incapacitated: true,
    });
  });

  test('an incapacitated character with one selection is flagged and has no total', () => {
    expect(dicePool(withHealth({ incapacitated: 'lethal' }), { attribute: 'attributes.intelligence' })).toEqual({
      attribute: { label: 'Intelligence', rating: 4 },
      incapacitated: true,
    });
  });

  test('an incapacitated character with nothing selected is still flagged', () => {
    expect(dicePool(withHealth({ incapacitated: 'lethal' }), {})).toEqual({ incapacitated: true });
  });

  test('a named custom ability is a term under the name the player gave it', () => {
    expect(dicePool(character(), { attribute: 'attributes.intelligence', ability: 'customAbilities.knowledges' })).toMatchObject({
      ability: { label: 'Art History', rating: 2 },
      total: 6,
    });
  });

  test('a custom ability named with only spaces counts as not selected', () => {
    const base = character();
    const unnamed = { ...base, customAbilities: { ...base.customAbilities, knowledges: { name: '   ', rating: 4 } } };
    expect(dicePool(unnamed, { attribute: 'attributes.intelligence', ability: 'customAbilities.knowledges' })).toEqual({
      attribute: { label: 'Intelligence', rating: 4 },
      incapacitated: false,
    });
  });

  test('does not change the character it was given', () => {
    const original = withHealth({ hurt: 'lethal' });

    dicePool(original, both);

    expect(original).toEqual(withHealth({ hurt: 'lethal' }));
  });
});
