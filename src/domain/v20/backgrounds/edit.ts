// The changes the Backgrounds tab makes to the character: add, change, remove and put back an entry
// of any of its five lists. Every function takes the character and gives the changed one; nothing is
// touched in place. Whatever happens, the backgrounds stay a valid list: the six base rows are never
// taken out, so there are always at least six.

import type { V20Character } from '../character';
import { HAVEN_KINDS, MERIT_CATEGORIES, type BackgroundRow, type Flaw, type Haven, type Merit, type OtherTrait, type Person } from '../dossier/types';
import { BACKGROUND_ROWS, RATING_RANGE } from '../traits';

/** The five lists of the tab, each a field of the character. */
export type Family = 'backgrounds' | 'havens' | 'merits' | 'flaws' | 'otherTraits';

/** The entry each list holds. */
export interface EntryOf {
  backgrounds: BackgroundRow;
  havens: Haven;
  merits: Merit;
  flaws: Flaw;
  otherTraits: OtherTrait;
}

/** What the player is told when a points value is corrected. */
export const POINTS_MESSAGE = 'Points kept at 0 or more.';
/** What the player is told when a rating is corrected. */
export const RATING_MESSAGE = 'Rating kept between 0 and 10.';

/** A value as the character will keep it, and what to tell the player when that is not what was entered. */
export interface Corrected {
  value: number;
  message?: string;
}

const clamp = (value: number, { min, max }: { min: number; max: number }): number => Math.min(Math.max(value, min), max);

/** Points are whole and never below 0. */
export function correctedPoints(entered: number): Corrected {
  const value = Math.max(0, Math.round(entered));
  return entered < 0 ? { value, message: POINTS_MESSAGE } : { value };
}

/** A rating is whole and between 0 and 10. */
export function correctedRating(entered: number): Corrected {
  const value = clamp(Math.round(entered), RATING_RANGE);
  return entered < RATING_RANGE.min || entered > RATING_RANGE.max ? { value, message: RATING_MESSAGE } : { value };
}

const BLANK: { [F in Family]: () => EntryOf[F] } = {
  backgrounds: () => ({ name: '', rating: 0 }),
  havens: () => ({ name: '', kind: HAVEN_KINDS[0], description: '', location: '', access: '', security: '' }),
  merits: () => ({ name: '', category: MERIT_CATEGORIES[0], points: 0, note: '' }),
  flaws: () => ({ name: '', category: MERIT_CATEGORIES[0], points: 0, note: '' }),
  otherTraits: () => ({ name: '', kind: '', note: '' }),
};

const rowsOf = <F extends Family>(character: V20Character, family: F): EntryOf[F][] => character[family] as EntryOf[F][];

const withRows = <F extends Family>(character: V20Character, family: F, rows: EntryOf[F][]): V20Character => ({
  ...character,
  [family]: rows,
});

/** Whether the list has an entry at the place. */
const has = (rows: readonly unknown[], index: number): boolean => Number.isInteger(index) && index >= 0 && index < rows.length;

/** A base row that holds nothing: there is nothing in it to remove. */
const isBlankBase = (row: BackgroundRow, index: number): boolean =>
  index < BACKGROUND_ROWS && row.name === '' && row.rating === 0 && !row.summary && !row.note && !(row.people?.length);

/** The entry at the place, or undefined when there is none. */
export function entryAt<F extends Family>(character: V20Character, family: F, index: number): EntryOf[F] | undefined {
  const rows = rowsOf(character, family);
  return has(rows, index) ? rows[index] : undefined;
}

/** The entry kept as the list keeps it: points and ratings corrected, an unrated trait without a `rating` at all. */
function kept<F extends Family>(entry: EntryOf[F]): EntryOf[F] {
  const next = { ...entry } as EntryOf[F] & { points?: number; rating?: number };
  if (next.points !== undefined) next.points = correctedPoints(next.points).value;
  if (next.rating === undefined) delete next.rating;
  else next.rating = correctedRating(next.rating).value;
  return next;
}

