// What the Combat tab lists. One `section` state serves both controls: the All / Close combat /
// Ranged combat filter chooses it, and so do the Melee / Ranged sub-tabs, so the two never disagree.
// A search narrows what the section lists.

import { MANOEUVRES, type Manoeuvre } from '../../domain/v20/combat/data/manoeuvres';
import { RANGED_WEAPONS } from '../../domain/v20/combat/data/ranged';
import type { MeleeWeapon, RangedWeapon } from '../../domain/v20/combat/data/types';
import { MELEE_WEAPONS } from '../../domain/v20/combat/data/weapons';
import { filterBy } from '../../scripts/dossier/filterBy';

/** Which tables are listed: both, the close combat ones, or the ranged ones. */
export type Section = 'all' | 'melee' | 'ranged';

/** The options of the filter, in order. */
export const SECTION_FILTERS: readonly { value: Section; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'melee', label: 'Close combat' },
  { value: 'ranged', label: 'Ranged combat' },
];

/** What the four tables hold for a section and a search. */
export interface Listing {
  meleeManoeuvres: Manoeuvre[];
  rangedManoeuvres: Manoeuvre[];
  meleeWeapons: MeleeWeapon[];
  rangedWeapons: RangedWeapon[];
}

const manoeuvresOf = (section: 'melee' | 'ranged'): Manoeuvre[] => MANOEUVRES.filter((manoeuvre) => manoeuvre.section === section);

/**
 * The manoeuvres and weapons of the section whose name has every word of `query`; a weapon is also
 * found by its note ("blunt objects"). An empty query leaves the whole section.
 */
export function listing(section: Section, query: string): Listing {
  const manoeuvres = (rows: Manoeuvre[]): Manoeuvre[] => filterBy(rows, query, ({ name }) => [name]);
  const weapons = <W extends MeleeWeapon | RangedWeapon>(rows: readonly W[]): W[] => filterBy(rows, query, ({ name, note }) => [name, note]);
  const melee = section !== 'ranged';
  const ranged = section !== 'melee';
  return {
    meleeManoeuvres: melee ? manoeuvres(manoeuvresOf('melee')) : [],
    rangedManoeuvres: ranged ? manoeuvres(manoeuvresOf('ranged')) : [],
    meleeWeapons: melee ? weapons(MELEE_WEAPONS) : [],
    rangedWeapons: ranged ? weapons(RANGED_WEAPONS) : [],
  };
}

/** How many rows the four tables hold together. */
export const listedCount = (listed: Listing): number =>
  listed.meleeManoeuvres.length + listed.rangedManoeuvres.length + listed.meleeWeapons.length + listed.rangedWeapons.length;
