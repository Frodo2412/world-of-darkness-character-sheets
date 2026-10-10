// The close combat and ranged manoeuvres of V20 chapter nine, from the
// Close Combat and Ranged Combat Maneuvers Tables (p. 279) and each
// manoeuvre's entry (pp. 275-278).

import type { AbilityKey, AttributeKey } from '../../traits';
import type { Damage } from './types';

export type CombatSection = 'melee' | 'ranged';

/** What a manoeuvre needs before the character can use it. */
export type Requirement =
  /** A weapon in hand; `automatic` needs one the Ranged Weapons Chart marks as capable of bursts and full auto. */
  | { readonly kind: 'weapon'; readonly weapon: CombatSection; readonly automatic?: true }
  /** One of these Discipline powers (named as in the Discipline catalogue). */
  | { readonly kind: 'power'; readonly anyOf: readonly { readonly discipline: string; readonly power: string }[] }
  /** One of these manoeuvres performed first. */
  | { readonly kind: 'prior'; readonly anyOf: readonly string[] };

/** A manoeuvre's damage: dice, "Weapon" (the weapon's own), "Special" (explained in its entry) or none. */
export type ManoeuvreDamage =
  | { readonly kind: 'dice'; readonly dice: Damage }
  | { readonly kind: 'weapon' }
  | { readonly kind: 'special' }
  | { readonly kind: 'none' };

/** The table's footnote marks: (A) aggravated, (C) carries over, (K) knockdown, (R) reduces the opponent's attack successes. */
export type Effect = 'aggravated' | 'carries-over' | 'knockdown' | 'reduces-attack';

export interface Manoeuvre {
  readonly name: string;
  readonly section: CombatSection;
  /** The Traits: `attribute` + `ability`, or + `alternateAbility` when the entry allows either. */
  readonly attribute: AttributeKey;
  readonly ability: AbilityKey;
  readonly alternateAbility?: AbilityKey;
  /** Dice added to the roll to hit: "Normal" is 0, "+3" is 3; "Special" is explained in the entry. */
  readonly accuracy: number | 'special';
  /** Added to the attack's difficulty: "Normal" is 0, "+2" is 2. */
  readonly difficulty: number;
  /** When the difficulty applies only in some cases, as the table prints it. */
  readonly difficultyNote?: string;
  readonly damage: ManoeuvreDamage;
  readonly effects: readonly Effect[];
  readonly requirements: readonly Requirement[];
  /** The V20 page where the manoeuvre's entry begins; its table row is on p. 279. */
  readonly page: number;
}

export type ManoeuvreTag = 'Weapon required' | 'Prerequisite';

/** The tags a manoeuvre is drawn with: a weapon requirement or a prerequisite (a power or a prior manoeuvre). */
export function tagsOf(manoeuvre: Manoeuvre): ManoeuvreTag[] {
  const tags = new Set<ManoeuvreTag>();
  for (const requirement of manoeuvre.requirements) {
    tags.add(requirement.kind === 'weapon' ? 'Weapon required' : 'Prerequisite');
  }
  return [...tags];
}

const str = (bonus: number): ManoeuvreDamage => ({ kind: 'dice', dice: { strength: bonus } });
const NONE: ManoeuvreDamage = { kind: 'none' };
const SPECIAL: ManoeuvreDamage = { kind: 'special' };
const WEAPON: ManoeuvreDamage = { kind: 'weapon' };
const NORMAL = 0;

