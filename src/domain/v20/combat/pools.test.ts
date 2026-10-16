import { describe, expect, test } from 'vitest';
import { blankCharacter, type V20Character } from '../character';
import { MANOEUVRES } from './data/manoeuvres';
import { MELEE_WEAPONS } from './data/weapons';
import { RANGED_WEAPONS } from './data/ranged';
import { INCAPACITATED_REASON, manoeuvrePool, weaponPool } from './pools';

const manoeuvre = (name: string) => MANOEUVRES.find((entry) => entry.name === name)!;

function character(arrange: (character: V20Character) => void): V20Character {
  const made = blankCharacter('abc');
  arrange(made);
  return made;
}

describe('manoeuvrePool', () => {
  test('Strike is Dexterity + Brawl less a Hurt wound', () => {
    const hurt = character((c) => {
      c.attributes.dexterity = 3;
      c.abilities.brawl = 1;
      c.health.hurt = 'lethal';
    });

    expect(manoeuvrePool(hurt, manoeuvre('Strike'))).toEqual({
      dice: 3,
      raw: 3,
      formula: 'Dexterity 3 + Brawl 1 − wound 1',
      incapacitated: false,
    });
  });

  test('an ability rated 0 adds nothing to its attribute', () => {
    const unskilled = character((c) => void (c.attributes.dexterity = 3));

    expect(manoeuvrePool(unskilled, manoeuvre('Weapon Strike'))).toMatchObject({ dice: 3, formula: 'Dexterity 3 + Melee 0' });
  });

  test('a Crippled wound floors the pool at 0 and still says what it took off', () => {
    const crippled = character((c) => {
      c.attributes.dexterity = 3;
      c.abilities.brawl = 1;
      c.health.crippled = 'bashing';
    });

    expect(manoeuvrePool(crippled, manoeuvre('Strike'))).toEqual({
      dice: 0,
      raw: -1,
      formula: 'Dexterity 3 + Brawl 1 − wound 5',
      incapacitated: false,
    });
  });

  test('an Incapacitated character has 0 dice and the shared reason', () => {
    const down = character((c) => {
      c.attributes.dexterity = 3;
      c.abilities.brawl = 1;
      for (const level of Object.keys(c.health) as (keyof typeof c.health)[]) c.health[level] = 'lethal';
    });

    expect(manoeuvrePool(down, manoeuvre('Strike'))).toEqual({
      dice: 0,
      raw: 4,
      formula: 'Dexterity 3 + Brawl 1',
      incapacitated: true,
      reason: 'Incapacitated: every pool is 0 dice.',
    });
    expect(INCAPACITATED_REASON).toBe('Incapacitated: every pool is 0 dice.');
  });

  test('Strength-based manoeuvres use Strength', () => {
    const strong = character((c) => {
      c.attributes.strength = 4;
      c.abilities.brawl = 2;
    });

    expect(manoeuvrePool(strong, manoeuvre('Clinch'))).toMatchObject({ dice: 6, formula: 'Strength 4 + Brawl 2' });
  });

  test('every manoeuvre gets a pool', () => {
    const skilled = character((c) => {
      c.attributes.dexterity = 2;
      c.attributes.strength = 2;
      for (const ability of ['brawl', 'melee', 'athletics', 'firearms'] as const) c.abilities[ability] = 1;
    });

    expect(MANOEUVRES).toHaveLength(18);
    for (const entry of MANOEUVRES) expect(manoeuvrePool(skilled, entry).dice, entry.name).toBe(3);
  });
});

describe('weaponPool', () => {
  test('a melee weapon is Dexterity + Melee', () => {
    const swordsman = character((c) => {
      c.attributes.dexterity = 3;
      c.abilities.melee = 2;
    });

    for (const weapon of MELEE_WEAPONS) {
      expect(weaponPool(swordsman, weapon), weapon.name).toMatchObject({ dice: 5, formula: 'Dexterity 3 + Melee 2' });
    }
  });

  test('a ranged weapon is Dexterity + Firearms', () => {
    const shooter = character((c) => {
      c.attributes.dexterity = 3;
      c.abilities.firearms = 2;
    });

    for (const weapon of RANGED_WEAPONS) {
      expect(weaponPool(shooter, weapon), weapon.name).toMatchObject({ dice: 5, formula: 'Dexterity 3 + Firearms 2' });
    }
  });

  test('the wound comes off a weapon pool as it does a manoeuvre pool', () => {
    const wounded = character((c) => {
      c.attributes.dexterity = 3;
      c.abilities.firearms = 2;
      c.health.wounded = 'lethal';
    });

    expect(weaponPool(wounded, RANGED_WEAPONS[0])).toMatchObject({ dice: 3, formula: 'Dexterity 3 + Firearms 2 − wound 2' });
  });
});
