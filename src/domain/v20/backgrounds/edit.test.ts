import { describe, expect, test } from 'vitest';
import { blankCharacter, type V20Character } from '../character';
import { validBackgrounds } from '../dossier/validate';
import type { BackgroundRow, Merit } from '../dossier/types';
import {
  POINTS_MESSAGE,
  RATING_MESSAGE,
  addBackground,
  addEntry,
  addFlaw,
  addHaven,
  addMerit,
  addOtherTrait,
  addPerson,
  canRemove,
  correctedPoints,
  correctedRating,
  entryAt,
  removeEntry,
  removePerson,
  restoreEntry,
  setBackgroundDetail,
  setPerson,
  updateEntry,
  type Family,
} from './edit';

const FAMILIES: Family[] = ['backgrounds', 'havens', 'merits', 'flaws', 'otherTraits'];

const full = (name: string, rating: number): BackgroundRow => ({
  name,
  rating,
  summary: `${name} summary`,
  note: `${name} note`,
  people: [{ name: `${name} contact`, role: 'fixer' }],
});

/** A character whose six base backgrounds are all filled in, and may have more. */
function withBackgrounds(count = 6): V20Character {
  const character = blankCharacter('abc');
  character.backgrounds = Array.from({ length: count }, (_row, place) => full(`Background ${place + 1}`, (place % 5) + 1));
  return character;
}

const merit = (name: string, points: number): Merit => ({ name, category: 'Mental', points, note: `${name} note` });

describe('the corrections', () => {
  test.each([
    [-3, 0, POINTS_MESSAGE],
    [-1, 0, POINTS_MESSAGE],
    [0, 0, undefined],
    [2, 2, undefined],
    [2.6, 3, undefined],
  ])('points entered as %f are kept as %i', (entered, value, message) => {
    expect(correctedPoints(entered)).toEqual(message === undefined ? { value } : { value, message });
  });

  test.each([
    [-1, 0, RATING_MESSAGE],
    [0, 0, undefined],
    [10, 10, undefined],
    [11, 10, RATING_MESSAGE],
    [4, 4, undefined],
  ])('a rating entered as %f is kept as %i', (entered, value, message) => {
    expect(correctedRating(entered)).toEqual(message === undefined ? { value } : { value, message });
  });
});

describe('adding', () => {
  test.each(FAMILIES)('puts a blank entry at the end of %s', (family) => {
    const before = blankCharacter('abc');
    const after = addEntry(before, family);
    expect(after[family]).toHaveLength(before[family].length + 1);
    expect(entryAt(after, family, before[family].length)?.name).toBe('');
  });

  test('the named adders add to their own list', () => {
    expect(addBackground(blankCharacter('abc')).backgrounds).toHaveLength(7);
    expect(addMerit(blankCharacter('abc')).merits).toHaveLength(1);
    expect(addFlaw(blankCharacter('abc')).flaws).toHaveLength(1);
    expect(addHaven(blankCharacter('abc')).havens).toHaveLength(1);
    expect(addOtherTrait(blankCharacter('abc')).otherTraits).toHaveLength(1);
  });

  test('a new background is blank and the others are untouched', () => {
    const before = withBackgrounds();
    const after = addBackground(before);
    expect(after.backgrounds.slice(0, 6)).toEqual(before.backgrounds);
    expect(after.backgrounds[6]).toEqual({ name: '', rating: 0 });
  });

  test('a new Merit starts at 0 points, a new haven as Primary, and neither is shared with the next', () => {
    const after = addHaven(addMerit(addMerit(blankCharacter('abc'))));
    expect(after.merits[0]).toMatchObject({ name: '', points: 0, category: 'Physical', note: '' });
    expect(after.merits[0]).not.toBe(after.merits[1]);
    expect(after.havens[0]).toMatchObject({ name: '', kind: 'Primary' });
  });

  test('does not change the character it was given', () => {
    const before = blankCharacter('abc');
    addMerit(before);
    expect(before.merits).toEqual([]);
  });
});

