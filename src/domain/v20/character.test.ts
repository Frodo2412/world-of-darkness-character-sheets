import { describe, expect, test } from 'vitest';
import {
  activateRating,
  blankCharacter,
  displayName,
  setHeaderField,
  setTrait,
  traitValue,
} from './character';
import { HEADER_FIELDS, RATING_RANGE, VIRTUE_RANGE, rangeOf, type TraitRef } from './traits';

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

describe('activateRating', () => {
  test.each([
    { current: 1, position: 4, expected: 4, why: 'a higher position sets that rating' },
    { current: 4, position: 2, expected: 2, why: 'a lower position sets that rating' },
    { current: 4, position: 4, expected: 3, why: 'the current position lowers the rating by one' },
    { current: 1, position: 1, expected: 0, why: 'the current position at 1 reaches zero' },
    { current: 0, position: 1, expected: 1, why: 'the first position from zero gives 1' },
    { current: 9, position: 10, expected: 10, why: 'the last position gives the maximum' },
    { current: 10, position: 10, expected: 9, why: 'the current position at the maximum lowers it' },
    { current: 5, position: 11, expected: 10, why: 'a position past the maximum stops at the maximum' },
    { current: 5, position: -1, expected: 0, why: 'a negative position stops at zero' },
    { current: 0, position: 0, expected: 0, why: 'position zero at zero stays at zero' },
    { current: 5, position: 0, expected: 0, why: 'position zero clears the rating' },
    { current: 5, position: Number.NaN, expected: 0, why: 'a position that is not a number gives zero' },
    { current: 5, position: 3.9, expected: 3, why: 'a fractional position is cut to a whole dot' },
  ])('$why', ({ current, position, expected }) => {
    expect(activateRating(current, position, RATING_RANGE)).toBe(expected);
  });

  test('stops at 5 in a virtue range', () => {
    expect(activateRating(1, 6, VIRTUE_RANGE)).toBe(5);
    expect(activateRating(5, 5, VIRTUE_RANGE)).toBe(4);
  });
});

describe('rangeOf', () => {
  test.each<[TraitRef, number]>([
    ['attributes.strength', 10],
    ['abilities.brawl', 10],
    ['virtues.courage', 5],
    ['humanity.rating', 10],
    ['willpower.permanent', 10],
  ])('%s runs from 0 to %i', (trait, max) => {
    expect(rangeOf(trait)).toEqual({ min: 0, max });
  });
});

describe('setTrait', () => {
  test.each<[TraitRef, (character: ReturnType<typeof blankCharacter>) => number]>([
    ['attributes.strength', (character) => character.attributes.strength],
    ['abilities.animalKen', (character) => character.abilities.animalKen],
    ['virtues.selfControl', (character) => character.virtues.selfControl],
    ['humanity.rating', (character) => character.humanity.rating],
    ['willpower.permanent', (character) => character.willpower.permanent],
  ])('sets %s', (trait, read) => {
    const updated = setTrait(blankCharacter('abc'), trait, 4);

    expect(read(updated)).toBe(4);
    expect(traitValue(updated, trait)).toBe(4);
  });

  test('leaves every other value as it was', () => {
    const original = blankCharacter('abc');

    const updated = setTrait(original, 'humanity.rating', 7);

    expect(updated).toEqual({ ...original, humanity: { ...original.humanity, rating: 7 } });
  });

  test('does not change the character it was given', () => {
    const original = blankCharacter('abc');

    setTrait(original, 'attributes.strength', 5);

    expect(original).toEqual(blankCharacter('abc'));
  });

  test.each<[TraitRef, number, number]>([
    ['attributes.strength', 0, 0],
    ['attributes.strength', 10, 10],
    ['attributes.strength', 11, 10],
    ['attributes.strength', -1, 0],
    ['abilities.brawl', 11, 10],
    ['virtues.courage', 5, 5],
    ['virtues.courage', 6, 5],
    ['virtues.courage', -1, 0],
    ['humanity.rating', 11, 10],
    ['willpower.permanent', 11, 10],
  ])('%s set to %i is stored as %i', (trait, value, stored) => {
    const [section, key] = trait.split('.');
    const updated = setTrait(blankCharacter('abc'), trait, value) as unknown as Record<
      string,
      Record<string, number>
    >;

    expect(updated[section][key]).toBe(stored);
  });

  test('accepts every attribute at 10, whatever the generation', () => {
    let character = setHeaderField(blankCharacter('abc'), 'generation', '13');
    for (const key of Object.keys(character.attributes)) {
      character = setTrait(character, `attributes.${key}` as TraitRef, 10);
    }

    expect(Object.values(character.attributes)).toEqual(Array(9).fill(10));
  });
});
