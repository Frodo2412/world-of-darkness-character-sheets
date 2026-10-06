import { describe, expect, test } from 'vitest';
import { blankCharacter, setHeaderField, setSpecialty, setText, setTrait, type V20Character } from './character';
import {
  bloodPerTurn,
  bloodPoolMaximum,
  dicePool,
  resourceReading,
  stepBlood,
  stepTemporaryWillpower,
  woundState,
} from './resources';
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

describe('bloodPerTurn', () => {
  test.each([
    [4, 10],
    [5, 8],
    [6, 6],
    [7, 4],
    [8, 3],
    [9, 2],
    [10, 1],
    [13, 1],
    [15, 1],
  ])('generation %i may spend %i a turn', (generation, perTurn) => {
    expect(bloodPerTurn(withGeneration(String(generation)))).toBe(perTurn);
  });

  test.each(['', 'banana', '3', '16'])('%j gives no recognised generation, so there is none to show', (text) => {
    expect(bloodPerTurn(withGeneration(text))).toBeUndefined();
  });

  test('follows the Generation text, not the per-turn text stored with the character', () => {
    expect(bloodPerTurn(setText(withGeneration('8th'), 'bloodPool.perTurn', '1'))).toBe(3);
  });
});

describe('dicePool with specialties', () => {
  const selection = { attribute: 'attributes.intelligence', ability: 'abilities.investigation' } as const;

  test('a term carries its trait\'s specialty, trimmed', () => {
    const character = setSpecialty(blankCharacter('abc'), 'attributes.intelligence', '  Art history ');

    const pool = dicePool(character, selection);

    expect(pool.attribute).toEqual({ label: 'Intelligence', rating: 1, specialty: 'Art history' });
    expect(pool.ability).toEqual({ label: 'Investigation', rating: 0 });
  });

  test('a specialty of only spaces is none', () => {
    const character = setSpecialty(blankCharacter('abc'), 'abilities.investigation', '   ');

    expect(dicePool(character, selection).ability).toEqual({ label: 'Investigation', rating: 0 });
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
    expect(dicePool(withHealth({ [level]: 'lethal' }), both)).toMatchObject({ woundPenalty: penalty, total, incapacitated: false });
  });

  test('a bruise alone takes nothing off and adds no wound term', () => {
    const pool = dicePool(withHealth({ bruised: 'bashing' }), both);
    expect(pool.total).toBe(7);
    expect(pool).not.toHaveProperty('woundPenalty');
  });

  test('a wound is named even before the pool is complete, with no total', () => {
    expect(dicePool(withHealth({ hurt: 'lethal' }), { attribute: 'attributes.intelligence' })).toEqual({
      attribute: { label: 'Intelligence', rating: 4 },
      woundPenalty: 1,
      incapacitated: false,
    });
  });

  test('the total never goes below zero', () => {
    const pool = dicePool(withHealth({ crippled: 'lethal' }), { attribute: 'attributes.strength', ability: 'abilities.brawl' });
    expect(pool).toMatchObject({ woundPenalty: 5, total: 0 });
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

describe('resourceReading', () => {
  const blood = (generation: string, current: number): V20Character =>
    setTrait(withGeneration(generation), 'bloodPool.current', current);
  const willpower = (permanent: number, temporary: number): V20Character =>
    setTrait(setTrait(blankCharacter('abc'), 'willpower.permanent', permanent), 'willpower.temporary', temporary);

  test("reads blood against the generation's maximum", () => {
    expect(resourceReading(blood('10th', 8), 'blood')).toEqual({
      current: 8,
      maximum: 13,
      canSpend: true,
      canGain: true,
      over: false,
      assumed: false,
    });
  });

  test('says the blood maximum is assumed when Generation is not recognised', () => {
    expect(resourceReading(blood('banana', 8), 'blood')).toMatchObject({ maximum: 50, assumed: true });
  });

  test.each([
    { current: 0, canSpend: false, canGain: true, over: false, why: 'empty can only be gained' },
    { current: 13, canSpend: true, canGain: false, over: false, why: 'full can only be spent' },
    { current: 20, canSpend: true, canGain: false, over: true, why: 'above the maximum can only fall' },
  ])('blood: $why', ({ current, canSpend, canGain, over }) => {
    expect(resourceReading(blood('10th', current), 'blood')).toMatchObject({ canSpend, canGain, over });
  });

  test('reads temporary Willpower against permanent Willpower', () => {
    expect(resourceReading(willpower(6, 4), 'willpower')).toEqual({
      current: 4,
      maximum: 6,
      canSpend: true,
      canGain: true,
      over: false,
      assumed: false,
    });
  });

  test.each([
    { permanent: 6, temporary: 0, canSpend: false, canGain: true, over: false },
    { permanent: 6, temporary: 6, canSpend: true, canGain: false, over: false },
    { permanent: 3, temporary: 8, canSpend: true, canGain: false, over: true },
    { permanent: 0, temporary: 0, canSpend: false, canGain: false, over: false },
  ])('Willpower $temporary of $permanent', ({ permanent, temporary, canSpend, canGain, over }) => {
    expect(resourceReading(willpower(permanent, temporary), 'willpower')).toMatchObject({ canSpend, canGain, over });
  });
});

describe('stepBlood', () => {
  const withBlood = (current: number, generation = '10th') =>
    setTrait(withGeneration(generation), 'bloodPool.current', current);

  test.each([
    { current: 8, delta: -1, expected: 7, why: 'spends one' },
    { current: 8, delta: 1, expected: 9, why: 'gains one' },
    { current: 0, delta: -1, expected: 0, why: 'does not go below zero' },
    { current: 0, delta: 1, expected: 1, why: 'gains from empty' },
    { current: 13, delta: 1, expected: 13, why: "does not gain past the generation's maximum" },
    { current: 13, delta: -1, expected: 12, why: 'spends from full' },
    { current: 12, delta: 1, expected: 13, why: 'gains up to the maximum' },
    { current: 20, delta: 1, expected: 20, why: 'leaves a stored excess as stored when gaining' },
    { current: 20, delta: -1, expected: 19, why: 'lets a stored excess fall' },
  ])('$why', ({ current, delta, expected }) => {
    expect(stepBlood(withBlood(current), delta).bloodPool.current).toBe(expected);
  });

  test('takes its maximum from Generation', () => {
    expect(stepBlood(withBlood(10, '13th'), 1).bloodPool.current).toBe(10);
    expect(stepBlood(withBlood(10, '12th'), 1).bloodPool.current).toBe(11);
  });

  test('leaves every other value as it was', () => {
    const original = setText(withBlood(8), 'bloodPool.perTurn', '1');

    expect(stepBlood(original, -1)).toEqual({ ...original, bloodPool: { current: 7, perTurn: '1' } });
  });

  test('does not change the character it was given', () => {
    const original = withBlood(8);

    stepBlood(original, -1);

    expect(original).toEqual(withBlood(8));
  });
});

describe('stepTemporaryWillpower', () => {
  const withWillpower = (permanent: number, temporary: number) => {
    const character = setTrait(blankCharacter('abc'), 'willpower.permanent', permanent);
    return setTrait(character, 'willpower.temporary', temporary);
  };

  test.each([
    { permanent: 6, temporary: 4, delta: -1, expected: 3, why: 'spends one' },
    { permanent: 6, temporary: 4, delta: 1, expected: 5, why: 'regains one' },
    { permanent: 6, temporary: 0, delta: -1, expected: 0, why: 'does not go below zero' },
    { permanent: 6, temporary: 0, delta: 1, expected: 1, why: 'regains from empty' },
    { permanent: 6, temporary: 6, delta: 1, expected: 6, why: 'does not regain past permanent' },
    { permanent: 6, temporary: 5, delta: 1, expected: 6, why: 'regains up to permanent' },
    { permanent: 6, temporary: 6, delta: -1, expected: 5, why: 'spends from full' },
    { permanent: 3, temporary: 8, delta: 1, expected: 8, why: 'leaves a stored excess as stored when regaining' },
    { permanent: 3, temporary: 8, delta: -1, expected: 7, why: 'lets a stored excess fall' },
    { permanent: 0, temporary: 0, delta: 1, expected: 0, why: 'regains nothing when permanent is zero' },
    { permanent: 0, temporary: 0, delta: -1, expected: 0, why: 'spends nothing when permanent is zero and temporary is empty' },
  ])('$why', ({ permanent, temporary, delta, expected }) => {
    expect(stepTemporaryWillpower(withWillpower(permanent, temporary), delta).willpower.temporary).toBe(expected);
  });

  test('leaves permanent Willpower and the rest of the character as they were', () => {
    const original = withWillpower(6, 4);

    expect(stepTemporaryWillpower(original, 1)).toEqual({ ...original, willpower: { permanent: 6, temporary: 5 } });
  });

  test('does not change the character it was given', () => {
    const original = withWillpower(6, 4);

    stepTemporaryWillpower(original, -1);

    expect(original).toEqual(withWillpower(6, 4));
  });
});