describe('changing', () => {
  test('changes the fields given and keeps the rest', () => {
    const before = addMerit(blankCharacter('abc'));
    const after = updateEntry(before, 'merits', 0, { name: 'Acute Sense', category: 'Physical', points: 1 });
    expect(after.merits[0]).toEqual({ name: 'Acute Sense', category: 'Physical', points: 1, note: '' });
  });

  test('changes only the entry at the place', () => {
    const before = { ...blankCharacter('abc'), merits: [merit('A', 1), merit('B', 2)] };
    const after = updateEntry(before, 'merits', 1, { name: 'C' });
    expect(after.merits.map((entry) => entry.name)).toEqual(['A', 'C']);
  });

  test('a place with no entry changes nothing', () => {
    const before = { ...blankCharacter('abc'), merits: [merit('A', 1)] };
    for (const index of [-1, 1, 7, 0.5, Number.NaN]) {
      expect(updateEntry(before, 'merits', index, { name: 'Z' })).toBe(before);
    }
  });

  test('floors points at 0', () => {
    const before = { ...blankCharacter('abc'), merits: [merit('A', 2)], flaws: [merit('B', 2)] };
    expect(updateEntry(before, 'merits', 0, { points: -3 }).merits[0].points).toBe(0);
    expect(updateEntry(before, 'flaws', 0, { points: -3 }).flaws[0].points).toBe(0);
  });

  test('keeps a background\'s rating between 0 and 10', () => {
    const before = withBackgrounds();
    expect(updateEntry(before, 'backgrounds', 0, { rating: 12 }).backgrounds[0].rating).toBe(10);
    expect(updateEntry(before, 'backgrounds', 0, { rating: -2 }).backgrounds[0].rating).toBe(0);
  });

  test('keeps an other trait\'s rating between 0 and 10, and lets it be unrated', () => {
    const before = { ...blankCharacter('abc'), otherTraits: [{ name: 'Languages', kind: 'Skill', note: '', rating: 3 }] };
    expect(updateEntry(before, 'otherTraits', 0, { rating: 40 }).otherTraits[0].rating).toBe(10);
    const unrated = updateEntry(before, 'otherTraits', 0, { rating: undefined }).otherTraits[0];
    expect('rating' in unrated).toBe(false);
  });

  test('a name or rating change keeps a background\'s summary, note and people', () => {
    const before = withBackgrounds();
    const after = updateEntry(before, 'backgrounds', 2, { name: 'Renamed', rating: 5 });
    expect(after.backgrounds[2]).toEqual({ ...before.backgrounds[2], name: 'Renamed', rating: 5 });
  });

  test('keeps a field the tab does not know', () => {
    const before = withBackgrounds();
    (before.backgrounds[0] as BackgroundRow & { colour?: string }).colour = 'red';
    expect(updateEntry(before, 'backgrounds', 0, { name: 'Allies' }).backgrounds[0]).toMatchObject({ colour: 'red' });
  });

  test('setBackgroundDetail changes the summary, the note and the people', () => {
    const people = [{ name: 'Odile', role: 'clerk' }];
    const after = setBackgroundDetail(withBackgrounds(), 1, { summary: 'S', note: 'N', people });
    expect(after.backgrounds[1]).toMatchObject({ name: 'Background 2', summary: 'S', note: 'N', people });
  });

  test('setBackgroundDetail ignores a place with no row', () => {
    const before = withBackgrounds();
    expect(setBackgroundDetail(before, 9, { note: 'N' })).toBe(before);
  });
});

describe('people', () => {
  test('addPerson gives a background a person with no name or role', () => {
    const after = addPerson(blankCharacter('abc'), 0);
    expect(after.backgrounds[0].people).toEqual([{ name: '', role: '' }]);
  });

  test('addPerson keeps the people it has, in order', () => {
    const after = addPerson(withBackgrounds(), 0);
    expect(after.backgrounds[0].people).toEqual([{ name: 'Background 1 contact', role: 'fixer' }, { name: '', role: '' }]);
  });

  test('setPerson changes the name or the role of one person', () => {
    const after = setPerson(withBackgrounds(), 0, 0, { role: 'curator' });
    expect(after.backgrounds[0].people).toEqual([{ name: 'Background 1 contact', role: 'curator' }]);
  });

  test('removePerson takes one person off and keeps the others in order', () => {
    const three = setBackgroundDetail(blankCharacter('abc'), 0, {
      people: [{ name: 'A', role: '1' }, { name: 'B', role: '2' }, { name: 'C', role: '3' }],
    });
    expect(removePerson(three, 0, 1).backgrounds[0].people?.map((person) => person.name)).toEqual(['A', 'C']);
  });

  test('a place with no person or no background changes nothing', () => {
    const before = withBackgrounds();
    expect(setPerson(before, 0, 4, { name: 'X' })).toBe(before);
    expect(removePerson(before, 0, 4)).toBe(before);
    expect(addPerson(before, 20)).toBe(before);
  });
});

