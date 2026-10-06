import { describe, expect, test } from 'vitest';
import {
  activateRating,
  blankCharacter,
  cycleHealthBox,
  displayName,
  namedCustomAbility,
  namedRow,
  namedRows,
  setHeaderField,
  setNamedRow,
  setSpecialty,
  setText,
  specialtyOf,
  specialtyText,
  textValue,
  setTrait,
  traitValue,
} from './character';
import {
  HEADER_FIELDS,
  HEALTH_LEVELS,
  RATING_RANGE,
  VIRTUE_RANGE,
  rangeOf,
  type TextRef,
  type TraitRef,
} from './traits';

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
    ['willpower.temporary', 10],
    ['bloodPool.current', 50],
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
    ['willpower.temporary', 10, 10],
    ['willpower.temporary', 11, 10],
    ['willpower.temporary', -1, 0],
    ['bloodPool.current', 50, 50],
    ['bloodPool.current', 51, 50],
    ['bloodPool.current', -1, 0],
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

describe('setNamedRow', () => {
  test('names a custom ability', () => {
    const updated = setNamedRow(blankCharacter('abc'), 'customAbilities.talents', {
      name: 'Hobby Talent',
    });

    expect(updated.customAbilities.talents).toEqual({ name: 'Hobby Talent', rating: 0 });
    expect(namedRow(updated, 'customAbilities.talents')).toEqual({
      name: 'Hobby Talent',
      rating: 0,
    });
  });

  test('rates a custom ability without changing its name', () => {
    const named = setNamedRow(blankCharacter('abc'), 'customAbilities.skills', { name: 'Sailing' });

    const updated = setNamedRow(named, 'customAbilities.skills', { rating: 2 });

    expect(updated.customAbilities.skills).toEqual({ name: 'Sailing', rating: 2 });
  });

  test('renames a custom ability without changing its rating', () => {
    const rated = setNamedRow(blankCharacter('abc'), 'customAbilities.skills', { rating: 3 });

    const updated = setNamedRow(rated, 'customAbilities.skills', { name: 'Sailing' });

    expect(updated.customAbilities.skills).toEqual({ name: 'Sailing', rating: 3 });
  });

  test('a name can be cleared', () => {
    const named = setNamedRow(blankCharacter('abc'), 'customAbilities.skills', { name: 'Sailing' });

    expect(setNamedRow(named, 'customAbilities.skills', { name: '' }).customAbilities.skills.name).toBe(
      '',
    );
  });

  test.each([
    [11, 10],
    [10, 10],
    [0, 0],
    [-1, 0],
  ])('a rating of %i is stored as %i', (rating, stored) => {
    const updated = setNamedRow(blankCharacter('abc'), 'customAbilities.knowledges', { rating });

    expect(updated.customAbilities.knowledges.rating).toBe(stored);
  });

  test('leaves the other groups and the rest of the character as they were', () => {
    const original = blankCharacter('abc');

    const updated = setNamedRow(original, 'customAbilities.talents', { name: 'Hobby Talent' });

    expect(updated).toEqual({
      ...original,
      customAbilities: {
        ...original.customAbilities,
        talents: { name: 'Hobby Talent', rating: 0 },
      },
    });
  });

  test('does not change the character it was given', () => {
    const original = blankCharacter('abc');

    setNamedRow(original, 'customAbilities.talents', { name: 'Hobby Talent', rating: 2 });

    expect(original).toEqual(blankCharacter('abc'));
  });
});

