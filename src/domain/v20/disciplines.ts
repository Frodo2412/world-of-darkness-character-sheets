// The V20 Discipline powers as data, and what a character's Disciplines give
// them in play: the powers their rating reaches, each with its dice pool.
// Computed on every draw, never stored. The powers and their rolls are the
// System entries of V20 chapter four (Disciplines).

import { namedRows, type V20Character } from './character';
import { DISCIPLINE_CATALOGUE } from './disciplineData';
import { dicePool, type DicePool } from './resources';
import type { AbilityKey, AttributeKey } from './traits';

export { DISCIPLINE_CATALOGUE };

/** One power of a Discipline. A power with no attribute + ability roll says in `note` what it uses instead; one with a roll may add to it. */
export interface Power {
  readonly name: string;
  readonly roll?: readonly [AttributeKey, AbilityKey];
  readonly note?: string;
  /** What activating it spends, as V20 chapter four states it; "None" when the entry spends nothing. */
  readonly cost?: string;
  readonly duration?: string;
  /** The Discipline level that unlocks it, e.g. "Presence 1". */
  readonly prerequisite?: string;
  /** The difficulty or the resisting roll, as the System entry states it. */
  readonly difficulty?: string;
  /** One sentence of the book's description of what the power does. */
  readonly summary?: string;
  /** The V20 page where the power's entry begins. */
  readonly page?: number;
}

export interface DisciplineEntry {
  readonly name: string;
  /** What the Discipline does when it has no list of powers, or what its powers depend on. */
  readonly note?: string;
  /** The powers in level order: the first is the level 1 power. */
  readonly powers: readonly Power[];
}

/** Names match whatever their case and spacing: "  dominate " is Dominate. */
const catalogueKey = (name: string): string => name.trim().replace(/\s+/g, ' ').toLowerCase();

const BY_NAME = new Map(DISCIPLINE_CATALOGUE.map((entry) => [catalogueKey(entry.name), entry]));

/** A power as the character has it: its dice pool now, or what it uses instead of one. */
export interface PowerReading {
  name: string;
  level: number;
  /** The whole pool, less the wound, when the power rolls an attribute + an ability. */
  pool?: DicePool;
  note?: string;
}

export interface DisciplineReading {
  name: string;
  rating: number;
  note?: string;
  powers: PowerReading[];
}

function powerReading(character: V20Character, power: Power, level: number): PowerReading {
  const reading: PowerReading = { name: power.name, level };
  if (power.roll) {
    const [attribute, ability] = power.roll;
    reading.pool = dicePool(character, { attribute: `attributes.${attribute}`, ability: `abilities.${ability}` });
  }
  if (power.note !== undefined) reading.note = power.note;
  return reading;
}

/**
 * The Disciplines the player has named, in the order stored, each with the
 * powers its rating reaches. A Discipline the catalogue does not know, or one
 * rated 0, has its name and rating only.
 */
export function disciplineReadings(character: V20Character): DisciplineReading[] {
  return namedRows(character.disciplines).map((row) => {
    const entry = row.rating > 0 ? BY_NAME.get(catalogueKey(row.name)) : undefined;
    const reading: DisciplineReading = {
      name: row.name,
      rating: row.rating,
      powers: (entry?.powers ?? [])
        .slice(0, row.rating)
        .map((power, index) => powerReading(character, power, index + 1)),
    };
    if (entry?.note !== undefined) reading.note = entry.note;
    return reading;
  });
}