describe('removing a list entry', () => {
  test.each(['havens', 'merits', 'flaws', 'otherTraits'] as const)('takes it out of %s', (family) => {
    const before = addEntry(addEntry(blankCharacter('abc'), family), family);
    const named = updateEntry(updateEntry(before, family, 0, { name: 'First' }), family, 1, { name: 'Second' });
    expect(removeEntry(named, family, 0)[family].map((entry) => entry.name)).toEqual(['Second']);
  });

  test('removing the last one leaves the list empty', () => {
    expect(removeEntry(addMerit(blankCharacter('abc')), 'merits', 0).merits).toEqual([]);
  });

  test('a place with no entry changes nothing', () => {
    const before = addMerit(blankCharacter('abc'));
    for (const family of FAMILIES) expect(removeEntry(before, family, 40)).toBe(before);
    expect(removeEntry(before, 'merits', -1)).toBe(before);
  });
});

describe('removing a background', () => {
  test.each([0, 1, 2, 3, 4, 5])('blanks base row %i where it stands, with every field cleared', (index) => {
    const before = withBackgrounds();
    const after = removeEntry(before, 'backgrounds', index);
    expect(after.backgrounds).toHaveLength(6);
    expect(after.backgrounds[index]).toEqual({ name: '', rating: 0 });
    expect(after.backgrounds.filter((_row, place) => place !== index)).toEqual(before.backgrounds.filter((_row, place) => place !== index));
  });

  test('takes a row past the sixth out of the list', () => {
    const before = withBackgrounds(7);
    const after = removeEntry(before, 'backgrounds', 6);
    expect(after.backgrounds).toEqual(before.backgrounds.slice(0, 6));
  });

  test('takes a row in the middle of the extra ones out and closes up the rest', () => {
    const before = withBackgrounds(8);
    const after = removeEntry(before, 'backgrounds', 6);
    expect(after.backgrounds.map((row) => row.name).slice(5)).toEqual(['Background 6', 'Background 8']);
  });

  test('the backgrounds stay valid after every removal, down to nothing left but blank rows', () => {
    let character = withBackgrounds(8);
    for (const index of [7, 6, 5, 4, 3, 2, 1, 0]) {
      character = removeEntry(character, 'backgrounds', index);
      expect(validBackgrounds(character.backgrounds)).toBe(true);
    }
    expect(character.backgrounds).toHaveLength(6);
    expect(character.backgrounds.every((row) => row.name === '' && row.rating === 0)).toBe(true);
  });

  test('canRemove is false for a blank base row and true for anything with something to take away', () => {
    const blank = blankCharacter('abc');
    expect(canRemove(blank, 'backgrounds', 0)).toBe(false);
    expect(canRemove(withBackgrounds(), 'backgrounds', 0)).toBe(true);
    expect(canRemove(addBackground(blank), 'backgrounds', 6)).toBe(true);
    expect(canRemove(addMerit(blank), 'merits', 0)).toBe(true);
    expect(canRemove(blank, 'merits', 0)).toBe(false);
  });

  test('canRemove is true for a base row holding only a note', () => {
    expect(canRemove(setBackgroundDetail(blankCharacter('abc'), 3, { note: 'x' }), 'backgrounds', 3)).toBe(true);
  });
});