describe('setNamedRow on disciplines and backgrounds', () => {
  test('names and rates one discipline row', () => {
    const updated = setNamedRow(blankCharacter('abc'), 'disciplines.0', {
      name: 'Dominate',
      rating: 3,
    });

    expect(updated.disciplines).toEqual([
      { name: 'Dominate', rating: 3 },
      ...Array(5).fill({ name: '', rating: 0 }),
    ]);
    expect(namedRow(updated, 'disciplines.0')).toEqual({ name: 'Dominate', rating: 3 });
  });

  test('changes the last background row and no other', () => {
    const updated = setNamedRow(blankCharacter('abc'), 'backgrounds.5', {
      name: 'Resources',
      rating: 2,
    });

    expect(updated.backgrounds).toEqual([
      ...Array(5).fill({ name: '', rating: 0 }),
      { name: 'Resources', rating: 2 },
    ]);
    expect(updated.disciplines).toEqual(blankCharacter('abc').disciplines);
  });

  test.each([
    [11, 10],
    [-1, 0],
  ])('a discipline rating of %i is stored as %i', (rating, stored) => {
    expect(setNamedRow(blankCharacter('abc'), 'disciplines.2', { rating }).disciplines[2].rating).toBe(
      stored,
    );
  });

  test.each(['disciplines.6', 'backgrounds.-1', 'disciplines.x'] as const)(
    '%s is not a row on the sheet, so nothing changes',
    (row) => {
      const original = blankCharacter('abc');

      expect(setNamedRow(original, row as never, { name: 'Dominate' })).toEqual(original);
      expect(namedRow(original, row as never)).toBeUndefined();
    },
  );

  test('does not change the character it was given', () => {
    const original = blankCharacter('abc');

    setNamedRow(original, 'disciplines.0', { name: 'Dominate', rating: 3 });

    expect(original).toEqual(blankCharacter('abc'));
  });
});

describe('setText', () => {
  test.each<TextRef>([
    'header.name',
    'header.sire',
    'humanity.pathName',
    'humanity.bearing',
    'humanity.bearingModifier',
    'bloodPool.perTurn',
    'weakness',
    'experience',
    'notes',
  ])('sets %s', (field) => {
    const updated = setText(blankCharacter('abc'), field, 'some text');

    expect(textValue(updated, field)).toBe('some text');
  });

  test('records a path with its bearing and modifier, leaving the rating alone', () => {
    let character = setTrait(blankCharacter('abc'), 'humanity.rating', 6);
    character = setText(character, 'humanity.pathName', 'Path of Night');
    character = setText(character, 'humanity.bearing', 'Guilt');
    character = setText(character, 'humanity.bearingModifier', '+1');

    expect(character.humanity).toEqual({
      pathName: 'Path of Night',
      rating: 6,
      bearing: 'Guilt',
      bearingModifier: '+1',
    });
  });

  test.each(['+1', '-2', 'none', '', '  '])('keeps a bearing modifier of %j as typed', (text) => {
    expect(setText(blankCharacter('abc'), 'humanity.bearingModifier', text).humanity.bearingModifier).toBe(
      text,
    );
  });

  test('leaves the rest of the character as it was', () => {
    const original = blankCharacter('abc');

    const updated = setText(original, 'humanity.bearing', 'Guilt');

    expect(updated).toEqual({ ...original, humanity: { ...original.humanity, bearing: 'Guilt' } });
  });

  test('does not change the character it was given', () => {
    const original = blankCharacter('abc');

    setText(original, 'humanity.pathName', 'Path of Night');

    expect(original).toEqual(blankCharacter('abc'));
  });
});

describe('trackers', () => {
  test('temporary Willpower may exceed permanent Willpower', () => {
    let character = setTrait(blankCharacter('abc'), 'willpower.permanent', 3);
    character = setTrait(character, 'willpower.temporary', 10);

    expect(character.willpower).toEqual({ permanent: 3, temporary: 10 });
  });

  test('lowering permanent Willpower leaves temporary Willpower alone', () => {
    let character = setTrait(blankCharacter('abc'), 'willpower.temporary', 8);
    character = setTrait(character, 'willpower.permanent', 2);

    expect(character.willpower).toEqual({ permanent: 2, temporary: 8 });
  });

  test('the Blood Pool is not limited by generation', () => {
    let character = setHeaderField(blankCharacter('abc'), 'generation', '13');
    character = setTrait(character, 'bloodPool.current', 50);

    expect(character.bloodPool.current).toBe(50);
  });

  test('Blood Per Turn keeps whatever is typed', () => {
    const character = setText(blankCharacter('abc'), 'bloodPool.perTurn', '3');

    expect(character.bloodPool).toEqual({ current: 0, perTurn: '3' });
  });
});

