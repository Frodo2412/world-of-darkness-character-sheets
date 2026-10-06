// The character library as the roster shows it: what is stored, as entries.
// Pure: the page reads the stores and hands their records to `entriesOf`.

import { UNNAMED_CHARACTER, type V20Character } from './character';
import type { V20Build } from './creation/build';
import { buildSummary, identitySummary, monogram, temperamentOf } from './identity';
import { folded } from './text';

const UNNAMED_BUILD = 'Unnamed build';

/** What an entry that could be read shows. */
interface EntryDetails {
  id: string;
  /** As displayed: a blank name falls back, and repeats are numbered. */
  name: string;
  monogram: string;
  summary: string;
  temperament: string;
  /** Trimmed; empty when unassigned. */
  chronicle: string;
  clan: string;
  concept: string;
  chronicleKey: string;
  clanKey: string;
}

/** A record that could not be read has no text, so no filter can match it. */
export type LibraryEntry =
  | ({ kind: 'character' } & EntryDetails)
  | ({ kind: 'build' } & EntryDetails)
  | { kind: 'unreadable-character'; id: string }
  | { kind: 'unreadable-build'; id: string };

/** What the stores list, as plain data. */
export type CharacterRecord =
  | { kind: 'character'; character: V20Character }
  | { kind: 'unreadable'; id: string };
export type BuildRecord = { kind: 'build'; build: V20Build } | { kind: 'unreadable'; id: string };

export interface LibraryRecords {
  characters: readonly CharacterRecord[];
  builds: readonly BuildRecord[];
}

/** The parts of a record's text an entry is made from. */
interface Text {
  id: string;
  name: string;
  nature: string;
  demeanor: string;
  chronicle: string;
  clan: string;
  concept: string;
  summary: string;
}

function detailsOf(text: Text, unnamed: string): EntryDetails {
  return {
    id: text.id,
    name: text.name.trim() || unnamed,
    monogram: monogram(text.name),
    summary: text.summary,
    temperament: temperamentOf(text.nature, text.demeanor),
    chronicle: text.chronicle.trim(),
    clan: text.clan.trim(),
    concept: text.concept.trim(),
    chronicleKey: folded(text.chronicle),
    clanKey: folded(text.clan),
  };
}

/** The entry `read` makes, or `unreadable` when reading the record throws. */
function attempt(read: () => LibraryEntry, unreadable: LibraryEntry): LibraryEntry {
  try {
    return read();
  } catch {
    // One record that cannot be read must not take the rest of the library with it.
    return unreadable;
  }
}

function readCharacter(character: V20Character): LibraryEntry {
  const { name, nature, demeanor, chronicle, clan, concept } = character.header;
  const summary = identitySummary(character);
  return {
    kind: 'character',
    ...detailsOf(
      { id: character.id, name, nature, demeanor, chronicle, clan, concept, summary },
      UNNAMED_CHARACTER,
    ),
  };
}

function readBuild(build: V20Build): LibraryEntry {
  const { name, nature, demeanor, chronicle, concept } = build.concept;
  const summary = buildSummary(build.clan, concept);
  return {
    kind: 'build',
    ...detailsOf(
      { id: build.id, name, nature, demeanor, chronicle, clan: build.clan, concept, summary },
      UNNAMED_BUILD,
    ),
  };
}

function characterEntry(record: CharacterRecord): LibraryEntry {
  if (record.kind === 'unreadable') return { kind: 'unreadable-character', id: record.id };
  const { character } = record;
  return attempt(() => readCharacter(character), {
    kind: 'unreadable-character',
    id: character.id,
  });
}

function buildEntry(record: BuildRecord): LibraryEntry {
  if (record.kind === 'unreadable') return { kind: 'unreadable-build', id: record.id };
  const { build } = record;
  return attempt(() => readBuild(build), { kind: 'unreadable-build', id: build.id });
}

const oldestFirst = (a: LibraryEntry, b: LibraryEntry): number =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

const nameSlot = (kind: LibraryEntry['kind'], name: string): string => `${kind}:${name}`;

/**
 * Repeated names made distinct within a kind ("Lucita", "Lucita 2", …), so every
 * action on the roster has its own accessible name. Entries are oldest first;
 * the older one keeps the plain name, and a number another entry carries is skipped.
 */
function numberRepeats(entries: LibraryEntry[]): LibraryEntry[] {
  const taken = new Set(
    entries.flatMap((entry) => ('name' in entry ? [nameSlot(entry.kind, entry.name)] : [])),
  );
  const seen = new Set<string>();
  return entries.map((entry) => {
    if (!('name' in entry)) return entry;
    const plain = nameSlot(entry.kind, entry.name);
    if (!seen.has(plain)) {
      seen.add(plain);
      return entry;
    }
    let count = 2;
    while (taken.has(nameSlot(entry.kind, `${entry.name} ${count}`))) count += 1;
    const name = `${entry.name} ${count}`;
    taken.add(nameSlot(entry.kind, name));
    return { ...entry, name };
  });
}

/** Every stored record as an entry, oldest first. */
export function entriesOf({ characters, builds }: LibraryRecords): LibraryEntry[] {
  const entries = [...characters.map(characterEntry), ...builds.map(buildEntry)];
  // Ids sort in creation order, in both stores (see `generateId`).
  return numberRepeats(entries.sort(oldestFirst));
}

/**
 * What the player has chosen to see. Later steps add the chronicle tab, search
 * text, clan, status and order; for now nothing narrows the library.
 */
export type LibraryFilter = Record<never, never>;

export const INITIAL_FILTER: LibraryFilter = {};

/** The summary row's left side: how many entries are shown of how many are stored. */
export function countsLine(shown: number, stored: number): string {
  return `Showing ${shown} of ${stored} characters`;
}

export interface LibraryView {
  shown: LibraryEntry[];
  countsLine: string;
  /** `empty` when nothing is stored at all. */
  state: 'entries' | 'empty';
}

/** What the roster draws for `entries` (oldest first) under `filter`. */
export function view(entries: readonly LibraryEntry[], _filter: LibraryFilter): LibraryView {
  const shown = [...entries];
  return {
    shown,
    countsLine: countsLine(shown.length, entries.length),
    state: entries.length === 0 ? 'empty' : 'entries',
  };
}
