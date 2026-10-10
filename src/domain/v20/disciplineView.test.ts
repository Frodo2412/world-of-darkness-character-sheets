import { describe, expect, test } from 'vitest';
import { blankCharacter, type NamedRating, type V20Character } from './character';
import { DISCIPLINE_CATALOGUE } from './disciplines';
import { disciplineView, fieldText, type DisciplineScope } from './disciplineView';

function withDisciplines(...rows: NamedRating[]): V20Character {
  const character = blankCharacter('abc');
  rows.forEach((row, index) => (character.disciplines[index] = row));
  return character;
}

const listed = (character: V20Character, scope: DisciplineScope) => disciplineView(character, scope).disciplines;
const discipline = (character: V20Character, scope: DisciplineScope, name: string) =>
  listed(character, scope).find((candidate) => candidate.name === name)!;
const power = (character: V20Character, name: string, powerName: string) =>
  discipline(character, 'all', name).powers.find((candidate) => candidate.name === powerName)!;

describe('the Owned list', () => {
  test('holds the named Disciplines rated 1 or more, in the order stored', () => {
    const character = withDisciplines({ name: 'Presence', rating: 3 }, { name: 'Dominate', rating: 0 }, { name: 'Auspex', rating: 2 });
    expect(listed(character, 'owned').map((entry) => entry.name)).toEqual(['Presence', 'Auspex']);
  });

  test('counts the Disciplines rated 1 or more, whichever list is shown', () => {
    const character = withDisciplines({ name: 'Presence', rating: 3 }, { name: 'Dominate', rating: 0 }, { name: 'Celerity', rating: 1 });
    expect(disciplineView(character, 'owned').ownedCount).toBe(2);
    expect(disciplineView(character, 'all').ownedCount).toBe(2);
  });

  test('is empty for a character with no named Disciplines', () => {
    expect(disciplineView(blankCharacter('abc'), 'owned')).toEqual({ disciplines: [], ownedCount: 0 });
  });

  test('lists a Discipline the catalogue does not know, with its name and rating and no powers', () => {
    const [homebrewed] = listed(withDisciplines({ name: 'Homebrewed', rating: 2 }), 'owned');
    expect(homebrewed).toMatchObject({ name: 'Homebrewed', ratingText: '2 / 5', unlockedText: '2 levels unlocked', powers: [] });
  });

  test('names a Discipline as the catalogue does, whatever case and spacing the player used', () => {
    const [entry] = listed(withDisciplines({ name: '  dominate ', rating: 1 }), 'owned');
    expect(entry.name).toBe('Dominate');
    expect(entry.powers).toHaveLength(5);
  });

  test('counts a Discipline named twice once, at its higher rating', () => {
    const view = disciplineView(withDisciplines({ name: 'Auspex', rating: 1 }, { name: 'auspex', rating: 3 }), 'owned');
    expect(view.ownedCount).toBe(1);
    expect(view.disciplines[0]).toMatchObject({ name: 'Auspex', rating: 3 });
  });
});

describe('the rating and the levels it unlocks', () => {
  test('the rating reads "N / 5" and the levels are counted in dots', () => {
    const character = withDisciplines({ name: 'Presence', rating: 3 }, { name: 'Auspex', rating: 2 });
    expect(discipline(character, 'owned', 'Presence')).toMatchObject({ ratingText: '3 / 5', unlockedText: '3 levels unlocked' });
    expect(discipline(character, 'owned', 'Auspex')).toMatchObject({ ratingText: '2 / 5', unlockedText: '2 levels unlocked' });
  });

  test('one level is singular', () => {
    expect(discipline(withDisciplines({ name: 'Presence', rating: 1 }), 'owned', 'Presence').unlockedText).toBe('1 level unlocked');
  });

  test('levels count even when the catalogue lists no powers', () => {
    const character = withDisciplines({ name: 'Celerity', rating: 1 });
    expect(discipline(character, 'owned', 'Celerity')).toMatchObject({ unlockedText: '1 level unlocked', powers: [] });
    expect(discipline(withDisciplines({ name: 'Celerity', rating: 3 }), 'owned', 'Celerity')).toMatchObject({
      unlockedText: '3 levels unlocked',
      powers: [],
    });
  });

  test('a rating above 5 unlocks 5 levels', () => {
    expect(discipline(withDisciplines({ name: 'Presence', rating: 7 }), 'owned', 'Presence').unlockedText).toBe('5 levels unlocked');
  });

  test('keeps the catalogue note of a Discipline that lists no powers', () => {
    expect(discipline(withDisciplines({ name: 'Celerity', rating: 1 }), 'owned', 'Celerity').note).toBe(
      'Each dot adds a die to Dexterity pools, or 1 blood buys an extra action',
    );
  });
});