describe('cycleHealthBox', () => {
  test('steps a box through bashing, lethal, aggravated and back to empty', () => {
    let character = blankCharacter('abc');
    const seen: string[] = [];
    for (let step = 0; step < 5; step += 1) {
      character = cycleHealthBox(character, 'bruised');
      seen.push(character.health.bruised);
    }

    expect(seen).toEqual(['bashing', 'lethal', 'aggravated', 'empty', 'bashing']);
  });

  test.each(HEALTH_LEVELS.map((level) => level.key))('changes only the %s box', (level) => {
    const original = blankCharacter('abc');

    const updated = cycleHealthBox(original, level);

    expect(updated).toEqual({ ...original, health: { ...original.health, [level]: 'bashing' } });
  });

  test('boxes hold different damage and are not sorted', () => {
    let character = blankCharacter('abc');
    character = cycleHealthBox(cycleHealthBox(character, 'wounded'), 'wounded');
    character = cycleHealthBox(character, 'incapacitated');

    expect(character.health).toEqual({
      bruised: 'empty',
      hurt: 'empty',
      injured: 'empty',
      wounded: 'lethal',
      mauled: 'empty',
      crippled: 'empty',
      incapacitated: 'bashing',
    });
  });

  test('does not change the character it was given', () => {
    const original = blankCharacter('abc');

    cycleHealthBox(original, 'hurt');

    expect(original).toEqual(blankCharacter('abc'));
  });
});

describe('namedRows', () => {
  test('keeps the rows with a name, in order, with their ratings', () => {
    const rows = [
      { name: 'Dominate', rating: 3 },
      { name: '', rating: 0 },
      { name: 'Potence', rating: 1 },
    ];
    expect(namedRows(rows)).toEqual([
      { name: 'Dominate', rating: 3 },
      { name: 'Potence', rating: 1 },
    ]);
  });

  test('drops a row whose name is only spaces, whatever its rating', () => {
    expect(namedRows([{ name: '   ', rating: 4 }])).toEqual([]);
  });

  test('keeps a named row rated zero and trims its name', () => {
    expect(namedRows([{ name: '  Hobby Talent ', rating: 0 }])).toEqual([{ name: 'Hobby Talent', rating: 0 }]);
  });

  test('is empty when there are no rows', () => {
    expect(namedRows([])).toEqual([]);
  });
});

describe('namedCustomAbility', () => {
  const withTalent = (name: string, rating: number) =>
    setNamedRow(blankCharacter('abc'), 'customAbilities.talents', { name, rating });

  test('is the group\'s write-in ability with its name trimmed', () => {
    expect(namedCustomAbility(withTalent('  Hobby Talent ', 3), 'customAbilities.talents')).toEqual({
      name: 'Hobby Talent',
      rating: 3,
    });
  });

  test('is undefined while the name is blank or only spaces, whatever the rating', () => {
    expect(namedCustomAbility(blankCharacter('abc'), 'customAbilities.skills')).toBeUndefined();
    expect(namedCustomAbility(withTalent('   ', 4), 'customAbilities.talents')).toBeUndefined();
  });

  test('reads only the group asked for', () => {
    expect(namedCustomAbility(withTalent('Streetwise', 2), 'customAbilities.knowledges')).toBeUndefined();
  });
});

describe('weakness, experience and notes', () => {
  test('notes keep their line breaks', () => {
    const notes = 'first line\nsecond line\n\nfourth line';

    expect(setText(blankCharacter('abc'), 'notes', notes).notes).toBe(notes);
  });

  test('setting one leaves the other two and the rest of the character alone', () => {
    const original = blankCharacter('abc');

    const updated = setText(original, 'weakness', 'Casts no reflection');

    expect(updated).toEqual({ ...original, weakness: 'Casts no reflection' });
  });

  test('experience keeps whatever is typed', () => {
    expect(setText(blankCharacter('abc'), 'experience', '12 (3 unspent)').experience).toBe(
      '12 (3 unspent)',
    );
  });
});

