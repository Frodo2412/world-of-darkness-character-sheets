import { describe, expect, test } from 'vitest';
import { blankJournal, type CharacterRecord } from '../types';
import { addEntry, clampRating, removeEntry, restoreEntry, setDescription, setEntry, type ListKey } from './edit';
import { activeDerangements, DESCRIPTION_FIELDS, entryName } from './view';

const blank = (): CharacterRecord => structuredClone(blankJournal().record);

const LISTS: ListKey[] = ['gear', 'equipment', 'bloodBonds', 'derangements', 'goals'];

describe('addEntry', () => {
  test.each(LISTS)('adds a blank entry to %s, last, and leaves the others', (key) => {
    const once = addEntry(blank(), key);
    const twice = addEntry(once, key);

    expect(once[key]).toHaveLength(1);
    expect(twice[key]).toHaveLength(2);
    expect(LISTS.filter((other) => other !== key).every((other) => twice[other].length === 0)).toBe(true);
  });

  test('a new bond, derangement and goal start as the sheet usually reads them', () => {
    expect(addEntry(blank(), 'bloodBonds').bloodBonds[0]).toEqual({ name: '', relation: '', rating: 0, type: 'Blood Bond' });
    expect(addEntry(blank(), 'derangements').derangements[0]).toEqual({ name: '', status: 'Active', note: '' });
    expect(addEntry(blank(), 'goals').goals[0]).toEqual({ text: '', kind: '' });
  });

  test('does not change the record it was given', () => {
    const record = blank();
    addEntry(record, 'gear');

    expect(record.gear).toEqual([]);
  });
});

describe('setEntry', () => {
  test('changes the fields given and keeps the rest', () => {
    const record = addEntry(addEntry(blank(), 'gear'), 'gear');

    const changed = setEntry(record, 'gear', 1, { item: 'Knife' });
    expect(changed.gear).toEqual([{ item: '', detail: '' }, { item: 'Knife', detail: '' }]);
    expect(setEntry(changed, 'gear', 1, { detail: 'concealed' }).gear[1]).toEqual({ item: 'Knife', detail: 'concealed' });
  });

  test.each([-1, 2, 1.5, Number.NaN])('an index of %s that is not there changes nothing', (index) => {
    const record = addEntry(addEntry(blank(), 'goals'), 'goals');

    expect(setEntry(record, 'goals', index, { text: 'x' })).toBe(record);
  });

  test('on an empty list changes nothing', () => {
    const record = blank();

    expect(setEntry(record, 'derangements', 0, { name: 'x' })).toBe(record);
  });

  test('a blood bond rating is kept to 0 to 10', () => {
    const record = addEntry(blank(), 'bloodBonds');

    expect(setEntry(record, 'bloodBonds', 0, { rating: 11 }).bloodBonds[0].rating).toBe(10);
    expect(setEntry(record, 'bloodBonds', 0, { rating: -1 }).bloodBonds[0].rating).toBe(0);
    expect(setEntry(record, 'bloodBonds', 0, { rating: 10 }).bloodBonds[0].rating).toBe(10);
    expect(setEntry(record, 'bloodBonds', 0, { rating: 0 }).bloodBonds[0].rating).toBe(0);
    expect(setEntry(record, 'bloodBonds', 0, { rating: 3.7 }).bloodBonds[0].rating).toBe(3);
    expect(setEntry(record, 'bloodBonds', 0, { rating: Number.NaN }).bloodBonds[0].rating).toBe(0);
  });
});

describe('clampRating', () => {
  test.each([
    [5, 5, false],
    [0, 0, false],
    [10, 10, false],
    [11, 10, true],
    [-1, 0, true],
    [2.5, 2, true],
    [Number.NaN, 0, true],
  ])('%s becomes %s (corrected: %s)', (value, rating, corrected) => {
    expect(clampRating(value)).toEqual({ rating, corrected });
  });
});