describe('the powers of a Discipline', () => {
  const presence3 = withDisciplines({ name: 'Presence', rating: 3 });

  test('are in level order, Known up to the rating and Locked above it', () => {
    const powers = discipline(presence3, 'owned', 'Presence').powers;
    expect(powers.map(({ name, level, state }) => [name, level, state])).toEqual([
      ['Awe', 1, 'known'],
      ['Dread Gaze', 2, 'known'],
      ['Entrancement', 3, 'known'],
      ['Summon', 4, 'locked'],
      ['Majesty', 5, 'locked'],
    ]);
  });

  test('a Locked power says what it requires, in the words of its own prerequisite', () => {
    const powers = discipline(presence3, 'owned', 'Presence').powers;
    expect(powers[3].requirement).toBe('Requires Presence 4');
    expect(powers[4].requirement).toBe('Requires Presence 5');
    expect(powers[0].requirement).toBeUndefined();
  });

  test('a Known power that rolls carries the character\'s pool, less the wound', () => {
    const character = withDisciplines({ name: 'Presence', rating: 1 });
    character.attributes.charisma = 3;
    character.abilities.performance = 3;
    character.health.hurt = 'lethal';
    const awe = discipline(character, 'owned', 'Presence').powers[0];
    expect(awe.rolls).toBe('Charisma + Performance');
    expect(awe.pool).toMatchObject({ total: 5, woundPenalty: 1 });
  });

  test('a Locked power names its roll but has no pool', () => {
    const summon = discipline(presence3, 'owned', 'Presence').powers[3];
    expect(summon.rolls).toBe('Charisma + Subterfuge');
    expect(summon.pool).toBeUndefined();
  });

  test('a Known power that uses no roll has neither a roll nor a pool', () => {
    const eyes = discipline(withDisciplines({ name: 'Protean', rating: 1 }), 'owned', 'Protean').powers[0];
    expect(eyes).toMatchObject({ name: 'Eyes of the Beast', state: 'known' });
    expect(eyes.rolls).toBeUndefined();
    expect(eyes.pool).toBeUndefined();
    expect(eyes.rule.note).toBe('No roll');
  });

  test('every catalogued power has a prerequisite of its own, so no Locked power is left without words', () => {
    for (const entry of listed(blankCharacter('abc'), 'all')) {
      for (const locked of entry.powers) expect(locked.requirement, `${entry.name} ${locked.name}`).toMatch(/^Requires \S/);
    }
    expect(DISCIPLINE_CATALOGUE.flatMap((entry) => entry.powers).every((entry) => entry.prerequisite !== undefined)).toBe(true);
  });
});

describe('a Discipline rated 0', () => {
  const character = withDisciplines({ name: 'Dominate', rating: 0 });

  test('is listed under All with its name and rating and no powers', () => {
    expect(discipline(character, 'all', 'Dominate')).toMatchObject({ ratingText: '0 / 5', unlockedText: '0 levels unlocked', powers: [] });
  });

  test('is not in Owned', () => {
    expect(listed(character, 'owned')).toEqual([]);
  });
});

describe('the All list', () => {
  test('holds all seventeen Disciplines when the character has none', () => {
    const all = listed(blankCharacter('abc'), 'all');
    expect(all).toHaveLength(17);
    expect(all.map((entry) => entry.name)).toEqual(DISCIPLINE_CATALOGUE.map((entry) => entry.name));
  });

  test('shows a Discipline the character lacks with every power Locked', () => {
    const animalism = discipline(blankCharacter('abc'), 'all', 'Animalism');
    expect(animalism).toMatchObject({ ratingText: '0 / 5' });
    expect(animalism.powers).toHaveLength(5);
    expect(animalism.powers.every((entry) => entry.state === 'locked')).toBe(true);
    expect(animalism.powers[0].requirement).toBe('Requires Animalism 1');
  });

  test('puts the character\'s rating on its Discipline, and a Discipline the catalogue does not know after the seventeen', () => {
    const character = withDisciplines({ name: 'Presence', rating: 3 }, { name: 'Homebrewed', rating: 2 });
    const all = listed(character, 'all');
    expect(all).toHaveLength(18);
    expect(all.at(-1)).toMatchObject({ name: 'Homebrewed', ratingText: '2 / 5' });
    expect(discipline(character, 'all', 'Presence')).toMatchObject({ ratingText: '3 / 5' });
    expect(power(character, 'Presence', 'Awe').state).toBe('known');
    expect(power(character, 'Presence', 'Summon').state).toBe('locked');
  });
});

describe('fieldText', () => {
  const awe = power(blankCharacter('abc'), 'Presence', 'Awe').rule;
  const eyes = power(blankCharacter('abc'), 'Protean', 'Eyes of the Beast').rule;

  test('gives the value as the data states it', () => {
    expect(fieldText(awe, 'duration')).toBe('Remainder of the scene or until the character chooses to drop it');
    expect(fieldText(awe, 'cost')).toBe('1 blood point');
    expect(fieldText(awe, 'difficulty')).toBe('7');
    expect(fieldText(awe, 'prerequisite')).toBe('Presence 1');
  });

  test('says where to look when the data leaves the field undefined', () => {
    expect(fieldText(eyes, 'duration')).toBe('See rulebook (V20 p. 199)');
    expect(fieldText(eyes, 'difficulty')).toBe('See rulebook (V20 p. 199)');
  });
});