describe('clearing a rating', () => {
  test('an other trait can be left unrated', () => {
    const rated = updateEntry(addEntry(blankCharacter('abc'), 'otherTraits'), 'otherTraits', 0, { name: 'Humanity', rating: 7 });

    expect(entryAt(updateEntry(rated, 'otherTraits', 0, { rating: undefined }), 'otherTraits', 0)).not.toHaveProperty('rating');
  });

  test('a background keeps its rating, so the saved character still loads', () => {
    const rated = updateEntry(blankCharacter('abc'), 'backgrounds', 0, { name: 'Allies', rating: 3 });
    const after = updateEntry(rated, 'backgrounds', 0, { rating: undefined });

    expect(entryAt(after, 'backgrounds', 0)).toMatchObject({ name: 'Allies', rating: 3 });
    expect(validBackgrounds(after.backgrounds)).toBe(true);
  });
});

describe('putting an entry back', () => {
  test('puts a blanked base row back with every field, people included', () => {
    const before = withBackgrounds();
    (before.backgrounds[1] as BackgroundRow & { colour?: string }).colour = 'red';
    const removed = entryAt(before, 'backgrounds', 1)!;
    const after = restoreEntry(removeEntry(before, 'backgrounds', 1), 'backgrounds', 1, removed);
    expect(after).toEqual(before);
  });

  test('puts a row past the sixth back where it was, among the others', () => {
    const before = withBackgrounds(8);
    const removed = entryAt(before, 'backgrounds', 6)!;
    const after = restoreEntry(removeEntry(before, 'backgrounds', 6), 'backgrounds', 6, removed);
    expect(after).toEqual(before);
  });

  test('does not overwrite a base row filled in since: the entry goes to the end instead', () => {
    const before = withBackgrounds();
    const removed = entryAt(before, 'backgrounds', 1)!;
    const refilled = updateEntry(removeEntry(before, 'backgrounds', 1), 'backgrounds', 1, { name: 'Contacts', rating: 2 });
    const after = restoreEntry(refilled, 'backgrounds', 1, removed);
    expect(after.backgrounds[1]).toMatchObject({ name: 'Contacts', rating: 2 });
    expect(after.backgrounds.at(-1)).toEqual(removed);
  });

  test('puts the last row back at the end', () => {
    const before = withBackgrounds(7);
    const removed = entryAt(before, 'backgrounds', 6)!;
    expect(restoreEntry(removeEntry(before, 'backgrounds', 6), 'backgrounds', 6, removed)).toEqual(before);
  });

  test.each(['havens', 'merits', 'flaws', 'otherTraits'] as const)('puts an entry of %s back at its place', (family) => {
    let before = blankCharacter('abc');
    for (const name of ['A', 'B', 'C']) before = updateEntry(addEntry(before, family), family, before[family].length, { name });
    const removed = entryAt(before, family, 1)!;
    expect(restoreEntry(removeEntry(before, family, 1), family, 1, removed)).toEqual(before);
  });

  test('puts it at the end when the list has shrunk since', () => {
    const before = { ...blankCharacter('abc'), merits: [merit('A', 1), merit('B', 2), merit('C', 3)] };
    const removed = entryAt(before, 'merits', 2)!;
    const shrunk = removeEntry(removeEntry(removeEntry(before, 'merits', 2), 'merits', 1), 'merits', 0);
    expect(restoreEntry(shrunk, 'merits', 2, removed).merits).toEqual([removed]);
  });

  test('the backgrounds stay valid', () => {
    const before = withBackgrounds(7);
    const removed = entryAt(before, 'backgrounds', 6)!;
    expect(validBackgrounds(restoreEntry(removeEntry(before, 'backgrounds', 6), 'backgrounds', 6, removed).backgrounds)).toBe(true);
  });
});

describe('every change leaves the backgrounds valid', () => {
  test('through a run of adds, edits, removals and restores', () => {
    let character = blankCharacter('abc');
    const steps: ((current: V20Character) => V20Character)[] = [
      addBackground,
      (current) => updateEntry(current, 'backgrounds', 6, { name: 'Domain', rating: 4 }),
      (current) => setBackgroundDetail(current, 0, { note: 'x' }),
      (current) => addPerson(current, 0),
      (current) => removeEntry(current, 'backgrounds', 6),
      (current) => removeEntry(current, 'backgrounds', 0),
      (current) => restoreEntry(current, 'backgrounds', 0, full('Back', 2)),
      (current) => removeEntry(current, 'backgrounds', 99),
    ];
    for (const step of steps) {
      character = step(character);
      expect(validBackgrounds(character.backgrounds)).toBe(true);
    }
  });
});
