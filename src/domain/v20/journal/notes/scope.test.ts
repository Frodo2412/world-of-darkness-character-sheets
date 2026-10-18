import { describe, expect, test } from 'vitest';
import { startSession } from '../sessions';
import { counterStamp } from '../testing/stamp';
import { blankJournal, type Journal } from '../types';
import { addNote, editNote, togglePin, type NoteFields } from './notes';
import {
  ALL_NOTES,
  categoryCounts,
  inScope,
  notesInScope,
  pinnedCount,
  sameScope,
  scopeCaption,
  scopeTitle,
  sessionCounts,
  tagList,
} from './scope';

/** Session 11 with two notes and Session 12 (current) with three, each given as the fields to write. */
function journalOf(): { journal: Journal; ids: string[]; stamp: ReturnType<typeof counterStamp> } {
  const stamp = counterStamp();
  let journal = startSession(blankJournal(), 'Session 11', stamp);
  const ids: string[] = [];
  const write = (fields: Partial<NoteFields>): void => {
    const added = addNote(journal, fields, stamp);
    if (!added.ok) throw new Error(added.reason);
    journal = added.journal;
    ids.push(added.id);
  };
  write({ title: 'a', category: 'Clues', tags: ['portrait'] });
  write({ title: 'b', category: 'Places', tags: ['Museum', 'portrait'] });
  journal = startSession(journal, 'Session 12', stamp);
  write({ title: 'c', category: 'Clues', tags: ['museum'] });
  write({ title: 'd', category: 'People & relationships' });
  write({ title: 'e' });
  return { journal, ids, stamp };
}

const titles = (journal: Journal, scope: Parameters<typeof notesInScope>[1]): string[] => notesInScope(journal, scope).map((note) => note.title);

describe('notesInScope', () => {
  test('all notes, last edited first', () => {
    const { journal } = journalOf();

    expect(titles(journal, ALL_NOTES)).toEqual(['e', 'd', 'c', 'b', 'a']);
  });

  test('editing a note brings it to the top', () => {
    const { journal, ids, stamp } = journalOf();

    expect(titles(editNote(journal, ids[0], { body: 'changed' }, stamp), ALL_NOTES)[0]).toBe('a');
  });

  test('notes made at the same moment list the newest first', () => {
    const { journal } = journalOf();
    const frozen = { ...journal, notes: journal.notes.map((note) => ({ ...note, editedAt: 5 })) };

    expect(titles(frozen, ALL_NOTES)).toEqual(['e', 'd', 'c', 'b', 'a']);
  });

  test('a session lists only its own notes', () => {
    const { journal } = journalOf();

    expect(titles(journal, { kind: 'session', id: journal.sessions[0].id })).toEqual(['b', 'a']);
    expect(titles(journal, { kind: 'session', id: journal.sessions[1].id })).toEqual(['e', 'd', 'c']);
  });

  test('a category lists its notes from every session, and a note with an unknown one is Unsorted', () => {
    const { journal } = journalOf();
    const odd = { ...journal, notes: journal.notes.map((note) => (note.title === 'a' ? { ...note, category: 'Secrets' } : note)) };

    expect(titles(journal, { kind: 'category', category: 'Clues' })).toEqual(['c', 'a']);
    expect(titles(odd, { kind: 'category', category: 'Unsorted' })).toEqual(['e', 'a']);
  });

  test('a tag lists its notes whatever its case', () => {
    const { journal } = journalOf();

    expect(titles(journal, { kind: 'tag', tag: 'MUSEUM' })).toEqual(['c', 'b']);
  });

  test('pinned lists the pinned notes', () => {
    const { journal, ids } = journalOf();
    const pinned = togglePin(journal, ids[1]);

    expect(titles(pinned, { kind: 'pinned' })).toEqual(['b']);
    expect(titles(journal, { kind: 'pinned' })).toEqual([]);
  });

  test('a session with no notes lists none, and a session that is not there lists none', () => {
    const { journal, stamp } = journalOf();
    const next = startSession(journal, 'Session 13', stamp);

    expect(titles(next, { kind: 'session', id: next.sessions[2].id })).toEqual([]);
    expect(titles(next, { kind: 'session', id: 'missing' })).toEqual([]);
  });
});

