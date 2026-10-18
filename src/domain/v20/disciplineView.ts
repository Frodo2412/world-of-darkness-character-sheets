// What the Disciplines tab shows: the character's Disciplines, or the whole catalogue, each with its
// powers as Known or Locked and the rules of each. Computed on every draw, never stored.

import type { V20Character } from './character';
import {
  DISCIPLINE_CATALOGUE,
  disciplineEntry,
  disciplineReadings,
  type DisciplineEntry,
  type DisciplineReading,
  type Power,
} from './disciplines';
import { diceLabel } from './identity';
import { countLabel } from './labels';
import { poolFormula } from './poolText';
import { dicePool, traitLabel, type PoolSelection } from './resources';

/** The rule fields of a power that a book entry may not state cleanly. */
export type PowerField = 'cost' | 'duration' | 'prerequisite' | 'difficulty' | 'summary';

/** What a field shows: its value, or where the book states it when the catalogue holds no clean value. */
export function fieldText(power: Power, field: PowerField): string {
  return power[field] ?? `See rulebook (V20 p. ${power.page})`;
}

export type PowerState = 'known' | 'locked';

/** A power rolled with the character's own ratings. */
export interface YourPool {
  dice: number;
  /** "Your pool: 5 dice". */
  text: string;
  /** "Charisma 3 + Performance 3 − wound 1". */
  formula: string;
  incapacitated: boolean;
}

export interface PowerView {
  name: string;
  /** The Discipline level that unlocks it. */
  level: number;
  state: PowerState;
  /** "Requires Presence 4" while Locked. */
  requires?: string;
  cost: string;
  duration: string;
  prerequisite: string;
  difficulty: string;
  summary: string;
  /** The dice pool as the rules name it ("Charisma + Performance"), or what is used instead ("No roll"). */
  poolRule: string;
  /** The attribute and ability the sheet rolls, "Charisma + Performance"; undefined when it does not roll. */
  rollLabel?: string;
  /** The words search looks in: the power's name and the book's summary, without the "See rulebook" stand-in. */
  searchText: string;
  /** Whether the sheet can compute a pool for it: an attribute + ability roll. */
  rolls: boolean;
  /** What a power without an attribute + ability roll uses instead; undefined for one that rolls. */
  usesInstead?: string;
  /** The character's pool: only for a Known power that rolls. */
  yourPool?: YourPool;
  /** What "Build pool" selects on the Character sheet: only for a Known power that rolls. */
  selection?: PoolSelection;
  page: number;
  /** "V20 p. 193". */
  reference: string;
}

export interface DisciplineView {
  /** Tells this view from every other in its list: the name, and "Name (2)" for a second row of the same Discipline. */
  key: string;
  name: string;
  rating: number;
  /** The dots shown: five, or ten when the rating is above five. */
  dots: number;
  /** "3 levels unlocked". */
  unlocked: string;
  /** What the Discipline does when it lists no powers, or what its powers depend on. */
  note?: string;
  /** In level order; none for a rating of 0 in the character's own list, nor for a Discipline the catalogue does not know. */
  powers: PowerView[];
}

export interface DisciplineViews {
  /** The Disciplines the player has named, in the order stored. */
  owned: DisciplineView[];
  /** Every catalogued Discipline; one the character lacks shows every power Locked. */
  all: DisciplineView[];
}

const DOTS = 5;
const MOST_DOTS = 10;

const levelsUnlocked = (rating: number): string => `${countLabel(rating, 'level', 'levels')} unlocked`;

function yourPoolOf(character: V20Character, selection: PoolSelection): YourPool {
  const pool = dicePool(character, selection);
  const dice = pool.total ?? 0;
  return { dice, text: `Your pool: ${diceLabel(dice)}`, formula: poolFormula(pool), incapacitated: pool.incapacitated };
}

/** The attribute and ability of a power's roll, in the words the rules use. */
function rollLabel(power: Power): string | undefined {
  if (power.roll === undefined) return undefined;
  const [attribute, ability] = power.roll;
  return `${traitLabel(`attributes.${attribute}`)} + ${traitLabel(`abilities.${ability}`)}`;
}

function powerView(character: V20Character, discipline: string, power: Power, level: number, rating: number): PowerView {
  const known = level <= rating;
  const label = rollLabel(power);
  const view: PowerView = {
    name: power.name,
    level,
    state: known ? 'known' : 'locked',
    cost: fieldText(power, 'cost'),
    duration: fieldText(power, 'duration'),
    prerequisite: fieldText(power, 'prerequisite'),
    difficulty: fieldText(power, 'difficulty'),
    summary: fieldText(power, 'summary'),
    poolRule: label === undefined ? (power.note ?? '') : power.note === undefined ? label : `${label} ${power.note}`,
    searchText: [power.name, power.summary].filter((part) => part !== undefined).join(' '),
    rolls: power.roll !== undefined,
    page: power.page,
    reference: `V20 p. ${power.page}`,
  };
  if (label !== undefined) view.rollLabel = label;
  if (!known) view.requires = `Requires ${discipline} ${level}`;
  if (power.roll === undefined) {
    view.usesInstead = power.note ?? '';
  } else if (known) {
    const [attribute, ability] = power.roll;
    view.selection = { attribute: `attributes.${attribute}`, ability: `abilities.${ability}` };
    view.yourPool = yourPoolOf(character, view.selection);
  }
  return view;
}

function disciplineViewOf(character: V20Character, key: string, name: string, rating: number, entry: DisciplineEntry | undefined): DisciplineView {
  const view: DisciplineView = {
    key,
    name,
    rating,
    dots: rating > DOTS ? MOST_DOTS : DOTS,
    unlocked: levelsUnlocked(rating),
    powers: (entry?.powers ?? []).map((power, index) => powerView(character, entry!.name, power, index + 1, rating)),
  };
  if (entry?.note !== undefined) view.note = entry.note;
  return view;
}

/**
 * The Disciplines tab's two lists. A Discipline the player named is shown with its rating; one rated 0,
 * or one the catalogue does not know, has its name and rating and no powers. Under All, a catalogued
 * Discipline the character lacks is like any other, rated 0, with every power Locked.
 */
export function disciplineView(character: V20Character): DisciplineViews {
  const readings: DisciplineReading[] = disciplineReadings(character);
  const seen = new Map<string, number>();
  const owned = readings.map((reading) => {
    const same = reading.name.trim().toLowerCase();
    const nth = (seen.get(same) ?? 0) + 1;
    seen.set(same, nth);
    const key = nth === 1 ? reading.name : `${reading.name} (${nth})`;
    return disciplineViewOf(character, key, reading.name, reading.rating, reading.rating > 0 ? disciplineEntry(reading.name) : undefined);
  });
  const all = DISCIPLINE_CATALOGUE.map((entry) => {
    const held = readings.find((reading) => reading.rating > 0 && disciplineEntry(reading.name) === entry);
    return disciplineViewOf(character, entry.name, entry.name, held?.rating ?? 0, entry);
  });
  return { owned, all };
}
