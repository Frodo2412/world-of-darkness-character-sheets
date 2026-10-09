import { describe, expect, test } from 'vitest';
import { blankJournal } from './types';
import { validJournal } from './validate';

const journal = () => structuredClone(blankJournal()) as Record<string, any>;
const session = { id: 's1', title: 'One', summary: '', current: true };
const note = {
  id: 'n1',
  sessionId: 's1',
  title: '',
  category: 'Clues',
  tags: [],
  pinned: false,
  body: '',
  createdAt: 1,
  editedAt: 1,
};

describe('validJournal', () => {
  test('accepts the blank journal', () => {
    expect(validJournal(blankJournal())).toBe(true);
  });

  test('accepts a journal with sessions, notes, awards and spendings', () => {
    const full = journal();
    full.sessions = [session];
    full.notes = [note];
    full.xp.awards = [{ id: 'a1', sessionId: 's1', amount: -2, note: '' }];
    full.xp.spendings = [{ id: 'p1', sessionId: 's1', label: 'Brawl', kind: 'ability', from: 1, to: 2, cost: 2 }];
    expect(validJournal(full)).toBe(true);
  });

  test.each([
    ['null', (j: any) => Object.assign(j, { sessions: null })],
    ['a session without a title', (j: any) => (j.sessions = [{ ...session, title: undefined }])],
    ['a session flag that is not a boolean', (j: any) => (j.sessions = [{ ...session, current: 'yes' }])],
    ['a note without an id', (j: any) => (j.notes = [{ ...note, id: undefined }])],
    ['note tags that are not a list', (j: any) => (j.notes = [{ ...note, tags: 'a' }])],
    ['a note date that is text', (j: any) => (j.notes = [{ ...note, createdAt: 'today' }])],
    ['an award amount that is text', (j: any) => (j.xp.awards = [{ id: 'a', sessionId: 's', amount: '3', note: '' }])],
    ['missing spendings', (j: any) => delete j.xp.spendings],
    ['a missing record', (j: any) => delete j.record],
    ['a blood bond without a rating', (j: any) => (j.record.bloodBonds = [{ name: 'M', relation: '', type: '' }])],
    ['a description field that is a number', (j: any) => (j.record.description.hair = 3)],
  ])('rejects %s', (_description, damage) => {
    const damaged = journal();
    damage(damaged);
    expect(validJournal(damaged)).toBe(false);
  });

  test('rejects a value that is not an object', () => {
    expect(validJournal([])).toBe(false);
    expect(validJournal(undefined)).toBe(false);
  });
});