describe('counts', () => {
  test('every session counted, newest first, with the current one marked', () => {
    const { journal } = journalOf();

    expect(sessionCounts(journal).map(({ session, count }) => [session.title, count, session.current])).toEqual([
      ['Session 12', 3, true],
      ['Session 11', 2, false],
    ]);
  });

  test('all five categories, in order, counted once per note and adding up to all notes', () => {
    const { journal } = journalOf();
    const counts = categoryCounts(journal);

    expect(counts.map(({ category, count }) => [category, count])).toEqual([
      ['People & relationships', 1],
      ['Clues', 2],
      ['Places', 1],
      ['Promises & boons', 0],
      ['Unsorted', 1],
    ]);
    expect(counts.reduce((total, { count }) => total + count, 0)).toBe(journal.notes.length);
  });

  test('tags once whatever their case, alphabetical, counted once per note', () => {
    const { journal } = journalOf();

    expect(tagList(journal)).toEqual([
      { tag: 'Museum', count: 2 },
      { tag: 'portrait', count: 2 },
    ]);
  });

  test('a note that repeats a tag in another case counts once for it', () => {
    const { journal, ids } = journalOf();
    const repeated = { ...journal, notes: journal.notes.map((note) => (note.id === ids[0] ? { ...note, tags: ['portrait', 'Portrait'] } : note)) };

    expect(tagList(repeated).find((entry) => entry.tag === 'portrait')?.count).toBe(2);
  });

  test('the pinned count follows pinning and unpinning', () => {
    const { journal, ids } = journalOf();
    const pinned = togglePin(journal, ids[0]);

    expect(pinnedCount(pinned)).toBe(1);
    expect(pinnedCount(togglePin(pinned, ids[0]))).toBe(0);
  });

  test('a journal with no notes counts zero everywhere', () => {
    const empty = blankJournal();

    expect(categoryCounts(empty).every(({ count }) => count === 0)).toBe(true);
    expect(sessionCounts(empty)).toEqual([]);
    expect(tagList(empty)).toEqual([]);
  });
});

describe('scope words', () => {
  test('titles', () => {
    const { journal } = journalOf();

    expect(scopeTitle(journal, ALL_NOTES)).toBe('All notes');
    expect(scopeTitle(journal, { kind: 'pinned' })).toBe('Pinned');
    expect(scopeTitle(journal, { kind: 'session', id: journal.sessions[1].id })).toBe('Session 12');
    expect(scopeTitle(journal, { kind: 'category', category: 'Clues' })).toBe('Clues');
    expect(scopeTitle(journal, { kind: 'tag', tag: 'museum' })).toBe('Tagged museum');
  });

  test('captions say what else narrows the list', () => {
    expect(scopeCaption({ kind: 'session', id: 'x' })).toBe('All categories');
    expect(scopeCaption({ kind: 'category', category: 'Clues' })).toBe('All sessions');
    expect(scopeCaption({ kind: 'pinned' })).toBe('Pinned in every session');
  });

  test('scopes are the same when they name the same thing', () => {
    expect(sameScope({ kind: 'tag', tag: 'Museum' }, { kind: 'tag', tag: 'museum' })).toBe(true);
    expect(sameScope({ kind: 'session', id: 'a' }, { kind: 'session', id: 'b' })).toBe(false);
    expect(sameScope(ALL_NOTES, { kind: 'pinned' })).toBe(false);
  });

  test('inScope agrees with the list', () => {
    const { journal } = journalOf();
    const scope = { kind: 'category', category: 'Clues' } as const;

    expect(journal.notes.filter((note) => inScope(note, scope))).toHaveLength(2);
  });
});
