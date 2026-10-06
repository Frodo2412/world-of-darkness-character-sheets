// The character library as the roster shows it: what is stored, as entries.
// Pure: the page reads the stores and hands their records to `entriesOf`.

import { displayName, type V20Character } from './character';
import type { V20Build } from './creation/build';
import { buildSummary, identitySummary, monogram, temperamentOf } from './identity';
import { caseFolded, folded } from './text';

const UNNAMED_BUILD = 'Unnamed build';

/** What an entry with no chronicle is filed under. */
export const UNASSIGNED = 'Unassigned';

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
  /** The chronicle as typed, or `UNASSIGNED` when it is blank. */
  chronicleLabel: string;
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
interface EntrySource {
  id: string;
  name: string;
  nature: string;
  demeanor: string;
  chronicle: string;
  clan: string;
  concept: string;
  summary: string;
}

/** `displayName` is what the entry is called: the typed name, or a fallback when it is blank. */
function detailsOf(source: EntrySource, displayName: string): EntryDetails {
  const chronicle = source.chronicle.trim();
  return {
    id: source.id,
    name: displayName,
    monogram: monogram(source.name),
    summary: source.summary,
    temperament: temperamentOf(source.nature, source.demeanor),
    chronicle,
    chronicleLabel: chronicle || UNASSIGNED,
    clan: source.clan.trim(),
    concept: source.concept.trim(),
    chronicleKey: caseFolded(source.chronicle),
    clanKey: caseFolded(source.clan),
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
      displayName(character),
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
      name.trim() || UNNAMED_BUILD,
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

/** Names are the same when they match ignoring case and runs of space; accents count. */
const nameSlot = (kind: LibraryEntry['kind'], name: string): string =>
  `${kind}:${caseFolded(name).replace(/\s+/g, ' ')}`;

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
  // Ids sort in creation order within a store (see `generateId`); across the two stores
  // they do so as long as the clock moves forward.
  return numberRepeats(entries.sort(oldestFirst));
}

/** The tab that lists everything; the one a fresh page starts on. */
const ALL_TAB = 'all';
const ALL_LABEL = 'All characters';

/** The tab of entries with no chronicle. A chronicle's tab key starts with `chronicle:`, so this is never one. */
const UNASSIGNED_TAB = 'unassigned';

/** The value of `LibraryFilter.clan` that lists every clan. A clan key is never blank, so it cannot be one. */
export const ALL_CLANS = '';

/** Whether to list every entry, or only the characters that are ready to play. */
export type LibraryStatus = 'all' | 'ready';

/** What the player has chosen to see. Later steps add the order. */
export interface LibraryFilter {
  /** The key of a tab in `LibraryView.tabs`; one that no longer exists means All. */
  tab: string;
  /** The key of a clan in `LibraryView.clans`, or `ALL_CLANS`; one that no longer exists means all clans. */
  clan: string;
  /** `ready` keeps characters only: not builds, and not records that could not be read. */
  status: LibraryStatus;
  /** Text to find in an entry's name, clan or concept; blank finds everything. */
  search: string;
}

export const INITIAL_FILTER: LibraryFilter = { tab: ALL_TAB, clan: ALL_CLANS, status: 'all', search: '' };

/** The filter with the search, clan and status taken back; the tab they chose stays. */
export function clearedFilter(filter: LibraryFilter): LibraryFilter {
  const { clan, status, search } = INITIAL_FILTER;
  return { ...filter, clan, status, search };
}

/** The summary row's left side: how many entries are shown of how many are stored. */
export function countsLine(shown: number, stored: number): string {
  return `Showing ${shown} of ${stored} characters`;
}

/** One tab of the strip. The script draws " · count" itself; `label` is the name alone. */
export interface LibraryTab {
  /** Stable: it names the same tab whatever else changes. */
  key: string;
  label: string;
  /** Every entry in the tab, whatever any other filter says. */
  count: number;
}

/** One clan the filter offers. The script draws "All clans" itself, for `ALL_CLANS`. */
export interface LibraryClan {
  /** Stable: it names the same clan whatever else changes; never `ALL_CLANS`. */
  key: string;
  label: string;
}

/** How many entries each status holds, in the selected tab. */
export interface StatusCounts {
  all: number;
  ready: number;
}

export interface LibraryView {
  /** All characters first, then each chronicle alphabetically, then Unassigned. */
  tabs: LibraryTab[];
  /** The key of the selected tab: `filter.tab` when that tab exists, otherwise All. */
  tab: string;
  /** Each clan in use, alphabetically, as the oldest entry spells it. */
  clans: LibraryClan[];
  /** The key of the selected clan: `filter.clan` when that clan exists, otherwise `ALL_CLANS`. */
  clan: string;
  /** The entries of the selected tab by status, whatever the clan and the search say. */
  statusCounts: StatusCounts;
  shown: LibraryEntry[];
  countsLine: string;
  /** The summary row's right side, describing every stored entry: empty when no chronicle exists. */
  breakdown: string;
  /** `empty` when nothing is stored at all; `no-match` when something is, and the filters leave nothing to show. */
  state: 'entries' | 'empty' | 'no-match';
}

/** An entry that could be read, and so has a chronicle (possibly blank). */
const isReadable = (entry: LibraryEntry): entry is Extract<LibraryEntry, { chronicleKey: string }> =>
  'chronicleKey' in entry;

/** A readable entry that is filed under a chronicle. */
const hasChronicle = (entry: LibraryEntry): entry is Extract<LibraryEntry, { chronicleKey: string }> =>
  isReadable(entry) && entry.chronicleKey !== '';

/** Items that are the same text, whatever the case or surrounding space, as one named group. */
interface Group {
  key: string;
  /** As the group's oldest item spells it. */
  name: string;
  count: number;
}

/**
 * Groups `items` (oldest first) by their folded key, naming each group as its oldest item spells
 * it. Chronicles use it for their tabs and clans for the filter's options.
 */
function groupByKey<T>(items: readonly T[], keyOf: (item: T) => string, nameOf: (item: T) => string): Group[] {
  const groups = new Map<string, Group>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key);
    if (group === undefined) groups.set(key, { key, name: nameOf(item), count: 1 });
    else group.count += 1;
  }
  return [...groups.values()];
}

