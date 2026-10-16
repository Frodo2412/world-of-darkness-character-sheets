import { describe, expect, test } from 'vitest';
import { blankCharacter, type V20Character } from '../character';
import {
  POINTS_MESSAGE,
  addBackground,
  addHaven,
  addOtherTrait,
  addPerson,
  addPointed,
  clampPoints,
  removeEntry,
  removePerson,
  restoreEntry,
  setBackground,
  setHaven,
  setOtherTrait,
  setPerson,
  setPointed,
} from './edit';

const character = (): V20Character => {
  const base = blankCharacter('abc');
  base.backgrounds[0] = { name: 'Allies', rating: 2, summary: 'Curator', note: 'Owes her', people: [{ name: 'Camille', role: 'curator' }, { name: 'Laurent', role: 'conservator' }] };
  base.merits = [
    { name: 'Acute Sense', category: 'Physical', points: 1, note: '' },
    { name: 'Eidetic Memory', category: 'Mental', points: 2, note: '' },
  ];
  base.flaws = [{ name: 'Dark Secret', category: 'Social', points: 1, note: '' }];
  base.havens = [{ name: 'Atelier', kind: 'Primary', description: '', location: '', access: '', security: '' }];
  base.otherTraits = [{ name: 'Languages', kind: 'Narrative', note: 'French' }];
  return base;
};

describe('clampPoints', () => {
  test('leaves a whole number of 0 or more alone', () => {
    expect(clampPoints(0)).toEqual({ points: 0, corrected: false });
    expect(clampPoints(7)).toEqual({ points: 7, corrected: false });
  });

  test('puts a negative number at 0 and says it did', () => {
    expect(clampPoints(-3)).toEqual({ points: 0, corrected: true });
  });

  test('makes a fraction whole and a missing number 0', () => {
    expect(clampPoints(2.5)).toEqual({ points: 2, corrected: true });
    expect(clampPoints(Number.NaN)).toEqual({ points: 0, corrected: true });
  });

  test('has the stated message', () => {
    expect(POINTS_MESSAGE).toBe('Points kept at 0 or more.');
  });
});

describe('setBackground', () => {
  test('changes the name or rating and keeps the details', () => {
    const changed = setBackground(character(), 0, { name: 'Contacts', rating: 4 });

    expect(changed.backgrounds[0]).toMatchObject({ name: 'Contacts', rating: 4, summary: 'Curator', note: 'Owes her' });
    expect(changed.backgrounds[0].people).toHaveLength(2);
  });

  test('changes the summary or note', () => {
    const changed = setBackground(character(), 0, { summary: 'New', note: 'Newer' });

    expect(changed.backgrounds[0]).toMatchObject({ name: 'Allies', rating: 2, summary: 'New', note: 'Newer' });
  });

  test('leaves the character it was given alone', () => {
    const before = character();
    setBackground(before, 0, { name: 'Changed' });

    expect(before.backgrounds[0].name).toBe('Allies');
  });

  test('ignores an index that is not there', () => {
    const before = character();

    expect(setBackground(before, 9, { name: 'x' })).toBe(before);
    expect(setBackground(before, -1, { name: 'x' })).toBe(before);
  });
});

describe('addBackground', () => {
  test('adds a seventh row', () => {
    const added = addBackground(character(), 'Domain');

    expect(added.backgrounds).toHaveLength(7);
    expect(added.backgrounds[6]).toEqual({ name: 'Domain', rating: 0 });
  });

  test('can be named later', () => {
    expect(addBackground(character()).backgrounds[6]).toEqual({ name: '', rating: 0 });
  });
});

describe('people', () => {
  test('adds, edits and removes a person on one Background', () => {
    let changed = addPerson(character(), 0);
    expect(changed.backgrounds[0].people).toHaveLength(3);

    changed = setPerson(changed, 0, 2, { name: 'Sophie', role: 'archivist' });
    expect(changed.backgrounds[0].people?.[2]).toEqual({ name: 'Sophie', role: 'archivist' });

    changed = removePerson(changed, 0, 0);
    expect(changed.backgrounds[0].people?.map((person) => person.name)).toEqual(['Laurent', 'Sophie']);
  });

  test('adds a first person to a row saved without any', () => {
    expect(addPerson(blankCharacter('abc'), 1).backgrounds[1].people).toEqual([{ name: '', role: '' }]);
  });

  test('ignores a Background or person that is not there', () => {
    const before = character();

    expect(addPerson(before, 9)).toBe(before);
    expect(setPerson(before, 0, 9, { name: 'x' })).toBe(before);
    expect(removePerson(before, 0, 9)).toBe(before);
  });
});

describe('Merits and Flaws', () => {
  test('adds a blank entry of 0 points', () => {
    expect(addPointed(character(), 'merits').merits.at(-1)).toEqual({ name: '', category: 'Physical', points: 0, note: '' });
    expect(addPointed(character(), 'flaws').flaws).toHaveLength(2);
  });

  test('changes the fields of one entry and leaves the others', () => {
    const changed = setPointed(character(), 'merits', 1, { name: 'Photographic Memory', category: 'Mental', points: 3, note: 'Faces' });

    expect(changed.merits[1]).toEqual({ name: 'Photographic Memory', category: 'Mental', points: 3, note: 'Faces' });
    expect(changed.merits[0].name).toBe('Acute Sense');
  });

  test('keeps points at 0 or more', () => {
    expect(setPointed(character(), 'flaws', 0, { points: -3 }).flaws[0].points).toBe(0);
    expect(setPointed(character(), 'flaws', 0, { points: 2.9 }).flaws[0].points).toBe(2);
    expect(setPointed(character(), 'flaws', 0, { points: Number.NaN }).flaws[0].points).toBe(0);
  });

  test('ignores an index that is not there', () => {
    const before = character();

    expect(setPointed(before, 'merits', 5, { name: 'x' })).toBe(before);
  });
});

