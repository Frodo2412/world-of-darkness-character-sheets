import { describe, expect, test } from 'vitest';
import { blankCharacter, type V20Character } from '../character';
import { clampExtraSuccesses, damagePool, EXTRA_SUCCESSES_MESSAGE } from './damage';
import { CALLED_SHOTS } from './data/modifiers';

const strong = (change: (c: V20Character) => void = () => {}): V20Character => {
  const base = blankCharacter('abc');
  base.attributes.strength = 3;
  change(base);
  return base;
};

describe('damagePool', () => {
  test('Strength + 1 with Strength 3 and 2 extra successes is 6 dice', () => {
    expect(damagePool(strong(), { strength: 1 }, 2)).toMatchObject({ dice: 6, formula: 'Strength 3 + weapon 1 + extra successes 2' });
  });

  test('plain Strength damage has no weapon term', () => {
    expect(damagePool(strong(), { strength: 0 }, 0)).toMatchObject({ dice: 3, formula: 'Strength 3 + extra successes 0' });
  });

  test('flat damage is the pool as the chart prints it', () => {
    expect(damagePool(strong(), { flat: 4 }, 0)).toMatchObject({ dice: 4, formula: 'Weapon 4 + extra successes 0' });
  });

  test('a negative number of extra successes adds nothing', () => {
    expect(damagePool(strong(), { flat: 4 }, -2).dice).toBe(4);
  });

  test('adds the called shot damage', () => {
    for (const shot of CALLED_SHOTS) expect(damagePool(strong(), { flat: 4 }, 0, shot).dice, shot.label).toBe(4 + shot.damage);
    expect(damagePool(strong(), { flat: 4 }, 0, CALLED_SHOTS[2]).formula).toContain('+ target 2');
  });

  test('the wound takes nothing off damage', () => {
    expect(damagePool(strong((c) => (c.health.crippled = 'lethal')), { strength: 1 }, 0).dice).toBe(4);
  });

  test('is 0 when the character is incapacitated', () => {
    expect(damagePool(strong((c) => (c.health.incapacitated = 'lethal')), { strength: 1 }, 3)).toMatchObject({ dice: 0, incapacitated: true });
  });

  test('is never below 0', () => {
    expect(damagePool(blankCharacter('abc'), { flat: 0 }, 0).dice).toBeGreaterThanOrEqual(0);
  });
});

describe('damagePool with extra successes that are not a number', () => {
  test.each([Number.NaN, Number.POSITIVE_INFINITY])('%s adds nothing and never gives NaN or infinite dice', (extra) => {
    const pool = damagePool(blankCharacter('abc'), { flat: 2 }, extra);

    expect(pool.dice).toBe(2);
    expect(pool.formula).toContain('extra successes 0');
  });
});

describe('clampExtraSuccesses', () => {
  test('leaves a whole number of 0 or more alone', () => {
    expect(clampExtraSuccesses(0)).toEqual({ extra: 0, corrected: false });
    expect(clampExtraSuccesses(4)).toEqual({ extra: 4, corrected: false });
  });

  test('puts a negative, a fraction or a missing number right and says so', () => {
    expect(clampExtraSuccesses(-2)).toEqual({ extra: 0, corrected: true });
    expect(clampExtraSuccesses(2.5)).toEqual({ extra: 2, corrected: true });
    expect(clampExtraSuccesses(Number.NaN)).toEqual({ extra: 0, corrected: true });
  });

  test('does not let a number that is not finite through', () => {
    expect(clampExtraSuccesses(Number.POSITIVE_INFINITY)).toEqual({ extra: 0, corrected: true });
    expect(clampExtraSuccesses(Number.NEGATIVE_INFINITY)).toEqual({ extra: 0, corrected: true });
  });

  test('has the stated message', () => {
    expect(EXTRA_SUCCESSES_MESSAGE).toBe('Extra successes kept at 0 or more.');
  });
});