/** Groups in alphabetical order, ignoring case and accents; the key settles a tie. */
const alphabetically = (a: Group, b: Group): number =>
  folded(a.name) < folded(b.name) ? -1 : folded(a.name) > folded(b.name) ? 1 : a.key < b.key ? -1 : 1;

/** A chronicle's group, with the label its tab and the breakdown both show. */
interface Chronicle extends Group {
  label: string;
}

/** The tab of a chronicle, whatever it is called: it can never be the key of All or Unassigned. */
const chronicleTab = (chronicleKey: string): string => `chronicle:${chronicleKey}`;

/** The tab an entry is listed under besides All: no chronicle, or one that cannot be read, is Unassigned. */
const tabOf = (entry: LibraryEntry): string =>
  hasChronicle(entry) ? chronicleTab(entry.chronicleKey) : UNASSIGNED_TAB;

const SPECIAL_KEYS = [caseFolded(ALL_LABEL), caseFolded(UNASSIGNED)];

/**
 * Each chronicle's label: its name as typed, except that one called like a special tab is shown in
 * quotation marks, and in more of them until no other chronicle reads the same ("Unassigned" typed
 * with its own quotation marks is another chronicle, and keeps the plain spelling).
 */
function labelled(groups: readonly Group[]): Chronicle[] {
  const taken = new Set(groups.filter((group) => !SPECIAL_KEYS.includes(group.key)).map((group) => caseFolded(group.name)));
  return groups.map((group) => {
    if (!SPECIAL_KEYS.includes(group.key)) return { ...group, label: group.name };
    let label = `"${group.name}"`;
    while (taken.has(caseFolded(label))) label = `"${label}"`;
    taken.add(caseFolded(label));
    return { ...group, label };
  });
}

/** The chronicles in use, alphabetical, each named as its oldest entry spells it. */
const chroniclesOf = (entries: readonly LibraryEntry[]): Chronicle[] =>
  labelled(
    groupByKey(
      entries.filter(hasChronicle),
      (entry) => entry.chronicleKey,
      (entry) => entry.chronicle,
    ).sort(alphabetically),
  );

