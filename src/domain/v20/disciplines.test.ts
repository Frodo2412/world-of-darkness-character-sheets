import { describe, expect, test } from 'vitest';
import { blankCharacter, setTrait, type NamedRating, type V20Character } from './character';
import { DISCIPLINE_CATALOGUE, disciplineReadings } from './disciplines';
import { DISCIPLINES } from './creation/rules';
import { ABILITY_KEYS, ATTRIBUTE_KEYS } from './traits';

function withDisciplines(...rows: NamedRating[]): V20Character {
  const character = blankCharacter('abc');
  rows.forEach((row, index) => (character.disciplines[index] = row));
  return character;
}

describe('DISCIPLINE_CATALOGUE', () => {
  test('covers every Discipline the builder offers', () => {
    expect(DISCIPLINE_CATALOGUE.map((entry) => entry.name)).toEqual([...DISCIPLINES]);
  });

  test('every Discipline has five powers, or a note in their place', () => {
    for (const entry of DISCIPLINE_CATALOGUE) {
      if (entry.powers.length === 0) expect(entry.note, entry.name).toBeTruthy();
      else expect(entry.powers, entry.name).toHaveLength(5);
    }
  });

  test('every power rolls a real attribute and ability, or says what it uses instead', () => {
    for (const power of DISCIPLINE_CATALOGUE.flatMap((entry) => entry.powers)) {
      if (power.roll === undefined) {
        expect(power.note, power.name).toBeTruthy();
        continue;
      }
      expect(ATTRIBUTE_KEYS, power.name).toContain(power.roll[0]);
      expect(ABILITY_KEYS, power.name).toContain(power.roll[1]);
    }
  });
});

const RULE_FIELDS = ['cost', 'duration', 'prerequisite', 'difficulty', 'summary'] as const;

/** The Disciplines whose rule fields have been read from V20 chapter four. */
const EXTRACTED = [
  'Animalism',
  'Auspex',
  'Chimerstry',
  'Dementation',
  'Dominate',
  'Obfuscate',
  'Obtenebration',
  'Presence',
];

const extractedEntries = () => DISCIPLINE_CATALOGUE.filter((entry) => EXTRACTED.includes(entry.name));

describe('Discipline rule data', () => {
  test('Presence has five powers, in level order', () => {
    const presence = DISCIPLINE_CATALOGUE.find((entry) => entry.name === 'Presence');

    expect(presence?.powers.map((power) => power.name)).toEqual(['Awe', 'Dread Gaze', 'Entrancement', 'Summon', 'Majesty']);
  });

  test("Awe's fields are as the book states them", () => {
    const awe = DISCIPLINE_CATALOGUE.find((entry) => entry.name === 'Presence')?.powers[0];

    expect(awe).toMatchObject({
      roll: ['charisma', 'performance'],
      cost: '1 blood point',
      duration: 'Remainder of the scene or until the character chooses to drop it',
      prerequisite: 'Presence 1',
      difficulty: '7',
      page: 193,
    });
    expect(awe?.summary).toMatch(/^Those near the vampire suddenly desire to be closer/);
  });

  test('a field the book does not state is undefined, never an empty string', () => {
    for (const entry of DISCIPLINE_CATALOGUE) {
      for (const power of entry.powers) {
        for (const field of RULE_FIELDS) {
          const value = power[field];
          if (value !== undefined) expect(value.trim(), `${entry.name} ${power.name} ${field}`).not.toBe('');
        }
      }
    }
    const dreadGaze = DISCIPLINE_CATALOGUE.find((entry) => entry.name === 'Presence')?.powers[1];
    expect(Object.keys(dreadGaze ?? {})).not.toContain('duration');
  });

  test('every power read from the book has a page in chapter four and names its Discipline and level', () => {
    for (const entry of extractedEntries()) {
      entry.powers.forEach((power, index) => {
        const label = `${entry.name} ${power.name}`;
        expect(Number.isInteger(power.page), label).toBe(true);
        expect(power.page, label).toBeGreaterThanOrEqual(126);
        expect(power.page, label).toBeLessThanOrEqual(243);
        expect(power.prerequisite, label).toBe(`${entry.name} ${index + 1}`);
      });
      const pages = entry.powers.map((power) => power.page ?? 0);
      expect(pages, `${entry.name} pages in level order`).toEqual([...pages].sort((a, b) => a - b));
    }
  });
});

describe('disciplineReadings', () => {
  test('lists the powers a rating reaches, in level order, each with its dice pool', () => {
    let character = withDisciplines({ name: 'Presence', rating: 3 });
    character = setTrait(character, 'attributes.charisma', 3);
    character = setTrait(character, 'attributes.appearance', 3);
    character = setTrait(character, 'abilities.performance', 3);
    character = setTrait(character, 'abilities.intimidation', 1);
    character = setTrait(character, 'abilities.empathy', 2);
    character = { ...character, health: { ...character.health, hurt: 'lethal' } };

    const [presence] = disciplineReadings(character);

    expect(presence).toMatchObject({ name: 'Presence', rating: 3 });
    expect(presence.powers.map((power) => [power.level, power.name, power.pool?.total])).toEqual([
      [1, 'Awe', 5],
      [2, 'Dread Gaze', 3],
      [3, 'Entrancement', 4],
    ]);
    expect(presence.powers[0].pool).toMatchObject({
      attribute: { label: 'Charisma', rating: 3 },
      ability: { label: 'Performance', rating: 3 },
      woundPenalty: 1,
    });
  });

  test('a rating above 5 lists the five powers there are', () => {
    const [dominate] = disciplineReadings(withDisciplines({ name: 'Dominate', rating: 7 }));

    expect(dominate.powers).toHaveLength(5);
  });

  test('a power with no attribute + ability roll has a note and no pool', () => {
    const [auspex] = disciplineReadings(withDisciplines({ name: 'Auspex', rating: 1 }));

    expect(auspex.powers).toEqual([{ name: 'Heightened Senses', level: 1, note: 'No roll' }]);
  });

  test('a power with a second way to roll it has its pool and a note', () => {
    const [animalism] = disciplineReadings(withDisciplines({ name: 'Animalism', rating: 3 }));

    expect(animalism.powers[2]).toMatchObject({ name: 'Quell the Beast', note: 'or Manipulation + Empathy' });
    expect(animalism.powers[2].pool?.attribute?.label).toBe('Manipulation');
  });

  test('a Discipline without a power list has its note', () => {
    const [celerity] = disciplineReadings(withDisciplines({ name: 'Celerity', rating: 1 }));

    expect(celerity.powers).toEqual([]);
    expect(celerity.note).toBeTruthy();
  });

  test('matches the name whatever its case and spacing, and shows it as written', () => {
    const [reading] = disciplineReadings(withDisciplines({ name: '  dominate ', rating: 1 }));

    expect(reading.name).toBe('dominate');
    expect(reading.powers.map((power) => power.name)).toEqual(['Command']);
  });

  test('a Discipline the catalogue does not know, or one rated 0, has its name and rating only', () => {
    const readings = disciplineReadings(
      withDisciplines({ name: 'Flight', rating: 1 }, { name: 'Presence', rating: 0 }, { name: '   ', rating: 2 }),
    );

    expect(readings).toEqual([
      { name: 'Flight', rating: 1, powers: [] },
      { name: 'Presence', rating: 0, powers: [] },
    ]);
  });
});
