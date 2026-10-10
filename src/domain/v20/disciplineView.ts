// What the Disciplines tab shows: the character's Disciplines (or all seventeen) with what their
// rating unlocks, each power Known or Locked. Computed on every draw, never stored. The powers'
// rules come from the catalogue and their dice pools from `disciplineReadings`.

import { countLabel } from './labels';
import {
  DISCIPLINE_CATALOGUE,
  disciplineReadings,
  type DisciplineEntry,
  type DisciplineReading,
  type Power,
  type PowerReading,
} from './disciplines';
import { dicePool, type DicePool } from './resources';
import type { V20Character } from './character';

/** The most levels a Discipline has: the rating shows as "N / 5" and unlocks at most this many. */
export const DISCIPLINE_LEVELS = 5;

/** Which Disciplines the list holds: the ones the character has, or the whole catalogue. */
export type DisciplineScope = 'owned' | 'all';

/** The rule fields of a power a reader may find the book does not state cleanly. */
export type PowerField = 'cost' | 'duration' | 'prerequisite' | 'difficulty';

export interface PowerView {
  name: string;
  /** 1 for the first power of the Discipline. */
  level: number;
  /** Known when the rating reaches its level; otherwise Locked. */
  state: 'known' | 'locked';
  /** Locked powers only: what unlocks it, as "Requires Presence 4". */
  requirement?: string;
  /** What the catalogue says of it; read a field through `fieldText`. */
  rule: Power;
  /** The attribute and ability it rolls, as "Charisma + Performance"; absent when it uses no roll. */
  rolls?: string;
  /** The character's own pool, less the wound: Known powers that roll only. */
  pool?: DicePool;
}

export interface DisciplineView {
  /** Names the Discipline whatever its case and spacing; unique in a list. */
  key: string;
  name: string;
  rating: number;
  /** "3 / 5". */
  ratingText: string;
  /** "3 levels unlocked": the rating in dots, capped at five, whether or not the catalogue lists powers. */
  unlockedText: string;
  /** What the Discipline does when it lists no powers, as the catalogue words it. */
  note?: string;
  powers: PowerView[];
}

export interface DisciplineListView {
  disciplines: DisciplineView[];
  /** How many Disciplines the character has (rated 1 or more): the "Owned · N" count, whichever list is shown. */
  ownedCount: number;
}

/** Names match whatever their case and spacing, as the catalogue's lookup does: "  dominate " is Dominate. */
const keyOf = (name: string): string => name.trim().replace(/\s+/g, ' ').toLowerCase();

const ENTRY_BY_KEY = new Map(DISCIPLINE_CATALOGUE.map((entry) => [keyOf(entry.name), entry]));

/** The power's rule field as the book states it, or where to look when the book's wording was not extracted. */
export function fieldText(power: Power, field: PowerField): string {
  return power[field] ?? `See rulebook (V20 p. ${power.page})`;
}

/** The pool's two traits as "Charisma + Performance". */
const rollOf = ({ attribute, ability }: DicePool): string =>
  [attribute, ability]
    .filter((term) => term !== undefined)
    .map((term) => term.label)
    .join(' + ');

function powerView(character: V20Character, entry: DisciplineEntry, level: number, known?: PowerReading): PowerView {
  const rule = entry.powers[level - 1];
  const view: PowerView = { name: rule.name, level, state: known === undefined ? 'locked' : 'known', rule };
  if (known === undefined) view.requirement = `Requires ${rule.prerequisite ?? `${entry.name} ${level}`}`;
  if (rule.roll !== undefined) {
    const [attribute, ability] = rule.roll;
    // A Locked power has no pool of the character's own; its pool is read only for the names of its traits.
    const pool = known?.pool ?? dicePool(character, { attribute: `attributes.${attribute}`, ability: `abilities.${ability}` });
    view.rolls = rollOf(pool);
    if (known !== undefined) view.pool = pool;
  }
  return view;
}

function viewOf(
  character: V20Character,
  name: string,
  rating: number,
  entry: DisciplineEntry | undefined,
  reading?: DisciplineReading,
): DisciplineView {
  // A row rated 0 lists no powers (the character has none of them); a Discipline with no row at all lists every power Locked.
  const listsPowers = entry !== undefined && (reading === undefined || rating >= 1);
  const powers = listsPowers
    ? entry.powers.map((_, index) => powerView(character, entry, index + 1, reading?.powers[index]))
    : [];
  const view: DisciplineView = {
    key: keyOf(name),
    name,
    rating,
    ratingText: `${rating} / ${DISCIPLINE_LEVELS}`,
    unlockedText: `${countLabel(Math.min(rating, DISCIPLINE_LEVELS), 'level', 'levels')} unlocked`,
    powers,
  };
  if (entry?.note !== undefined) view.note = entry.note;
  return view;
}

/** The character's rows, one to a Discipline: a Discipline named twice counts at its higher rating, where it first stands. */
function rowsByKey(readings: readonly DisciplineReading[]): Map<string, DisciplineReading> {
  const rows = new Map<string, DisciplineReading>();
  for (const reading of readings) {
    const key = keyOf(reading.name);
    const held = rows.get(key);
    if (held === undefined || reading.rating > held.rating) rows.set(key, reading);
  }
  return rows;
}

/**
 * The Disciplines list for `scope`. Owned is the named Disciplines rated 1 or more, in the order
 * stored; All is the seventeen of the catalogue and then any named Discipline the catalogue does
 * not know.
 */
export function disciplineView(character: V20Character, scope: DisciplineScope): DisciplineListView {
  const rows = rowsByKey(disciplineReadings(character));
  const viewOfRow = (reading: DisciplineReading): DisciplineView => {
    const entry = ENTRY_BY_KEY.get(keyOf(reading.name));
    return viewOf(character, entry?.name ?? reading.name, reading.rating, entry, reading);
  };
  const owned = [...rows.values()].filter((reading) => reading.rating >= 1).map(viewOfRow);
  if (scope === 'owned') return { disciplines: owned, ownedCount: owned.length };

  const catalogued = DISCIPLINE_CATALOGUE.map((entry) => {
    const reading = rows.get(keyOf(entry.name));
    return reading === undefined ? viewOf(character, entry.name, 0, entry) : viewOfRow(reading);
  });
  const unknown = [...rows.values()].filter((reading) => !ENTRY_BY_KEY.has(keyOf(reading.name))).map(viewOfRow);
  return { disciplines: [...catalogued, ...unknown], ownedCount: owned.length };
}
