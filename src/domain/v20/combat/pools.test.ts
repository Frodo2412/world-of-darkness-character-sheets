import { describe, expect, test } from 'vitest';
import { blankCharacter, type V20Character } from '../character';
import { MANOEUVRES } from './data/manoeuvres';
import { manoeuvrePool, traitsPool, weaponPool } from './pools';

function character(overrides: (c: V20Character) => void = () => {}): V20Character {
  const base = blankCharacter('abc');
  base.attributes.dexterity = 3;
  base.attributes.strength = 2;
  base.abilities.brawl = 1;
  overrides(base);
  return base;
}

const manoeuvre = (name: string) => MANOEUVRES.find((entry) => entry.name === name)!;

describe('manoeuvrePool', () => {
  test('Strike with Dexterity 3, Brawl 1 and a Hurt wound is 3 dice, said in full', () => {
    const pool = manoeuvrePool(character((c) => (c.health.hurt = 'lethal')), manoeuvre('Strike'));

    expect(pool).toEqual({ dice: 3, formula: 'Dexterity 3 + Brawl 1 − wound 1', incapacitated: false });
  });

  test('without a wound the formula has no wound', () => {
    expect(manoeuvrePool(character(), manoeuvre('Strike')).formula).toBe('Dexterity 3 + Brawl 1');
  });

  test('a rating of 0 in the ability rolls the attribute alone', () => {
    const pool = manoeuvrePool(character(), manoeuvre('Weapon Strike'));

    expect(pool).toMatchObject({ dice: 3, formula: 'Dexterity 3 + Melee 0' });
  });

  test('a manoeuvre with accuracy adds those dice before the wound comes off', () => {
    const pool = manoeuvrePool(character((c) => (c.health.hurt = 'lethal')), manoeuvre('Bite'));

    expect(pool).toEqual({ dice: 4, formula: 'Dexterity 3 + Brawl 1 + accuracy 1 − wound 1', incapacitated: false });
  });

  test('a manoeuvre whose accuracy is Special adds none', () => {
    expect(manoeuvrePool(character(), manoeuvre('Block')).formula).toBe('Dexterity 3 + Brawl 1');
  });

  test('is floored at 0 by a heavy wound', () => {
    const pool = manoeuvrePool(character((c) => (c.health.crippled = 'lethal')), manoeuvre('Strike'));

    expect(pool).toMatchObject({ dice: 0, formula: 'Dexterity 3 + Brawl 1 − wound 5', incapacitated: false });
  });

  test('is 0, and says why, when the character is incapacitated', () => {
    const pool = manoeuvrePool(character((c) => (c.health.incapacitated = 'lethal')), manoeuvre('Strike'));

    expect(pool).toMatchObject({ dice: 0, incapacitated: true });
  });

  test('uses the better of two abilities where the book allows either', () => {
    expect(manoeuvrePool(character(), manoeuvre('Sweep')).formula).toBe('Dexterity 3 + Brawl 1');
    expect(manoeuvrePool(character((c) => (c.abilities.melee = 3)), manoeuvre('Sweep'))).toMatchObject({ dice: 6, formula: 'Dexterity 3 + Melee 3' });
  });

  test('every manoeuvre gets a pool', () => {
    for (const entry of MANOEUVRES) expect(manoeuvrePool(character(), entry).dice, entry.name).toBeGreaterThanOrEqual(0);
  });
});

describe('weaponPool', () => {
  test('is Dexterity + Melee for a melee weapon and Dexterity + Firearms for a ranged one', () => {
    const arranged = character((c) => {
      c.abilities.melee = 2;
      c.abilities.firearms = 4;
    });

    expect(weaponPool(arranged, 'melee')).toMatchObject({ dice: 5, formula: 'Dexterity 3 + Melee 2' });
    expect(weaponPool(arranged, 'ranged')).toMatchObject({ dice: 7, formula: 'Dexterity 3 + Firearms 4' });
  });
});

describe('traitsPool', () => {
  test('adds accuracy dice and names them', () => {
    expect(traitsPool(character(), 'dexterity', 'brawl', 2)).toMatchObject({ dice: 6, formula: 'Dexterity 3 + Brawl 1 + accuracy 2' });
  });
});
