// Which notes the Journal lists, and the counts beside the sidebar's items. A note is counted once in
// each of its session, its category and each tag.

import { caseFolded, folded } from '../../text';
import type { Journal, Note, Session } from '../types';
import { categoryOf, NOTE_CATEGORIES, type NoteCategory } from './notes';

export type NoteScope =
  | { kind: 'all' }
  | { kind: 'pinned' }
  | { kind: 'session'; id: string }
  | { kind: 'category'; category: NoteCategory }
  | { kind: 'tag'; tag: string };

export const ALL_NOTES: NoteScope = { kind: 'all' };

export function sameScope(a: NoteScope, b: NoteScope): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'session':
      return a.id === (b as typeof a).id;
    case 'category':
      return a.category === (b as typeof a).category;
    case 'tag':
      return caseFolded(a.tag) === caseFolded((b as typeof a).tag);
    default:
      return true;
  }
}

const hasTag = (note: Note, tag: string): boolean => note.tags.some((kept) => caseFolded(kept) === caseFolded(tag));

/** Whether a note is in the scope. */
export function inScope(note: Note, scope: NoteScope): boolean {
  switch (scope.kind) {
    case 'all':
      return true;
    case 'pinned':
      return note.pinned;
    case 'session':
      return note.sessionId === scope.id;
    case 'category':
      return categoryOf(note) === scope.category;
    case 'tag':
      return hasTag(note, scope.tag);
  }
}

/** The notes in a scope, last edited first; notes written at the same moment keep the order they were written in, newest first. */
export function notesInScope(journal: Journal, scope: NoteScope): Note[] {
  return journal.notes
    .map((note, order) => ({ note, order }))
    .filter(({ note }) => inScope(note, scope))
    .sort((a, b) => b.note.editedAt - a.note.editedAt || b.order - a.order)
    .map(({ note }) => note);
}

export interface SessionCount {
  session: Session;
  count: number;
}

/** Every session, newest first, with its notes counted. */
export function sessionCounts(journal: Journal): SessionCount[] {
  return [...journal.sessions].reverse().map((session) => ({ session, count: journal.notes.filter((note) => note.sessionId === session.id).length }));
}

export interface CategoryCount {
  category: NoteCategory;
  count: number;
}

/** All five categories, in their order, with their notes counted. */
export function categoryCounts(journal: Journal): CategoryCount[] {
  return NOTE_CATEGORIES.map((category) => ({ category, count: journal.notes.filter((note) => categoryOf(note) === category).length }));
}

export interface TagCount {
  tag: string;
  count: number;
}

/** Every tag in use, once whatever its case, in alphabetical order, with its notes counted. The first spelling met names it. */
export function tagList(journal: Journal): TagCount[] {
  const found = new Map<string, TagCount>();
  for (const note of journal.notes) {
    // A note that repeats a tag in another case counts once for it.
    const keys = new Set(note.tags.map(caseFolded));
    for (const tag of note.tags) {
      const key = caseFolded(tag);
      if (!keys.delete(key)) continue;
      const entry = found.get(key);
      if (entry === undefined) found.set(key, { tag, count: 1 });
      else entry.count += 1;
    }
  }
  return [...found.values()].sort((a, b) => folded(a.tag).localeCompare(folded(b.tag)));
}

export const pinnedCount = (journal: Journal): number => journal.notes.filter((note) => note.pinned).length;

/** The scope as words: the heading above the list. */
export function scopeTitle(journal: Journal, scope: NoteScope): string {
  switch (scope.kind) {
    case 'all':
      return 'All notes';
    case 'pinned':
      return 'Pinned';
    case 'session':
      return journal.sessions.find((session) => session.id === scope.id)?.title ?? 'Session';
    case 'category':
      return scope.category;
    case 'tag':
      return `Tagged ${scope.tag}`;
  }
}

/** The line under the heading that says what else narrows the list. */
export function scopeCaption(scope: NoteScope): string {
  switch (scope.kind) {
    case 'session':
      return 'All categories';
    case 'category':
    case 'tag':
    case 'all':
      return 'All sessions';
    case 'pinned':
      return 'Pinned in every session';
  }
}
