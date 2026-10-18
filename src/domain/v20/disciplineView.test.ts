import { describe, expect, test } from 'vitest';
import { blankCharacter, setTrait, type NamedRating, type V20Character } from './character';
import { DISCIPLINE_CATALOGUE, type Power } from './disciplines';
import { disciplineView, fieldText, type DisciplineView } from './disciplineView';

function withDisciplines(...rows: NamedRating[]): V20Character {
  const character = blankCharacter('abc');
  rows.forEach((row, index) => (character.disciplines[index] = row));
  return character;
}

const owned = (character: V20Character, name: string): DisciplineView => {
  const found = disciplineView(character).owned.find((view) => view.name === name);
  if (!found) throw new Error(`no owned view for ${name}`);
  return found;
};

describe('disciplineView owned list', () => {
  test('gives two rows of the same Discipline their own keys, so neither hides the other', () => {
    const character = withDisciplines({ name: 'Auspex', rating: 2 }, { name: 'Presence', rating: 1 }, { name: 'Auspex', rating: 4 });

    const views = disciplineView(character).owned;

    expect(views.map((view) => view.key)).toEqual(['Auspex', 'Presence', 'Auspex (2)']);
    expect(new Set(views.map((view) => view.key)).size).toBe(3);
    expect(disciplineView(character).all.map((view) => view.key)).toEqual(disciplineView(character).all.map((view) => view.name));
  });

  test('lists the named Disciplines in the order stored, with rating and levels unlocked', () => {
    const character = withDisciplines({ name: 'Presence', rating: 3 }, { name: 'Auspex', rating: 2 }, { name: 'Celerity', rating: 1 });

    const views = disciplineView(character).owned;

    expect(views.map((view) => [view.name, view.rating, view.unlocked])).toEqual([
      ['Presence', 3, '3 levels unlocked'],
      ['Auspex', 2, '2 levels unlocked'],
      ['Celerity', 1, '1 level unlocked'],
    ]);
  });

  test('draws five dots, or ten once the rating is above five', () => {
    const character = withDisciplines({ name: 'Presence', rating: 5 }, { name: 'Dominate', rating: 7 });

    expect(disciplineView(character).owned.map((view) => view.dots)).toEqual([5, 10]);
  });

  test('lists the powers in level order, Known up to the rating and Locked above it', () => {
    const presence = owned(withDisciplines({ name: 'Presence', rating: 3 }), 'Presence');

    expect(presence.powers.map((power) => [power.level, power.name, power.state])).toEqual([
      [1, 'Awe', 'known'],
      [2, 'Dread Gaze', 'known'],
      [3, 'Entrancement', 'known'],
      [4, 'Summon', 'locked'],
      [5, 'Majesty', 'locked'],
    ]);
  });

  test('a Locked power says what it requires; a Known one says nothing', () => {
    const presence = owned(withDisciplines({ name: 'Presence', rating: 3 }), 'Presence');

    expect(presence.powers.map((power) => power.requires)).toEqual([
      undefined,
      undefined,
      undefined,
      'Requires Presence 4',
      'Requires Presence 5',
    ]);
  });

  test('matches the catalogue however the name is cased or spaced', () => {
    const view = owned(withDisciplines({ name: '  pre sence', rating: 0 }, { name: ' presence ', rating: 2 }), 'presence');

    expect(view.powers).toHaveLength(5);
    expect(view.powers.filter((power) => power.state === 'known')).toHaveLength(2);
  });

  test('a Discipline rated 0 shows its name and rating and no powers', () => {
    const dominate = owned(withDisciplines({ name: 'Dominate', rating: 0 }), 'Dominate');

    expect(dominate).toMatchObject({ rating: 0, unlocked: '0 levels unlocked', powers: [] });
  });

  test('a Discipline the catalogue does not know shows its name and rating and no powers', () => {
    const homebrewed = owned(withDisciplines({ name: 'Homebrewed', rating: 2 }), 'Homebrewed');

    expect(homebrewed).toMatchObject({ rating: 2, powers: [] });
    expect(homebrewed.note).toBeUndefined();
  });

  test('a Discipline whose powers are learned by path or that adds dice shows its note and no powers', () => {
    const celerity = owned(withDisciplines({ name: 'Celerity', rating: 2 }), 'Celerity');

    expect(celerity.powers).toEqual([]);
    expect(celerity.note).toMatch(/Dexterity/);
  });

  test('skips unnamed rows', () => {
    expect(disciplineView(withDisciplines({ name: '   ', rating: 3 })).owned).toEqual([]);
  });
});

