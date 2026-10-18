// The rows of the Combat tab's tables, as words and numbers ready to draw. Computed on every draw.

import type { V20Character } from '../character';
import { attackPool, baseDifficulty, NO_MODIFIERS } from './attack';
import { damagePool } from './damage';
import { MANOEUVRES, type CombatSection, type Effect, type Manoeuvre } from './data/manoeuvres';
import { RANGED_WEAPONS } from './data/ranged';
import { CONCEALMENT, type Conceal, type Damage, type MeleeWeapon, type RangedWeapon, type Weapon } from './data/types';
import { MELEE_WEAPONS } from './data/weapons';
import { manoeuvreAvailability } from './requirements';
import { manoeuvrePool, weaponPool, type CombatPool } from './pools';

/** How a damage pool is printed in the charts: "Str", "Str +1", "4". */
export function damageText(damage: Damage): string {
  if (damage.strength !== undefined) return damage.strength === 0 ? 'Str' : `Str +${damage.strength}`;
  return String(damage.flat ?? 0);
}

const EFFECT_TEXT: Record<Effect, string> = {
  aggravated: 'Aggravated damage',
  'carries-over': 'Carries over on successive turns',
  knockdown: 'Knocks the target down',
  'reduces-attack': "Reduces an opponent's attack successes",
};

export interface ManoeuvreRow {
  name: string;
  section: CombatSection;
  /** What the table's footnotes and the entry add: effects, and what it must follow. */
  description: string;
  /** "Weapon required", "Prerequisite", "Unavailable": each also said in words, never by colour alone. */
  tags: string[];
  /** Why the character cannot use it, when they cannot. */
  unavailable?: string;
  /** The weapon the manoeuvre still needs, in words, until one that fits is selected. */
  weaponNeeded?: string;
  /** Undefined while the manoeuvre is unavailable. */
  pool?: CombatPool;
  accuracy: string;
  /** "6", "7 (+1)", "6 / 7". */
  difficulty: string;
  /** What the book prints: "Str +1", "Weapon", "Special", "None". */
  damage: string;
  /** The dice of damage the character rolls for it, for damage that is a pool of dice. */
  damageDice?: number;
  page: number;
  selected: boolean;
}

const accuracyText = (manoeuvre: Manoeuvre): string =>
  manoeuvre.accuracy === 'special' ? 'Special' : manoeuvre.accuracy === 0 ? '0' : `+${manoeuvre.accuracy}`;

function difficultyText(manoeuvre: Manoeuvre): string {
  const base = baseDifficulty(manoeuvre, undefined, {}) - manoeuvre.difficulty;
  if (manoeuvre.difficulty === 0) return String(base);
  const raised = `${base + manoeuvre.difficulty}`;
  if (manoeuvre.difficultyNote !== undefined) return `${base} / ${raised}`;
  return `${raised} (+${manoeuvre.difficulty})`;
}

function manoeuvreDamage(character: V20Character, manoeuvre: Manoeuvre): Pick<ManoeuvreRow, 'damage' | 'damageDice'> {
  switch (manoeuvre.damage.kind) {
    case 'dice':
      return { damage: damageText(manoeuvre.damage.dice), damageDice: damagePool(character, manoeuvre.damage.dice, 0).dice };
    case 'weapon':
      return { damage: 'Weapon' };
    case 'special':
      return { damage: 'Special' };
    case 'none':
      return { damage: 'None' };
  }
}

/** The manoeuvres of one section of the table, with the character's pool for each. */
export function manoeuvreRows(character: V20Character, section: CombatSection, weapon: Weapon | undefined, selectedName: string | undefined): ManoeuvreRow[] {
  return MANOEUVRES.filter((manoeuvre) => manoeuvre.section === section).map((manoeuvre): ManoeuvreRow => {
    const availability = manoeuvreAvailability(character, manoeuvre, weapon);
    const description = [
      ...manoeuvre.effects.map((effect) => EFFECT_TEXT[effect]),
      ...(availability.prerequisite === undefined ? [] : [availability.prerequisite]),
    ].join(' · ');
    const row: ManoeuvreRow = {
      name: manoeuvre.name,
      section,
      description,
      tags: availability.unavailable === undefined ? availability.tags : [...availability.tags.filter((tag) => tag !== 'Prerequisite'), 'Unavailable'],
      accuracy: accuracyText(manoeuvre),
      difficulty: difficultyText(manoeuvre),
      ...manoeuvreDamage(character, manoeuvre),
      page: manoeuvre.page,
      selected: manoeuvre.name === selectedName,
    };
    if (availability.unavailable !== undefined) row.unavailable = availability.unavailable;
    else row.pool = manoeuvrePool(character, manoeuvre);
    if (availability.weaponNeeded !== undefined) row.weaponNeeded = availability.weaponNeeded;
    return row;
  });
}

export interface WeaponRow {
  name: string;
  kind: 'melee' | 'ranged';
  /** The chart's example make and model, or its footnote for the weapon. */
  detail: string;
  tags: string[];
  pool: CombatPool;
  /** "Str +1", "4". */
  damage: string;
  /** Melee: "bashing" or "lethal". The ranged chart prints no type. */
  type?: 'bashing' | 'lethal';
  conceal: Conceal;
  concealMeaning: string;
  /** Ranged: the short range in meters, the rate, and the clip as the chart prints it ("15+1"). */
  range?: number;
  rate?: number;
  clip?: string;
  page: number;
  selected: boolean;
}

const clipText = (weapon: RangedWeapon): string => (weapon.chambered ? `${weapon.clip}+1` : String(weapon.clip));

function weaponRow(character: V20Character, weapon: MeleeWeapon | RangedWeapon, selectedName: string | undefined): WeaponRow {
  const row: WeaponRow = {
    name: weapon.name,
    kind: weapon.kind,
    detail: (weapon.kind === 'ranged' ? weapon.example : undefined) ?? weapon.note ?? '',
    tags: weapon.kind === 'ranged' && weapon.automatic ? ['Full-auto capable'] : [],
    pool: weaponPool(character, weapon.kind),
    damage: damageText(weapon.damage),
    conceal: weapon.conceal,
    concealMeaning: CONCEALMENT[weapon.conceal],
    page: weapon.page,
    selected: weapon.name === selectedName,
  };
  if (weapon.kind === 'melee') {
    row.type = weapon.type;
  } else {
    row.range = weapon.range;
    row.rate = weapon.rate;
    row.clip = clipText(weapon);
  }
  return row;
}

export const meleeWeaponRows = (character: V20Character, selectedName: string | undefined): WeaponRow[] =>
  MELEE_WEAPONS.map((weapon) => weaponRow(character, weapon, selectedName));

export const rangedWeaponRows = (character: V20Character, selectedName: string | undefined): WeaponRow[] =>
  RANGED_WEAPONS.map((weapon) => weaponRow(character, weapon, selectedName));

/** The weapon of the charts with this name. */
export const weaponNamed = (name: string | undefined): Weapon | undefined =>
  [...MELEE_WEAPONS, ...RANGED_WEAPONS].find((weapon) => weapon.name === name);

export { attackPool, NO_MODIFIERS };