/** Appends a blank entry to the list (a background goes after the six base rows, or the rows added since). */
export function addEntry(character: V20Character, family: Family): V20Character {
  return withRows(character, family, [...rowsOf(character, family), BLANK[family]()] as never);
}

export const addBackground = (character: V20Character): V20Character => addEntry(character, 'backgrounds');
export const addMerit = (character: V20Character): V20Character => addEntry(character, 'merits');
export const addFlaw = (character: V20Character): V20Character => addEntry(character, 'flaws');
export const addHaven = (character: V20Character): V20Character => addEntry(character, 'havens');
export const addOtherTrait = (character: V20Character): V20Character => addEntry(character, 'otherTraits');

/** Changes some fields of the entry at the place. Points and ratings are corrected; a place with no entry changes nothing. */
export function updateEntry<F extends Family>(
  character: V20Character,
  family: F,
  index: number,
  change: Partial<EntryOf[F]>,
): V20Character {
  const rows = rowsOf(character, family);
  if (!has(rows, index)) return character;
  return withRows(character, family, rows.map((row, place) => (place === index ? kept({ ...row, ...change }) : row)));
}

/** Changes the summary, the note or the people of a background; its name and rating are kept. */
export function setBackgroundDetail(
  character: V20Character,
  index: number,
  detail: Partial<Pick<BackgroundRow, 'summary' | 'note' | 'people'>>,
): V20Character {
  return updateEntry(character, 'backgrounds', index, detail);
}

const peopleOf = (character: V20Character, index: number): Person[] => entryAt(character, 'backgrounds', index)?.people ?? [];

/** Adds a person with no name or role to a background. */
export function addPerson(character: V20Character, index: number): V20Character {
  if (entryAt(character, 'backgrounds', index) === undefined) return character;
  return setBackgroundDetail(character, index, { people: [...peopleOf(character, index), { name: '', role: '' }] });
}

/** Changes the name or the role of one person of a background. */
export function setPerson(character: V20Character, index: number, person: number, change: Partial<Person>): V20Character {
  const people = peopleOf(character, index);
  if (!has(people, person)) return character;
  return setBackgroundDetail(character, index, { people: people.map((existing, place) => (place === person ? { ...existing, ...change } : existing)) });
}

/** Takes one person off a background. */
export function removePerson(character: V20Character, index: number, person: number): V20Character {
  const people = peopleOf(character, index);
  if (!has(people, person)) return character;
  return setBackgroundDetail(character, index, { people: people.filter((_existing, place) => place !== person) });
}

/** Whether removing the entry would do anything: a blank base row has nothing to remove, and a place with no entry nothing at all. */
export function canRemove(character: V20Character, family: Family, index: number): boolean {
  const rows = rowsOf(character, family);
  if (!has(rows, index)) return false;
  return family !== 'backgrounds' || !isBlankBase(rows[index] as BackgroundRow, index);
}

/**
 * Removes the entry at the place. One of the six base backgrounds is blanked where it stands, so six
 * always remain; anything else is taken out of its list. A place with no entry changes nothing.
 */
export function removeEntry(character: V20Character, family: Family, index: number): V20Character {
  const rows = rowsOf(character, family);
  if (!has(rows, index)) return character;
  if (family === 'backgrounds' && index < BACKGROUND_ROWS) {
    return withRows(character, 'backgrounds', character.backgrounds.map((row, place) => (place === index ? BLANK.backgrounds() : row)));
  }
  return withRows(character, family, rows.filter((_row, place) => place !== index) as never);
}

/**
 * Puts a removed entry back, every field as it was, at the place it was removed from: into the blank
 * base row, or back among the entries it was taken out of (at the end when the list has since shrunk).
 */
export function restoreEntry<F extends Family>(character: V20Character, family: F, index: number, entry: EntryOf[F]): V20Character {
  const rows = rowsOf(character, family);
  if (family === 'backgrounds' && has(rows, index) && index < BACKGROUND_ROWS) {
    return withRows(character, family, rows.map((row, place) => (place === index ? entry : row)));
  }
  const at = Math.min(Math.max(index, 0), rows.length);
  return withRows(character, family, [...rows.slice(0, at), entry, ...rows.slice(at)]);
}