describe('a Known power that rolls', () => {
  test("carries the character's pool with its formula", () => {
    const character = withDisciplines({ name: 'Presence', rating: 3 });
    character.attributes.charisma = 3;
    character.abilities.performance = 3;
    character.health.hurt = 'lethal';

    const awe = owned(character, 'Presence').powers[0];

    expect(awe.yourPool).toEqual({
      dice: 5,
      text: 'Your pool: 5 dice',
      formula: 'Charisma 3 + Performance 3 − wound 1',
      incapacitated: false,
    });
    expect(awe.selection).toEqual({ attribute: 'attributes.charisma', ability: 'abilities.performance' });
    expect(awe.rolls).toBe(true);
    expect(awe.poolRule).toBe('Charisma + Performance');
  });

  test('says "1 die" for a pool of one', () => {
    const character = withDisciplines({ name: 'Presence', rating: 1 });
    character.attributes.charisma = 1;
    character.abilities.performance = 0;

    expect(owned(character, 'Presence').powers[0].yourPool?.text).toBe('Your pool: 1 die');
  });

  test('is floored at zero by a heavy wound', () => {
    const character = withDisciplines({ name: 'Presence', rating: 1 });
    character.attributes.charisma = 1;
    character.abilities.performance = 0;
    character.health.crippled = 'lethal';

    expect(owned(character, 'Presence').powers[0].yourPool).toMatchObject({ dice: 0, text: 'Your pool: 0 dice', incapacitated: false });
  });

  test('is zero, and says so, when the character is incapacitated', () => {
    const character = withDisciplines({ name: 'Presence', rating: 1 });
    character.attributes.charisma = 4;
    character.abilities.performance = 4;
    character.health.incapacitated = 'lethal';

    expect(owned(character, 'Presence').powers[0].yourPool).toMatchObject({ dice: 0, incapacitated: true });
  });

  test('follows a changed rating', () => {
    const character = setTrait(withDisciplines({ name: 'Presence', rating: 3 }), 'attributes.charisma', 5);

    expect(owned(character, 'Presence').powers[0].yourPool?.formula).toMatch(/^Charisma 5 /);
  });
});

describe('a Locked power', () => {
  test('shows its rules and the dice pool as the rules name it, but has no pool and no selection', () => {
    const summon = owned(withDisciplines({ name: 'Presence', rating: 3 }), 'Presence').powers[3];

    expect(summon.state).toBe('locked');
    expect(summon.poolRule).toBe('Charisma + Subterfuge');
    expect(summon.cost).toBe('1 blood point');
    expect(summon.yourPool).toBeUndefined();
    expect(summon.selection).toBeUndefined();
  });
});

describe('a power that has no attribute + ability roll', () => {
  test('says what it uses instead, and offers no pool or selection', () => {
    const senses = owned(withDisciplines({ name: 'Auspex', rating: 1 }), 'Auspex').powers[0];

    expect(senses).toMatchObject({ name: 'Heightened Senses', state: 'known', rolls: false, usesInstead: 'No roll', poolRule: 'No roll' });
    expect(senses.yourPool).toBeUndefined();
    expect(senses.selection).toBeUndefined();
  });

  test('a power with a roll keeps the book\'s alternative beside it and uses nothing instead', () => {
    const quell = owned(withDisciplines({ name: 'Animalism', rating: 3 }), 'Animalism').powers[2];

    expect(quell.poolRule).toBe('Manipulation + Intimidation or Manipulation + Empathy');
    expect(quell.usesInstead).toBeUndefined();
    expect(quell.yourPool).toBeDefined();
  });
});

describe('fieldText', () => {
  const power = (overrides: Partial<Power>): Power => ({ name: 'Test', page: 211, ...overrides });

  test('is the value the catalogue holds', () => {
    expect(fieldText(power({ cost: '1 blood point' }), 'cost')).toBe('1 blood point');
  });

  test('points to the rulebook page when the catalogue holds no clean value', () => {
    expect(fieldText(power({}), 'duration')).toBe('See rulebook (V20 p. 211)');
    expect(fieldText(power({}), 'summary')).toBe('See rulebook (V20 p. 211)');
  });

  test('is the same for every rule field', () => {
    for (const field of ['cost', 'duration', 'prerequisite', 'difficulty', 'summary'] as const) {
      expect(fieldText(power({}), field)).toBe('See rulebook (V20 p. 211)');
    }
  });

  test('a power view uses it for every field and gives the reference', () => {
    const dread = owned(withDisciplines({ name: 'Presence', rating: 2 }), 'Presence').powers[1];

    expect(dread.duration).toBe('See rulebook (V20 p. 194)');
    expect(dread.reference).toBe('V20 p. 194');
  });
});

describe('disciplineView all list', () => {
  test('lists the seventeen catalogued Disciplines in catalogue order', () => {
    const all = disciplineView(blankCharacter('abc')).all;

    expect(all).toHaveLength(17);
    expect(all.map((view) => view.name)).toEqual(DISCIPLINE_CATALOGUE.map((entry) => entry.name));
  });

  test('a Discipline the character lacks is rated 0 with every power Locked', () => {
    const dominate = disciplineView(withDisciplines({ name: 'Presence', rating: 3 })).all.find((view) => view.name === 'Dominate')!;

    expect(dominate.rating).toBe(0);
    expect(dominate.powers).toHaveLength(5);
    expect(dominate.powers.every((power) => power.state === 'locked' && power.yourPool === undefined)).toBe(true);
    expect(dominate.powers[0].requires).toBe('Requires Dominate 1');
  });

  test("a Discipline the character has shows the character's rating and Known powers", () => {
    const presence = disciplineView(withDisciplines({ name: 'presence', rating: 2 })).all.find((view) => view.name === 'Presence')!;

    expect(presence.rating).toBe(2);
    expect(presence.powers.filter((power) => power.state === 'known').map((power) => power.name)).toEqual(['Awe', 'Dread Gaze']);
  });

  test('does not list a Discipline the catalogue does not know', () => {
    const all = disciplineView(withDisciplines({ name: 'Homebrewed', rating: 2 })).all;

    expect(all.some((view) => view.name === 'Homebrewed')).toBe(false);
  });
});