describe('removeEntry and restoreEntry', () => {
  const goals = (): CharacterRecord => {
    let record = blank();
    for (const text of ['first', 'second', 'third']) record = setEntry(addEntry(record, 'goals'), 'goals', record.goals.length, { text });
    return record;
  };

  test('removes the entry and says what and where', () => {
    const result = removeEntry(goals(), 'goals', 1)!;

    expect(result.record.goals.map((goal) => goal.text)).toEqual(['first', 'third']);
    expect(result.removal).toEqual({ key: 'goals', index: 1, entry: { text: 'second', kind: '' } });
  });

  test('restores it at its original index, whatever was done meanwhile', () => {
    const { record, removal } = removeEntry(goals(), 'goals', 1)!;
    const meanwhile = setEntry(record, 'goals', 0, { text: 'changed' });

    expect(restoreEntry(meanwhile, removal).goals.map((goal) => goal.text)).toEqual(['changed', 'second', 'third']);
  });

  test('restores the first and the last in place', () => {
    const first = removeEntry(goals(), 'goals', 0)!;
    const last = removeEntry(goals(), 'goals', 2)!;

    expect(restoreEntry(first.record, first.removal).goals.map((goal) => goal.text)).toEqual(['first', 'second', 'third']);
    expect(restoreEntry(last.record, last.removal).goals.map((goal) => goal.text)).toEqual(['first', 'second', 'third']);
  });

  test('restores last when the list has become shorter than its place', () => {
    const { record, removal } = removeEntry(goals(), 'goals', 2)!;
    const shorter = removeEntry(removeEntry(record, 'goals', 1)!.record, 'goals', 0)!.record;

    expect(restoreEntry(shorter, removal).goals.map((goal) => goal.text)).toEqual(['third']);
  });

  test('removing from an empty list, or from a place that is not there, removes nothing', () => {
    expect(removeEntry(blank(), 'gear', 0)).toBeUndefined();
    expect(removeEntry(goals(), 'goals', 3)).toBeUndefined();
    expect(removeEntry(goals(), 'goals', -1)).toBeUndefined();
  });

  test.each(LISTS)('a removed %s entry is put back whole', (key) => {
    const record = addEntry(blank(), key);
    const { record: emptied, removal } = removeEntry(record, key, 0)!;

    expect(emptied[key]).toEqual([]);
    expect(restoreEntry(emptied, removal)).toEqual(record);
  });
});

describe('setDescription', () => {
  test.each(DESCRIPTION_FIELDS.map(({ field }) => field))('sets %s and no other field', (field) => {
    const record = setDescription(blank(), field, 'Late twenties');

    expect(record.description[field]).toBe('Late twenties');
    expect(Object.values(record.description).filter((text) => text !== '')).toEqual(['Late twenties']);
  });

  test('lists all eight description fields once, in the order the page shows them', () => {
    expect(DESCRIPTION_FIELDS.map(({ label }) => label)).toEqual([
      'Apparent Age',
      'Date of Birth',
      'R.I.P.',
      'Hair',
      'Eyes',
      'Nationality',
      'Height / Weight',
      'Sex',
    ]);
    expect(new Set(DESCRIPTION_FIELDS.map(({ field }) => field))).toEqual(new Set(Object.keys(blank().description)));
  });
});

describe('names and counts', () => {
  test('an entry is called by its words, or its place', () => {
    expect(entryName('goals', 1, '  Uncover the owner ')).toBe('Uncover the owner');
    expect(entryName('goals', 1, '')).toBe('goal 2');
    expect(entryName('bloodBonds', 0, '   ')).toBe('blood bond 1');
  });

  test('counts the derangements that are Active, whatever the case', () => {
    let record = blank();
    record = setEntry(addEntry(record, 'derangements'), 'derangements', 0, { status: ' ACTIVE ' });
    record = setEntry(addEntry(record, 'derangements'), 'derangements', 1, { status: 'Dormant' });

    expect(activeDerangements(record)).toBe('1 active');
    expect(activeDerangements(blank())).toBe('0 active');
  });
});
