import { describe, expect, test } from 'vitest';
import { DISCIPLINE_CATALOGUE } from '../../disciplines';
import { ABILITY_KEYS, ATTRIBUTE_KEYS } from '../../traits';
import { MANOEUVRES, tagsOf, type Manoeuvre } from './manoeuvres';

const manoeuvre = (name: string): Manoeuvre => {
  const found = MANOEUVRES.find((entry) => entry.name === name);
  if (!found) throw new Error(`no manoeuvre ${name}`);
  return found;
};

describe('MANOEUVRES', () => {
  test('lists the thirteen close combat and five ranged manoeuvres of the tables on p. 279', () => {
    const names = (section: string) => MANOEUVRES.filter((entry) => entry.section === section).map((entry) => entry.name);

    expect(names('melee')).toEqual([
      'Bite', 'Block', 'Claw', 'Clinch', 'Disarm', 'Dodge', 'Hold', 'Kick', 'Parry', 'Strike', 'Sweep', 'Tackle', 'Weapon Strike',
    ]);
    expect(names('ranged')).toEqual(['Automatic Fire', 'Multiple Shots', 'Strafing', 'Three-Round Burst', 'Two Weapons']);
  });

  test('every manoeuvre has its traits, accuracy, difficulty, damage and a page in chapter nine', () => {
    for (const entry of MANOEUVRES) {
      expect(ATTRIBUTE_KEYS, entry.name).toContain(entry.attribute);
      expect(ABILITY_KEYS, entry.name).toContain(entry.ability);
      if (entry.alternateAbility) expect(ABILITY_KEYS, entry.name).toContain(entry.alternateAbility);
      expect(entry.accuracy === 'special' || Number.isInteger(entry.accuracy), entry.name).toBe(true);
      expect(Number.isInteger(entry.difficulty), entry.name).toBe(true);
      expect(entry.damage.kind, entry.name).toMatch(/^(dice|weapon|special|none)$/);
      expect(Number.isInteger(entry.page), entry.name).toBe(true);
      expect(entry.page, entry.name).toBeGreaterThanOrEqual(274);
      expect(entry.page, entry.name).toBeLessThanOrEqual(281);
    }
    expect(new Set(MANOEUVRES.map((entry) => entry.name)).size).toBe(MANOEUVRES.length);
  });

  test('Strike is Dexterity + Brawl, normal accuracy and difficulty, Strength damage', () => {
    expect(manoeuvre('Strike')).toMatchObject({
      section: 'melee',
      attribute: 'dexterity',
      ability: 'brawl',
      accuracy: 0,
      difficulty: 0,
      damage: { kind: 'dice', dice: { strength: 0 } },
      effects: [],
      requirements: [],
      page: 276,
    });
  });

  test('Kick is at +1 difficulty and Strength +1 damage', () => {
    expect(manoeuvre('Kick')).toMatchObject({
      attribute: 'dexterity',
      ability: 'brawl',
      accuracy: 0,
      difficulty: 1,
      damage: { kind: 'dice', dice: { strength: 1 } },
      page: 276,
    });
  });

  test('Claw is Strength +1 aggravated damage and needs Feral Claws or Bonecraft', () => {
    const claw = manoeuvre('Claw');

    expect(claw).toMatchObject({
      attribute: 'dexterity',
      ability: 'brawl',
      accuracy: 0,
      difficulty: 0,
      damage: { kind: 'dice', dice: { strength: 1 } },
      effects: ['aggravated'],
      page: 276,
    });
    expect(claw.requirements).toEqual([
      {
        kind: 'power',
        anyOf: [
          { discipline: 'Protean', power: 'Feral Claws' },
          { discipline: 'Vicissitude', power: 'Bonecraft' },
        ],
      },
    ]);
    expect(tagsOf(claw)).toEqual(['Prerequisite']);
  });

  test('values the table prints as words stay words, not numbers', () => {
    expect(manoeuvre('Block').accuracy).toBe('special');
    expect(manoeuvre('Disarm').damage).toEqual({ kind: 'special' });
    expect(manoeuvre('Weapon Strike').damage).toEqual({ kind: 'weapon' });
    expect(manoeuvre('Hold').damage).toEqual({ kind: 'none' });
    expect(manoeuvre('Sweep')).toMatchObject({ ability: 'brawl', alternateAbility: 'melee', effects: ['knockdown'] });
    expect(manoeuvre('Two Weapons')).toMatchObject({ difficulty: 1, difficultyNote: 'off-hand' });
  });

  test('ranged manoeuvres carry the table accuracy and difficulty', () => {
    expect(manoeuvre('Automatic Fire')).toMatchObject({ accuracy: 10, difficulty: 2, damage: { kind: 'special' } });
    expect(manoeuvre('Strafing')).toMatchObject({ accuracy: 10, difficulty: 2 });
    expect(manoeuvre('Three-Round Burst')).toMatchObject({ accuracy: 2, difficulty: 1, damage: { kind: 'weapon' } });
  });

  test('tags: a weapon requirement is "Weapon required", a power or prior manoeuvre is "Prerequisite"', () => {
    expect(tagsOf(manoeuvre('Weapon Strike'))).toEqual(['Weapon required']);
    expect(tagsOf(manoeuvre('Bite'))).toEqual(['Prerequisite']);
    expect(tagsOf(manoeuvre('Strike'))).toEqual([]);
  });

  test('every requirement names a real power and real manoeuvres', () => {
    const powers = new Set(DISCIPLINE_CATALOGUE.flatMap((entry) => entry.powers.map((power) => `${entry.name}/${power.name}`)));
    const names = new Set(MANOEUVRES.map((entry) => entry.name));

    for (const entry of MANOEUVRES) {
      for (const requirement of entry.requirements) {
        if (requirement.kind === 'power') {
          for (const { discipline, power } of requirement.anyOf) expect(powers, entry.name).toContain(`${discipline}/${power}`);
        }
        if (requirement.kind === 'prior') {
          for (const prior of requirement.anyOf) expect(names, entry.name).toContain(prior);
        }
        if (requirement.kind === 'weapon') expect(requirement.weapon, entry.name).toBe(entry.section);
      }
    }
  });
});
