// Notes of the journal. A note belongs to the session that was current when it was written and
// stays there; notes are never deleted. Every function returns a new journal and leaves the one it
// was given. A note that is not there changes nothing.

import { caseFolded } from '../../text';
import type { Stamp } from '../stamp';
import { currentSession } from '../sessions';
import type { Journal, Note } from '../types';

export const NOTE_CATEGORIES = ['People & relationships', 'Clues', 'Places', 'Promises & boons', 'Unsorted'] as const;
export type NoteCategory = (typeof NOTE_CATEGORIES)[number];

export const UNSORTED: NoteCategory = 'Unsorted';

export const isCategory = (category: string): category is NoteCategory => (NOTE_CATEGORIES as readonly string[]).includes(category);

/** What a note with no title is called in a list. */
export const UNTITLED = 'Untitled note';

export const noteTitle = (note: Pick<Note, 'title'>): string => note.title.trim() || UNTITLED;

/** The category a note is filed under: one that is not among the five is Unsorted. */
export const categoryOf = (note: Pick<Note, 'category'>): NoteCategory => (isCategory(note.category) ? note.category : UNSORTED);

/** What a note holds that the player writes. */
export interface NoteFields {
  title: string;
  category: string;
  tags: string[];
  body: string;
}

export type AddedNote = { ok: true; journal: Journal; id: string } | { ok: false; reason: 'no-session' | 'unknown-category' };

/** Writes a new note in the current session. It fails when no session has been started, or the category is not one of the five. */
export function addNote(journal: Journal, input: Partial<NoteFields>, stamp: Stamp): AddedNote {
  const session = currentSession(journal);
  if (session === undefined) return { ok: false, reason: 'no-session' };
  const category = input.category ?? UNSORTED;
  if (!isCategory(category)) return { ok: false, reason: 'unknown-category' };
  const now = stamp.now();
  const note: Note = {
    id: stamp.newId(),
    sessionId: session.id,
    title: input.title ?? '',
    category,
    tags: uniqueTags(input.tags ?? []),
    pinned: false,
    body: input.body ?? '',
    createdAt: now,
    editedAt: now,
  };
  return { ok: true, journal: { ...journal, notes: [...journal.notes, note] }, id: note.id };
}

/** The journal with `change` applied to the note `id`: the same journal when the note is not there or `change` returns it as it was. */
const withNote = (journal: Journal, id: string, change: (note: Note) => Note): Journal => {
  const at = journal.notes.findIndex((note) => note.id === id);
  if (at === -1) return journal;
  const changed = change(journal.notes[at]);
  if (changed === journal.notes[at]) return journal;
  return { ...journal, notes: journal.notes.map((note, place) => (place === at ? changed : note)) };
};

const sameList = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((item, at) => item === b[at]);

/**
 * Changes what the player writes in a note, and stamps it edited when something did change. A category that
 * is not one of the five is left as it was.
 */
export function editNote(journal: Journal, id: string, patch: Partial<NoteFields>, stamp: Stamp): Journal {
  return withNote(journal, id, (note) => {
    const next: Note = {
      ...note,
      title: patch.title ?? note.title,
      category: patch.category !== undefined && isCategory(patch.category) ? patch.category : note.category,
      tags: patch.tags === undefined ? note.tags : uniqueTags(patch.tags),
      body: patch.body ?? note.body,
    };
    const unchanged =
      next.title === note.title && next.category === note.category && next.body === note.body && sameList(next.tags, note.tags);
    return unchanged ? note : { ...next, editedAt: stamp.now() };
  });
}

/** Pins an unpinned note and unpins a pinned one. Pinning is not editing: the note's time stays. */
export function togglePin(journal: Journal, id: string): Journal {
  return withNote(journal, id, (note) => ({ ...note, pinned: !note.pinned }));
}

