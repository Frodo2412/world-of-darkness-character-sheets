import { describe, expect, test } from 'vitest';
import { blankCharacter, type V20Character } from '../character';
import { MANOEUVRES } from './data/manoeuvres';
import { RANGED_WEAPONS } from './data/ranged';
import { MELEE_WEAPONS } from './data/weapons';
import { hasPower, manoeuvreAvailability, unknownPowers } from './requirements';

const manoeuvre = (name: string) => MANOEUVRES.find((entry) => entry.name === name)!;

const withDiscipline = (name: string, rating: number): V20Character => {
  const base = blankCharacter('abc');
  base.disciplines[0] = { name, rating };
  return base;
};

describe('Claw', () => {
  test('is unavailable, with the powers it needs, for a character without them', () => {
    const availability = manoeuvreAvailability(blankCharacter('abc'), manoeuvre('Claw'));

    expect(availability.unavailable).toBe('Requires Protean: Feral Claws or Vicissitude: Bonecraft.');
    expect(availability.tags).toEqual(['Prerequisite']);
  });

  test('is available with Protean at the level of Feral Claws', () => {
    const availability = manoeuvreAvailability(withDiscipline('Protean', 2), manoeuvre('Claw'));

    expect(availability.unavailable).toBeUndefined();
    expect(availability.tags).toEqual([]);
  });

  test('is unavailable with Protean one level short', () => {
    expect(manoeuvreAvailability(withDiscipline('Protean', 1), manoeuvre('Claw')).unavailable).toBeDefined();
  });

  test('is available through the other power', () => {
    expect(manoeuvreAvailability(withDiscipline('Vicissitude', 3), manoeuvre('Claw')).unavailable).toBeUndefined();
  });

  test('finds the Discipline however its name is cased and spaced', () => {
    expect(hasPower(withDiscipline('  protean ', 3), { kind: 'power', anyOf: [{ discipline: 'Protean', power: 'Feral Claws' }] })).toBe(true);
  });
});

describe('weapon requirements', () => {
  test('Weapon Strike is tagged "Weapon required" until a melee weapon is selected', () => {
    const none = manoeuvreAvailability(blankCharacter('abc'), manoeuvre('Weapon Strike'));
    const sap = manoeuvreAvailability(blankCharacter('abc'), manoeuvre('Weapon Strike'), MELEE_WEAPONS[0]);

    expect(none.tags).toEqual(['Weapon required']);
    expect(none.weaponNeeded).toBe('Needs a melee weapon.');
    expect(sap.tags).toEqual([]);
    expect(sap.weaponNeeded).toBeUndefined();
  });

  test('a ranged weapon does not satisfy a melee requirement', () => {
    expect(manoeuvreAvailability(blankCharacter('abc'), manoeuvre('Weapon Strike'), RANGED_WEAPONS[0]).tags).toEqual(['Weapon required']);
  });

  test('a burst needs a ranged weapon the chart marks as automatic', () => {
    const revolver = RANGED_WEAPONS.find((weapon) => weapon.name === 'Revolver, Lt.');
    const smg = RANGED_WEAPONS.find((weapon) => weapon.name === 'SMG, Small');

    expect(manoeuvreAvailability(blankCharacter('abc'), manoeuvre('Three-Round Burst'), revolver).weaponNeeded).toBe('Needs a ranged weapon that fires bursts or full auto.');
    expect(manoeuvreAvailability(blankCharacter('abc'), manoeuvre('Three-Round Burst'), smg).weaponNeeded).toBeUndefined();
  });
});

describe('Bite', () => {
  test('states what it must follow and is tagged "Prerequisite", but is not unavailable', () => {
    const availability = manoeuvreAvailability(blankCharacter('abc'), manoeuvre('Bite'));

    expect(availability.prerequisite).toBe('After a successful Clinch, Hold or Tackle.');
    expect(availability.unavailable).toBeUndefined();
    expect(availability.tags).toEqual(['Prerequisite']);
  });
});

describe('a manoeuvre with no requirements', () => {
  test('has no tags', () => {
    expect(manoeuvreAvailability(blankCharacter('abc'), manoeuvre('Strike'))).toEqual({ tags: [] });
  });
});

describe('the data', () => {
  test('asks only for powers the Discipline catalogue lists', () => {
    expect(unknownPowers()).toEqual([]);
  });
});
