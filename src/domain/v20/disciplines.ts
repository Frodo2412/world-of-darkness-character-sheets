// The V20 Discipline powers as data, and what a character's Disciplines give
// them in play: the powers their rating reaches, each with its dice pool.
// Computed on every draw, never stored. The powers and their rolls are the
// System entries of V20 chapter four (Disciplines).

import { namedRows, type V20Character } from './character';
import { dicePool, type DicePool } from './resources';
import type { AbilityKey, AttributeKey } from './traits';

/** One power of a Discipline. A power with no attribute + ability roll says in `note` what it uses instead; one with a roll may add to it. */
export interface Power {
  readonly name: string;
  readonly roll?: readonly [AttributeKey, AbilityKey];
  readonly note?: string;
}

export interface DisciplineEntry {
  readonly name: string;
  /** What the Discipline does when it has no list of powers, or what its powers depend on. */
  readonly note?: string;
  /** The powers in level order: the first is the level 1 power. */
  readonly powers: readonly Power[];
}

const NO_ROLL = 'No roll';

/** The Disciplines of the thirteen clans. Thaumaturgy and Necromancy are learned by path, so they list no powers. */
export const DISCIPLINE_CATALOGUE: readonly DisciplineEntry[] = [
  {
    name: 'Animalism',
    powers: [
      { name: 'Feral Whispers', roll: ['manipulation', 'animalKen'] },
      { name: 'Beckoning', roll: ['charisma', 'survival'] },
      { name: 'Quell the Beast', roll: ['manipulation', 'intimidation'], note: 'or Manipulation + Empathy' },
      { name: 'Subsume the Spirit', roll: ['manipulation', 'animalKen'] },
      { name: 'Drawing Out the Beast', note: 'Manipulation + Self-Control/Instinct' },
    ],
  },
  {
    name: 'Auspex',
    powers: [
      { name: 'Heightened Senses', note: NO_ROLL },
      { name: 'Aura Perception', roll: ['perception', 'empathy'] },
      { name: "The Spirit's Touch", roll: ['perception', 'empathy'] },
      { name: 'Telepathy', roll: ['intelligence', 'subterfuge'] },
      { name: 'Psychic Projection', roll: ['perception', 'awareness'] },
    ],
  },
  {
    name: 'Celerity',
    note: 'Each dot adds a die to Dexterity pools, or 1 blood buys an extra action',
    powers: [],
  },
  {
    name: 'Chimerstry',
    powers: [
      { name: 'Ignis Fatuus', note: NO_ROLL },
      { name: 'Fata Morgana', note: NO_ROLL },
      { name: 'Apparition', note: NO_ROLL },
      { name: 'Permanency', note: NO_ROLL },
      { name: 'Horrid Reality', roll: ['manipulation', 'subterfuge'] },
    ],
  },
  {
    name: 'Dementation',
    powers: [
      { name: 'Passion', roll: ['charisma', 'empathy'] },
      { name: 'The Haunting', roll: ['manipulation', 'subterfuge'] },
      { name: 'Eyes of Chaos', roll: ['perception', 'occult'] },
      { name: 'Voice of Madness', roll: ['manipulation', 'empathy'] },
      { name: 'Total Insanity', roll: ['manipulation', 'intimidation'] },
    ],
  },
  {
    name: 'Dominate',
    powers: [
      { name: 'Command', roll: ['manipulation', 'intimidation'] },
      { name: 'Mesmerize', roll: ['manipulation', 'leadership'] },
      { name: 'The Forgetful Mind', roll: ['wits', 'subterfuge'] },
      { name: 'Conditioning', roll: ['charisma', 'leadership'] },
      { name: 'Possession', roll: ['charisma', 'intimidation'] },
    ],
  },
  {
    name: 'Fortitude',
    note: 'Each dot adds a die to soak bashing and lethal damage; its dots alone soak aggravated',
    powers: [],
  },
  {
    name: 'Necromancy',
    note: 'Powers follow the path studied',
    powers: [],
  },
  {
    name: 'Obfuscate',
    powers: [
      { name: 'Cloak of Shadows', note: NO_ROLL },
      { name: 'Unseen Presence', note: NO_ROLL },
      { name: 'Mask of a Thousand Faces', roll: ['manipulation', 'performance'] },
      { name: "Vanish from the Mind's Eye", roll: ['charisma', 'stealth'] },
      { name: 'Cloak the Gathering', note: NO_ROLL },
    ],
  },
  {
    name: 'Obtenebration',
    powers: [
      { name: 'Shadow Play', note: NO_ROLL },
      { name: 'Shroud of Night', roll: ['manipulation', 'occult'] },
      { name: 'Arms of the Abyss', roll: ['manipulation', 'occult'] },
      { name: 'Black Metamorphosis', note: 'Manipulation + Courage' },
      { name: 'Tenebrous Form', note: NO_ROLL },
    ],
  },
  {
    name: 'Potence',
    note: 'Each dot adds a die to Strength pools; 1 blood turns those dice into automatic successes',
    powers: [],
  },
  {
    name: 'Presence',
    powers: [
      { name: 'Awe', roll: ['charisma', 'performance'] },
      { name: 'Dread Gaze', roll: ['charisma', 'intimidation'] },
      { name: 'Entrancement', roll: ['appearance', 'empathy'] },
      { name: 'Summon', roll: ['charisma', 'subterfuge'] },
      { name: 'Majesty', note: NO_ROLL },
    ],
  },
  {
    name: 'Protean',
    powers: [
      { name: 'Eyes of the Beast', note: NO_ROLL },
      { name: 'Feral Claws', note: NO_ROLL },
      { name: 'Earth Meld', note: NO_ROLL },
      { name: 'Shape of the Beast', note: NO_ROLL },
      { name: 'Mist Form', note: NO_ROLL },
    ],
  },
  {
    name: 'Quietus',
    powers: [
      { name: 'Silence of Death', note: NO_ROLL },
      { name: "Scorpion's Touch", note: 'Willpower' },
      { name: "Dagon's Call", note: 'Stamina' },
      { name: "Baal's Caress", note: NO_ROLL },
      { name: 'Taste of Death', roll: ['stamina', 'athletics'] },
    ],
  },
  {
    name: 'Serpentis',
    powers: [
      { name: 'The Eyes of the Serpent', note: NO_ROLL },
      { name: 'The Tongue of the Asp', note: 'An attack · Strength aggravated damage' },
      { name: 'The Skin of the Adder', note: NO_ROLL },
      { name: 'The Form of the Cobra', note: NO_ROLL },
      { name: 'The Heart of Darkness', note: NO_ROLL },
    ],
  },
  {
    name: 'Thaumaturgy',
    note: 'Powers follow the path studied',
    powers: [],
  },
  {
    name: 'Vicissitude',
    powers: [
      { name: 'Malleable Visage', roll: ['intelligence', 'medicine'] },
      { name: 'Fleshcraft', roll: ['dexterity', 'medicine'] },
      { name: 'Bonecraft', roll: ['strength', 'medicine'] },
      { name: 'Horrid Form', note: NO_ROLL },
      { name: 'Bloodform', note: NO_ROLL },
    ],
  },
];

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