/** The summary row's right side: where all stored entries stand, whichever tab is selected. */
function breakdownOf(chronicles: readonly Chronicle[], stored: number): string {
  if (chronicles.length === 0) return '';
  const chronicled = chronicles.reduce((total, chronicle) => total + chronicle.count, 0);
  const where = chronicles.length === 1 ? chronicles[0].label : `${chronicles.length} chronicles`;
  const unassigned = stored - chronicled;
  return [`${chronicled} in ${where}`, ...(unassigned > 0 ? [`${unassigned} unassigned`] : [])].join(' · ');
}

/** A readable entry that names a clan. */
const hasClan = (entry: LibraryEntry): entry is Extract<LibraryEntry, { clanKey: string }> =>
  isReadable(entry) && entry.clanKey !== '';

/** The clans in use, alphabetical, each named as its oldest entry spells it. */
const clansOf = (entries: readonly LibraryEntry[]): LibraryClan[] =>
  groupByKey(
    entries.filter(hasClan),
    (entry) => entry.clanKey,
    (entry) => entry.clan,
  )
    .sort(alphabetically)
    .map(({ key, name }) => ({ key, label: name }));

/** Says whether an entry passes one filter. */
type Predicate = (entry: LibraryEntry) => boolean;

/** One predicate per filter, as a list; the filters combine with AND. */
const keepingAll =
  (...predicates: Predicate[]): Predicate =>
  (entry) =>
    predicates.every((passes) => passes(entry));

/** The entries listed under `tab`; All lists everything. */
const inTab =
  (tab: string): Predicate =>
  (entry) =>
    tab === ALL_TAB || tabOf(entry) === tab;

/** The entries of the chosen clan; `ALL_CLANS` keeps everything. An entry with no clan, or that could not be read, has none to choose. */
const inClan =
  (clan: string): Predicate =>
  (entry) =>
    clan === ALL_CLANS || (hasClan(entry) && entry.clanKey === clan);

/** Everything under `all`; under `ready` only characters: not builds, and not records that could not be read. */
const hasStatus =
  (status: LibraryStatus): Predicate =>
  (entry) =>
    status === 'all' || entry.kind === 'character';

/**
 * The entries whose name (as displayed), clan or concept holds `search`, ignoring case and accents.
 * A blank search keeps everything. An entry that could not be read has no text, so only a blank search keeps it.
 */
const matchesSearch = (search: string): Predicate => {
  const wanted = folded(search);
  return (entry) =>
    wanted === '' || (isReadable(entry) && [entry.name, entry.clan, entry.concept].some((text) => folded(text).includes(wanted)));
};

/** What the roster draws for `entries` (oldest first) under `filter`. */
export function view(entries: readonly LibraryEntry[], filter: LibraryFilter): LibraryView {
  const chronicles = chroniclesOf(entries);
  const unassigned = entries.filter((entry) => tabOf(entry) === UNASSIGNED_TAB).length;
  const tabs = [
    { key: ALL_TAB, label: ALL_LABEL, count: entries.length },
    ...chronicles.map(({ key, label, count }) => ({ key: chronicleTab(key), label, count })),
    ...(chronicles.length > 0 && unassigned > 0
      ? [{ key: UNASSIGNED_TAB, label: UNASSIGNED, count: unassigned }]
      : []),
  ];
  const tab = tabs.some((candidate) => candidate.key === filter.tab) ? filter.tab : ALL_TAB;
  const clans = clansOf(entries);
  const clan = clans.some((candidate) => candidate.key === filter.clan) ? filter.clan : ALL_CLANS;
  // The four filters are one list, so an entry is looked at once.
  const shown = entries.filter(
    keepingAll(inTab(tab), inClan(clan), hasStatus(filter.status), matchesSearch(filter.search)),
  );
  const inSelectedTab = entries.filter(inTab(tab));
  return {
    tabs,
    tab,
    clans,
    clan,
    statusCounts: { all: inSelectedTab.length, ready: inSelectedTab.filter(hasStatus('ready')).length },
    shown,
    countsLine: countsLine(shown.length, entries.length),
    breakdown: breakdownOf(chronicles, entries.length),
    state: entries.length === 0 ? 'empty' : shown.length === 0 ? 'no-match' : 'entries',
  };
}