describe('Havens and other traits', () => {
  test('adds and changes a haven', () => {
    let changed = addHaven(character());
    expect(changed.havens[1]).toEqual({ name: '', kind: 'Primary', description: '', location: '', access: '', security: '' });

    changed = setHaven(changed, 1, { name: 'Archive', kind: 'Secondary', security: 'Cellar door' });
    expect(changed.havens[1]).toMatchObject({ name: 'Archive', kind: 'Secondary', security: 'Cellar door' });
  });

  test('adds and changes an other trait; a rating of undefined makes it unrated', () => {
    let changed = addOtherTrait(character());
    expect(changed.otherTraits[1]).toEqual({ name: '', kind: '', note: '' });

    changed = setOtherTrait(changed, 1, { name: 'Restoration', rating: 2 });
    expect(changed.otherTraits[1].rating).toBe(2);

    changed = setOtherTrait(changed, 1, { rating: undefined });
    expect('rating' in changed.otherTraits[1]).toBe(false);
  });

  test('keeps an other trait rating within 0 to 10', () => {
    expect(setOtherTrait(character(), 0, { rating: 14 }).otherTraits[0].rating).toBe(10);
    expect(setOtherTrait(character(), 0, { rating: -2 }).otherTraits[0].rating).toBe(0);
  });

  test('ignores an index that is not there', () => {
    const before = character();

    expect(setHaven(before, 3, { name: 'x' })).toBe(before);
    expect(setOtherTrait(before, 3, { name: 'x' })).toBe(before);
  });
});

describe('removeEntry and restoreEntry', () => {
  test('removes a merit and puts it back where it was', () => {
    const before = character();
    const { character: removed, removal } = removeEntry(before, 'merits', 0)!;

    expect(removed.merits.map((merit) => merit.name)).toEqual(['Eidetic Memory']);
    expect(restoreEntry(removed, removal)).toEqual(before);
  });

  test('removes the last entry of a section and restores it', () => {
    const before = character();
    const { character: removed, removal } = removeEntry(before, 'flaws', 0)!;

    expect(removed.flaws).toEqual([]);
    expect(restoreEntry(removed, removal)).toEqual(before);
  });

  test('removes a haven and an other trait', () => {
    const before = character();

    for (const family of ['havens', 'otherTraits'] as const) {
      const { character: removed, removal } = removeEntry(before, family, 0)!;
      expect(removed[family]).toEqual([]);
      expect(restoreEntry(removed, removal)).toEqual(before);
    }
  });

  test('does not overwrite a blanked row filled in since: the entry goes to the end instead', () => {
    const before = character();
    const { character: removed, removal } = removeEntry(before, 'backgrounds', 0)!;
    const refilled = { ...removed, backgrounds: removed.backgrounds.map((row, at) => (at === 0 ? { name: 'Contacts', rating: 2 } : row)) };

    const after = restoreEntry(refilled, removal);

    expect(after.backgrounds[0]).toMatchObject({ name: 'Contacts', rating: 2 });
    expect(after.backgrounds.at(-1)).toEqual(removal.entry);
  });

  test('leaves one of the first six Backgrounds as an empty row, and restores it in place', () => {
    const before = character();
    const { character: removed, removal } = removeEntry(before, 'backgrounds', 0)!;

    expect(removed.backgrounds).toHaveLength(6);
    expect(removed.backgrounds[0]).toEqual({ name: '', rating: 0 });
    expect(restoreEntry(removed, removal)).toEqual(before);
  });

  test('takes a Background out of a longer list and puts it back at its place', () => {
    const before = addBackground(addBackground(character(), 'Domain'), 'Fame');
    before.backgrounds[6] = { name: 'Domain', rating: 1 };
    const { character: removed, removal } = removeEntry(before, 'backgrounds', 6)!;

    expect(removed.backgrounds.map((row) => row.name).slice(6)).toEqual(['Fame']);
    expect(restoreEntry(removed, removal)).toEqual(before);
  });

  test('refuses an index that is not there, from an empty section too', () => {
    expect(removeEntry(character(), 'merits', 9)).toBeUndefined();
    expect(removeEntry(blankCharacter('abc'), 'flaws', 0)).toBeUndefined();
    expect(removeEntry(character(), 'merits', -1)).toBeUndefined();
  });

  test('restores at the end when the list has since got shorter', () => {
    const before = character();
    const { character: removed, removal } = removeEntry(before, 'merits', 1)!;
    const shorter = { ...removed, merits: [] };

    expect(restoreEntry(shorter, removal).merits).toEqual([before.merits[1]]);
  });

  test('leaves the character it was given alone', () => {
    const before = character();
    removeEntry(before, 'merits', 0);

    expect(before.merits).toHaveLength(2);
  });
});
