// How the Character record names and counts what it holds. Computed on every draw, never stored.

import { countLabel } from '../../labels';
import type { CharacterRecord, Description } from '../types';
import type { ListKey } from './edit';

/** The description's fields in the order the page shows them, with their labels: the one place that lists them. */
export const DESCRIPTION_FIELDS: readonly { field: keyof Description; label: string }[] = [
  { field: 'apparentAge', label: 'Apparent Age' },
  { field: 'dateOfBirth', label: 'Date of Birth' },
  { field: 'rip', label: 'R.I.P.' },
  { field: 'hair', label: 'Hair' },
  { field: 'eyes', label: 'Eyes' },
  { field: 'nationality', label: 'Nationality' },
  { field: 'heightWeight', label: 'Height / Weight' },
  { field: 'sex', label: 'Sex' },
];

/** What a description field shows while nothing is written in it. */
export const NOT_RECORDED = 'Not recorded';

/** The singular name of each kind of entry, for the names controls and removals go by: "gear 2", "blood bond 1". */
export const ENTRY_NOUN: Readonly<Record<ListKey, string>> = {
  gear: 'gear',
  equipment: 'equipment',
  bloodBonds: 'blood bond',
  derangements: 'derangement',
  goals: 'goal',
};

/** What an entry is called in a message: its own words when it has any, else its place ("goal 2"). */
export function entryName(key: ListKey, index: number, words: string): string {
  const own = words.trim();
  return own === '' ? `${ENTRY_NOUN[key]} ${index + 1}` : own;
}

/** "1 active": the derangements whose status says Active. */
export function activeDerangements(record: CharacterRecord): string {
  return `${record.derangements.filter((entry) => entry.status.trim().toLowerCase() === 'active').length} active`;
}

/** "3 entries". */
export const entryCount = (n: number): string => countLabel(n, 'entry', 'entries');