/** A tag as it is kept: without a leading "#", its spaces collapsed. Empty when nothing is left. */
export const normalisedTag = (tag: string): string => tag.trim().replace(/^#+\s*/, '').replace(/\s+/g, ' ');

/** The tags with blanks dropped and a repeat (the same word in any case) kept once, in order. */
export function uniqueTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const tag of tags.map(normalisedTag)) {
    const key = caseFolded(tag);
    if (tag !== '' && !seen.has(key)) {
      seen.add(key);
      kept.push(tag);
    }
  }
  return kept;
}

export function addTag(journal: Journal, id: string, tag: string, stamp: Stamp): Journal {
  return editNote(journal, id, { tags: [...(journal.notes.find((note) => note.id === id)?.tags ?? []), tag] }, stamp);
}

export function removeTag(journal: Journal, id: string, tag: string, stamp: Stamp): Journal {
  const note = journal.notes.find((candidate) => candidate.id === id);
  if (note === undefined) return journal;
  return editNote(journal, id, { tags: note.tags.filter((kept) => caseFolded(kept) !== caseFolded(tag)) }, stamp);
}

/** "@" and then capitalised words ("@Camille Arnaud"), or any name in brackets ("@[Dr. Laurent]"). */
const MENTION = /@\[([^\]\n]+)\]|@(\p{Lu}[\p{L}\p{M}'’-]*(?:[ \t]+\p{Lu}[\p{L}\p{M}'’-]*)*)/gu;

const sameName = (a: string, b: string): boolean => caseFolded(a) === caseFolded(b);

const distinct = (names: readonly string[]): string[] => names.filter((name, at) => names.findIndex((other) => sameName(other, name)) === at);

/** The names a body mentions, in the order they first appear. */
export function mentionedNames(body: string): string[] {
  const names = [...body.matchAll(MENTION)].map((match) => (match[1] ?? match[2]).trim().replace(/\s+/g, ' '));
  return distinct(names.filter((name) => name !== ''));
}

export interface Mention {
  name: string;
  /** Added by hand: the only kind that can be removed without editing the body. */
  manual: boolean;
}

/** Every name a note mentions: those in its body, then those added by hand that the body does not already give. */
export function mentionsOf(note: Pick<Note, 'body' | 'mentions'>): Mention[] {
  const fromBody = mentionedNames(note.body);
  const added = distinct((note.mentions ?? []).map((name) => name.trim().replace(/\s+/g, ' ')).filter((name) => name !== ''));
  return [
    ...fromBody.map((name) => ({ name, manual: false })),
    ...added.filter((name) => !fromBody.some((given) => sameName(given, name))).map((name) => ({ name, manual: true })),
  ];
}

export function addMention(journal: Journal, id: string, name: string, stamp: Stamp): Journal {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (clean === '') return journal;
  return withNote(journal, id, (note) => {
    if (mentionsOf(note).some((mention) => sameName(mention.name, clean))) return note;
    return { ...note, mentions: [...(note.mentions ?? []), clean], editedAt: stamp.now() };
  });
}

export function removeMention(journal: Journal, id: string, name: string, stamp: Stamp): Journal {
  return withNote(journal, id, (note) => {
    const kept = (note.mentions ?? []).filter((added) => !sameName(added, name));
    return kept.length === (note.mentions ?? []).length ? note : { ...note, mentions: kept, editedAt: stamp.now() };
  });
}

/** The words search looks in: title, body, tags and mentioned names. */
export const noteSearchFields = (note: Note): string[] => [note.title, note.body, ...note.tags, ...mentionsOf(note).map((mention) => mention.name)];

/** A note's body as a line or two of plain text for a list: list and quote markers dropped, runs of space made one. */
export function excerptOf(body: string, most = 160): string {
  const plain = body
    .split(/\r\n|\r|\n/)
    .map((line) => line.replace(/^\s*(?:[-*]\s+\[[ xX]\]\s+|[-*]\s+|\d+[.)]\s+|>\s?)/, ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length <= most ? plain : `${plain.slice(0, most).trimEnd()}…`;
}
