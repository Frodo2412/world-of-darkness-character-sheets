import { describe, expect, test } from 'vitest';
import { blankCharacter, type V20Character } from '../character';
import { MANOEUVRES, tagsOf, type Manoeuvre } from './data/manoeuvres';
import { RANGED_WEAPONS } from './data/ranged';
import { MELEE_WEAPONS } from './data/weapons';
import { requirementChecker, requirementText } from './requirements';

const manoeuvre = (name: string): Manoeuvre => MANOEUVRES.find((entry) => entry.name === name)!;
const melee = (name: string) => MELEE_WEAPONS.find((entry) => entry.name === name)!;
const ranged = (name: string) => RANGED_WEAPONS.find((entry) => entry.name === name)!;

function with_(disciplines: [string, number][]): V20Character {
  const character = blankCharacter('abc');
  disciplines.forEach(([name, rating], row) => void (character.disciplines[row] = { name, rating }));
  return character;
}

const readings = (character: V20Character, name: string, weapon?: Parameters<typeof requirementChecker>[1]) =>
  requirementChecker(character, weapon)(manoeuvre(name));

describe('requirement text', () => {
  test('is the book\'s wording', () => {
    expect(readings(with_([]), 'Weapon Strike')[0].text).toBe('A melee weapon');
    expect(readings(with_([]), 'Multiple Shots')[0].text).toBe('A ranged weapon');
    expect(readings(with_([]), 'Three-Round Burst')[0].text).toBe('A ranged weapon capable of bursts and full auto (asterisked on the chart)');
    expect(readings(with_([]), 'Claw')[0].text).toBe('One of: Protean: Feral Claws; Vicissitude: Bonecraft');
    expect(readings(with_([]), 'Bite')[0].text).toBe('A successful Clinch, Hold, or Tackle first');
  });

  test('a single power is named alone and two prior manoeuvres are joined by "or"', () => {
    expect(requirementText({ kind: 'power', anyOf: [{ discipline: 'Protean', power: 'Feral Claws' }] })).toBe('Protean: Feral Claws');
    expect(requirementText({ kind: 'prior', anyOf: ['Clinch', 'Hold'] })).toBe('A successful Clinch or Hold first');
  });

  test('the tags are Weapon required for a weapon and Prerequisite for a power or a prior manoeuvre', () => {
    expect(readings(with_([]), 'Weapon Strike')[0].tag).toBe('Weapon required');
    expect(readings(with_([]), 'Claw')[0].tag).toBe('Prerequisite');
    expect(readings(with_([]), 'Bite')[0].tag).toBe('Prerequisite');
    for (const entry of MANOEUVRES) {
      expect([...new Set(requirementChecker(with_([]))(entry).map(({ tag }) => tag))].sort(), entry.name).toEqual([...tagsOf(entry)].sort());
    }
  });
});

describe('a weapon requirement', () => {
  test('is unmet with no weapon and met by a melee weapon', () => {
    expect(readings(with_([]), 'Weapon Strike')[0].met).toBe(false);
    expect(readings(with_([]), 'Weapon Strike', melee('Sap'))[0].met).toBe(true);
    expect(readings(with_([]), 'Parry', melee('Sword'))[0].met).toBe(true);
  });

  test('a ranged weapon does not meet a melee requirement, nor a melee weapon a ranged one', () => {
    expect(readings(with_([]), 'Weapon Strike', ranged('Rifle'))[0].met).toBe(false);
    expect(readings(with_([]), 'Multiple Shots', melee('Sap'))[0].met).toBe(false);
    expect(readings(with_([]), 'Multiple Shots', ranged('Revolver, Lt.'))[0].met).toBe(true);
  });

  test('bursts and full auto need a weapon the chart marks with an asterisk', () => {
    expect(readings(with_([]), 'Three-Round Burst', ranged('Revolver, Lt.'))[0].met).toBe(false);
    expect(readings(with_([]), 'Three-Round Burst', ranged('SMG, Large'))[0].met).toBe(true);
    expect(readings(with_([]), 'Automatic Fire', ranged('Assault Rifle'))[0].met).toBe(true);
    expect(readings(with_([]), 'Strafing', melee('Sap'))[0].met).toBe(false);
  });
});

describe('a power requirement', () => {
  test.each([
    ['Protean', 1, false],
    ['Protean', 2, true],
    ['Vicissitude', 2, false],
    ['Vicissitude', 3, true],
    ['Presence', 5, false],
  ])('Claw with %s %i is met: %s', (discipline, rating, met) => {
    expect(readings(with_([[discipline, rating]]), 'Claw')[0].met).toBe(met);
  });

  test('either power is enough, and the Discipline\'s name is matched whatever its case', () => {
    expect(readings(with_([['Protean', 1], ['Vicissitude', 3]]), 'Claw')[0].met).toBe(true);
    expect(readings(with_([[' protean ', 2]]), 'Claw')[0].met).toBe(true);
  });
});

describe('a prior manoeuvre requirement', () => {
  test('is never met: the sheet does not know what happened in the scene', () => {
    expect(readings(with_([]), 'Bite', melee('Sap'))[0].met).toBe(false);
  });
});

describe('a manoeuvre with no requirement', () => {
  test('reads nothing', () => {
    expect(readings(with_([]), 'Strike')).toEqual([]);
  });
});
