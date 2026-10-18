// Every change the Character record makes to what is stored in it. Each function returns a new record
// and leaves the one it was given; an index that is not there changes nothing.

import type { BloodBond, CharacterRecord, Derangement, Description, Goal, ItemEntry } from '../types';

/** What the player is told when a blood bond's rating is put right. */
export const RATING_MESSAGE = 'Rating kept between 0 and 10.';

export const LOWEST_RATING = 0;
export const HIGHEST_RATING = 10;

/** A bond's rating is a whole number from 0 to 10: anything else becomes the nearest that is, and says so. */
export function clampRating(value: number): { rating: number; corrected: boolean } {
  const rating = Number.isNaN(value) ? LOWEST_RATING : Math.min(HIGHEST_RATING, Math.max(LOWEST_RATING, Math.trunc(value)));
  return { rating, corrected: rating !== value };
}

export type ListKey = 'gear' | 'equipment' | 'bloodBonds' | 'derangements' | 'goals';

export interface EntryTypes {
  gear: ItemEntry;
  equipment: ItemEntry;
  bloodBonds: BloodBond;
  derangements: Derangement;
  goals: Goal;
}

/** What a new entry holds: nothing written, except the kind a bond or a derangement usually is. */
const BLANK: { [K in ListKey]: () => EntryTypes[K] } = {
  gear: () => ({ item: '', detail: '' }),
  equipment: () => ({ item: '', detail: '' }),
  bloodBonds: () => ({ name: '', relation: '', rating: 0, type: 'Blood Bond' }),
  derangements: () => ({ name: '', status: 'Active', note: '' }),
  goals: () => ({ text: '', kind: '' }),
};

const inRange = (list: readonly unknown[], index: number): boolean => Number.isInteger(index) && index >= 0 && index < list.length;

/** The record with one list replaced. */
const withList = <K extends ListKey>(record: CharacterRecord, key: K, list: EntryTypes[K][]): CharacterRecord => ({ ...record, [key]: list });

const listOf = <K extends ListKey>(record: CharacterRecord, key: K): EntryTypes[K][] => record[key] as EntryTypes[K][];

/** Adds a new entry after the last one. */
export function addEntry(record: CharacterRecord, key: ListKey): CharacterRecord {
  return withList(record, key, [...listOf(record, key), BLANK[key]()] as never);
}

/** Changes the fields given of the entry at `index`; a bond's rating is kept to 0-10. */
export function setEntry<K extends ListKey>(record: CharacterRecord, key: K, index: number, change: Partial<EntryTypes[K]>): CharacterRecord {
  const list = listOf(record, key);
  if (!inRange(list, index)) return record;
  const kept: Partial<EntryTypes[K]> = { ...change };
  if (key === 'bloodBonds' && 'rating' in kept) {
    (kept as Partial<BloodBond>).rating = clampRating(Number((kept as Partial<BloodBond>).rating)).rating;
  }
  return withList(record, key, list.map((entry, at) => (at === index ? { ...entry, ...kept } : entry)));
}

/** What was taken out, and where: all that is needed to put it back exactly. */
export type Removal = { [K in ListKey]: { key: K; index: number; entry: EntryTypes[K] } }[ListKey];

/** Takes the entry at `index` out. Nothing is returned when there is no such entry. */
export function removeEntry(record: CharacterRecord, key: ListKey, index: number): { record: CharacterRecord; removal: Removal } | undefined {
  const list = listOf(record, key);
  if (!inRange(list, index)) return undefined;
  return {
    record: withList(record, key, list.filter((_, at) => at !== index)),
    removal: { key, index, entry: list[index] } as Removal,
  };
}

/** Puts a removed entry back where it was, or last when the list is now shorter. */
export function restoreEntry(record: CharacterRecord, removal: Removal): CharacterRecord {
  const list = [...listOf(record, removal.key)];
  list.splice(Math.min(removal.index, list.length), 0, removal.entry);
  return withList(record, removal.key, list);
}

/** Sets one description field to what was typed. */
export function setDescription(record: CharacterRecord, field: keyof Description, text: string): CharacterRecord {
  return { ...record, description: { ...record.description, [field]: text } };
}
