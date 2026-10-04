import { describe, expect, test } from 'vitest';
import { blankCharacter, displayName, setHeaderField } from './character';
import { HEADER_FIELDS } from './traits';

describe('blankCharacter', () => {
  const character = blankCharacter('abc');

  test('is a version 1 V20 character with the given id', () => {
    expect(character.id).toBe('abc');
    expect(character.system).toBe('v20');
    expect(character.schemaVersion).toBe(1);
  });

  test('has the nine header fields, all empty', () => {
    expect(character.header).toEqual({
      name: '',
      player: '',
      chronicle: '',
      nature: '',
      demeanor: '',
      concept: '',
      clan: '',
      generation: '',
      sire: '',
    });
  });

  test('has nine attributes at 1', () => {
    expect(Object.keys(character.attributes)).toEqual([
      'strength',
      'dexterity',
      'stamina',
      'charisma',
      'manipulation',
      'appearance',
      'perception',
      'intelligence',
      'wits',
    ]);
    expect(Object.values(character.attributes)).toEqual(Array(9).fill(1));
  });

  test('has thirty named abilities at 0', () => {
    expect(Object.keys(character.abilities)).toHaveLength(30);
    expect(Object.values(character.abilities)).toEqual(Array(30).fill(0));
    expect(character.abilities.animalKen).toBe(0);
  });

  test('has one blank custom ability per group', () => {
    expect(character.customAbilities).toEqual({
      talents: { name: '', rating: 0 },
      skills: { name: '', rating: 0 },
      knowledges: { name: '', rating: 0 },
    });
  });

  test('has six blank discipline rows and six blank background rows', () => {
    const sixBlankRows = Array(6).fill({ name: '', rating: 0 });
    expect(character.disciplines).toEqual(sixBlankRows);
    expect(character.backgrounds).toEqual(sixBlankRows);
  });

  test('has three virtues at 1', () => {
    expect(character.virtues).toEqual({ conscience: 1, selfControl: 1, courage: 1 });
  });

  test('has a blank Humanity/Path', () => {
    expect(character.humanity).toEqual({
      pathName: '',
      rating: 0,
      bearing: '',
      bearingModifier: '',
    });
  });

  test('has permanent and temporary Willpower at 0', () => {
    expect(character.willpower).toEqual({ permanent: 0, temporary: 0 });
  });

  test('has an empty Blood Pool and no Blood Per Turn', () => {
    expect(character.bloodPool).toEqual({ current: 0, perTurn: '' });
  });

  test('has seven empty health boxes in sheet order', () => {
    expect(Object.entries(character.health)).toEqual([
      ['bruised', 'empty'],
      ['hurt', 'empty'],
      ['injured', 'empty'],
      ['wounded', 'empty'],
      ['mauled', 'empty'],
      ['crippled', 'empty'],
      ['incapacitated', 'empty'],
    ]);
  });

  test('has empty weakness, experience and notes', () => {
    expect(character.weakness).toBe('');
    expect(character.experience).toBe('');
    expect(character.notes).toBe('');
  });

  test('shares no nested data with another blank character', () => {
    const first = blankCharacter('first');
    const second = blankCharacter('second');

    first.header.name = 'Lucita';
    first.attributes.strength = 5;
    first.customAbilities.talents.name = 'Hobby Talent';
    first.disciplines[0].rating = 3;
    first.disciplines[1].name = 'Dominate';
    first.health.bruised = 'lethal';

    expect(second).toEqual(blankCharacter('second'));
  });

  test('gives each discipline row its own object', () => {
    const [firstRow, secondRow] = blankCharacter('rows').disciplines;
    firstRow.rating = 4;
    expect(secondRow.rating).toBe(0);
  });
});

describe('displayName', () => {
  const named = (name: string) => {
    const character = blankCharacter('abc');
    character.header.name = name;
    return character;
  };

  test("is the character's name", () => {
    expect(displayName(named('Lucita'))).toBe('Lucita');
  });

  test('is a placeholder when the name is empty', () => {
    expect(displayName(blankCharacter('abc'))).toBe('Unnamed character');
  });

  test('is a placeholder when the name is only spaces', () => {
    expect(displayName(named('   '))).toBe('Unnamed character');
  });

  test('drops spaces around the name', () => {
    expect(displayName(named('  Lucita '))).toBe('Lucita');
  });
});

describe('setHeaderField', () => {
  test.each(HEADER_FIELDS.map((field) => field.key))('sets %s', (field) => {
    const updated = setHeaderField(blankCharacter('abc'), field, 'some text');

    expect(updated.header).toEqual({ ...blankCharacter('abc').header, [field]: 'some text' });
  });

  test('leaves the rest of the character as it was', () => {
    const original = blankCharacter('abc');
    original.attributes.strength = 4;

    const updated = setHeaderField(original, 'name', 'Lucita');

    expect(updated).toEqual({ ...original, header: { ...original.header, name: 'Lucita' } });
  });

  test('does not change the character it was given', () => {
    const original = blankCharacter('abc');

    setHeaderField(original, 'name', 'Lucita');

    expect(original).toEqual(blankCharacter('abc'));
  });

  test.each(['banana', 'Not A Real Clan', '', '  spaced  ', '13th', '<b>x</b>'])(
    'keeps %j exactly as given',
    (text) => {
      expect(setHeaderField(blankCharacter('abc'), 'generation', text).header.generation).toBe(text);
    },
  );
});