export const MANOEUVRES: readonly Manoeuvre[] = [
  {
    name: 'Bite',
    section: 'melee',
    attribute: 'dexterity',
    ability: 'brawl',
    accuracy: 1,
    difficulty: NORMAL,
    damage: str(1),
    effects: ['aggravated'],
    requirements: [{ kind: 'prior', anyOf: ['Clinch', 'Hold', 'Tackle'] }],
    page: 276,
  },
  {
    name: 'Block',
    section: 'melee',
    attribute: 'dexterity',
    ability: 'brawl',
    accuracy: 'special',
    difficulty: NORMAL,
    damage: NONE,
    effects: ['reduces-attack'],
    requirements: [],
    page: 275,
  },
  {
    name: 'Claw',
    section: 'melee',
    attribute: 'dexterity',
    ability: 'brawl',
    accuracy: NORMAL,
    difficulty: NORMAL,
    damage: str(1),
    effects: ['aggravated'],
    requirements: [
      {
        kind: 'power',
        anyOf: [
          { discipline: 'Protean', power: 'Feral Claws' },
          { discipline: 'Vicissitude', power: 'Bonecraft' },
        ],
      },
    ],
    page: 276,
  },
  {
    name: 'Clinch',
    section: 'melee',
    attribute: 'strength',
    ability: 'brawl',
    accuracy: NORMAL,
    difficulty: NORMAL,
    damage: str(0),
    effects: ['carries-over'],
    requirements: [],
    page: 276,
  },
  {
    name: 'Disarm',
    section: 'melee',
    attribute: 'dexterity',
    ability: 'melee',
    accuracy: NORMAL,
    difficulty: 1,
    damage: SPECIAL,
    effects: [],
    requirements: [],
    page: 276,
  },
  {
    name: 'Dodge',
    section: 'melee',
    attribute: 'dexterity',
    ability: 'athletics',
    accuracy: 'special',
    difficulty: NORMAL,
    damage: NONE,
    effects: ['reduces-attack'],
    requirements: [],
    page: 275,
  },
  {
    name: 'Hold',
    section: 'melee',
    attribute: 'strength',
    ability: 'brawl',
    accuracy: NORMAL,
    difficulty: NORMAL,
    damage: NONE,
    effects: ['carries-over'],
    requirements: [],
    page: 276,
  },
  {
    name: 'Kick',
    section: 'melee',
    attribute: 'dexterity',
    ability: 'brawl',
    accuracy: NORMAL,
    difficulty: 1,
    damage: str(1),
    effects: [],
    requirements: [],
    page: 276,
  },
  {
    name: 'Parry',
    section: 'melee',
    attribute: 'dexterity',
    ability: 'melee',
    accuracy: 'special',
    difficulty: NORMAL,
    damage: NONE,
    effects: ['reduces-attack'],
    requirements: [{ kind: 'weapon', weapon: 'melee' }],
    page: 275,
  },
  {
    name: 'Strike',
    section: 'melee',
    attribute: 'dexterity',
    ability: 'brawl',
    accuracy: NORMAL,
    difficulty: NORMAL,
    damage: str(0),
    effects: [],
    requirements: [],
    page: 276,
  },
  {
    name: 'Sweep',
    section: 'melee',
    attribute: 'dexterity',
    ability: 'brawl',
    alternateAbility: 'melee',
    accuracy: NORMAL,
    difficulty: 1,
    damage: str(0),
    effects: ['knockdown'],
    requirements: [],
    page: 276,
  },
  {
    name: 'Tackle',
    section: 'melee',
    attribute: 'strength',
    ability: 'brawl',
    accuracy: NORMAL,
    difficulty: 1,
    damage: str(1),
    effects: ['knockdown'],
    requirements: [],
    page: 277,
  },
  {
    name: 'Weapon Strike',
    section: 'melee',
    attribute: 'dexterity',
    ability: 'melee',
    accuracy: NORMAL,
    difficulty: NORMAL,
    damage: WEAPON,
    effects: [],
    requirements: [{ kind: 'weapon', weapon: 'melee' }],
    page: 277,
  },
  {
    name: 'Automatic Fire',
    section: 'ranged',
    attribute: 'dexterity',
    ability: 'firearms',
    accuracy: 10,
    difficulty: 2,
    damage: SPECIAL,
    effects: [],
    requirements: [{ kind: 'weapon', weapon: 'ranged', automatic: true }],
    page: 278,
  },
  {
    name: 'Multiple Shots',
    section: 'ranged',
    attribute: 'dexterity',
    ability: 'firearms',
    accuracy: 'special',
    difficulty: NORMAL,
    damage: WEAPON,
    effects: [],
    requirements: [{ kind: 'weapon', weapon: 'ranged' }],
    page: 278,
  },
  {
    name: 'Strafing',
    section: 'ranged',
    attribute: 'dexterity',
    ability: 'firearms',
    accuracy: 10,
    difficulty: 2,
    damage: SPECIAL,
    effects: [],
    requirements: [{ kind: 'weapon', weapon: 'ranged', automatic: true }],
    page: 278,
  },
  {
    name: 'Three-Round Burst',
    section: 'ranged',
    attribute: 'dexterity',
    ability: 'firearms',
    accuracy: 2,
    difficulty: 1,
    damage: WEAPON,
    effects: [],
    requirements: [{ kind: 'weapon', weapon: 'ranged', automatic: true }],
    page: 278,
  },
  {
    name: 'Two Weapons',
    section: 'ranged',
    attribute: 'dexterity',
    ability: 'firearms',
    accuracy: NORMAL,
    difficulty: 1,
    difficultyNote: 'off-hand',
    damage: WEAPON,
    effects: [],
    requirements: [{ kind: 'weapon', weapon: 'ranged' }],
    page: 278,
  },
];