describe('a fully filled-in character', () => {
  /** Every page-1 field given a value different from its blank default. */
  function filledIn() {
    let character = blankCharacter('abc');
    for (const [index, field] of HEADER_FIELDS.entries()) {
      character = setText(character, `header.${field.key}`, `${field.label} ${index}`);
    }
    for (const key of Object.keys(character.attributes)) {
      character = setTrait(character, `attributes.${key}` as TraitRef, 5);
    }
    for (const key of Object.keys(character.abilities)) {
      character = setTrait(character, `abilities.${key}` as TraitRef, 3);
    }
    for (const key of Object.keys(character.virtues)) {
      character = setTrait(character, `virtues.${key}` as TraitRef, 4);
    }
    for (const group of ['talents', 'skills', 'knowledges'] as const) {
      character = setNamedRow(character, `customAbilities.${group}`, { name: `My ${group}`, rating: 2 });
    }
    for (let index = 0; index < 6; index += 1) {
      character = setNamedRow(character, `disciplines.${index}`, { name: `Discipline ${index}`, rating: 1 });
      character = setNamedRow(character, `backgrounds.${index}`, { name: `Background ${index}`, rating: 6 });
    }
    character = setTrait(character, 'humanity.rating', 7);
    character = setText(character, 'humanity.pathName', 'Path of Night');
    character = setText(character, 'humanity.bearing', 'Guilt');
    character = setText(character, 'humanity.bearingModifier', '+1');
    character = setTrait(character, 'willpower.permanent', 6);
    character = setTrait(character, 'willpower.temporary', 9);
    character = setTrait(character, 'bloodPool.current', 37);
    character = setText(character, 'bloodPool.perTurn', '3');
    for (const [index, level] of HEALTH_LEVELS.entries()) {
      for (let step = 0; step <= index % 3; step += 1) character = cycleHealthBox(character, level.key);
    }
    character = setText(character, 'weakness', 'Casts no reflection');
    character = setText(character, 'experience', '12');
    return setText(character, 'notes', 'one\ntwo\nthree');
  }

  test('differs from a blank character in every field', () => {
    const blank = blankCharacter('abc') as unknown as Record<string, unknown>;
    const filled = filledIn() as unknown as Record<string, unknown>;
    const unchanged = (before: unknown, after: unknown): string[] => {
      if (typeof before !== 'object' || before === null) return before === after ? ['<value>'] : [];
      return Object.keys(before).flatMap((key) =>
        unchanged((before as Record<string, unknown>)[key], (after as Record<string, unknown>)[key]).map(
          (path) => `${key}.${path}`,
        ),
      );
    };

    expect(unchanged(blank, filled)).toEqual([
      'id.<value>',
      'system.<value>',
      'schemaVersion.<value>',
    ]);
  });

  test('survives being written out and read back', () => {
    const character = filledIn();

    expect(JSON.parse(JSON.stringify(character))).toEqual(character);
  });
});

describe('setNamedRow with a rating it was not asked to change', () => {
  test('renaming a row leaves an out-of-range stored rating exactly as it was', () => {
    const stored = blankCharacter('abc');
    stored.disciplines[0] = { name: 'Dominate', rating: 12 };

    const renamed = setNamedRow(stored, 'disciplines.0', { name: 'Presence' });

    expect(renamed.disciplines[0]).toEqual({ name: 'Presence', rating: 12 });
  });
});

describe('specialties', () => {
  test('a blank character has none', () => {
    const character = blankCharacter('abc');

    expect(character.specialties).toEqual({});
    expect(specialtyText(character, 'attributes.strength')).toBe('');
    expect(specialtyOf(character, 'attributes.strength')).toBeUndefined();
  });

  test('a specialty is kept as typed and read trimmed', () => {
    const character = setSpecialty(blankCharacter('abc'), 'abilities.academics', ' Art history ');

    expect(specialtyText(character, 'abilities.academics')).toBe(' Art history ');
    expect(specialtyOf(character, 'abilities.academics')).toBe('Art history');
    expect(specialtyOf(character, 'abilities.occult')).toBeUndefined();
  });

  test('clearing the text removes the specialty', () => {
    const named = setSpecialty(blankCharacter('abc'), 'abilities.academics', 'Art history');

    expect(setSpecialty(named, 'abilities.academics', '').specialties).toEqual({});
  });

  test('does not change the character it was given', () => {
    const original = blankCharacter('abc');

    setSpecialty(original, 'attributes.wits', 'Ambushes');

    expect(original).toEqual(blankCharacter('abc'));
  });
});
