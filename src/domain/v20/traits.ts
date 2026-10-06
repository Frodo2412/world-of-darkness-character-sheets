// The trait catalogue for page 1 of the V20 sheet: every name, group and
// range is declared here once and the character type is derived from it.

export interface Range {
  readonly min: number;
  readonly max: number;
}

export const RATING_RANGE: Range = { min: 0, max: 10 };
export const VIRTUE_RANGE: Range = { min: 0, max: 5 };
export const BLOOD_POOL_RANGE: Range = { min: 0, max: 50 };

/** The range of every rating in each part of the character. */
export const RATING_RANGES = {
  attributes: RATING_RANGE,
  abilities: RATING_RANGE,
  virtues: VIRTUE_RANGE,
  humanity: RATING_RANGE,
  willpower: RATING_RANGE,
  bloodPool: BLOOD_POOL_RANGE,
} as const satisfies Record<string, Range>;

export const ATTRIBUTE_DEFAULT = 1;
export const VIRTUE_DEFAULT = 1;

export const DISCIPLINE_ROWS = 6;
export const BACKGROUND_ROWS = 6;

export const HEADER_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'player', label: 'Player' },
  { key: 'chronicle', label: 'Chronicle' },
  { key: 'nature', label: 'Nature' },
  { key: 'demeanor', label: 'Demeanor' },
  { key: 'concept', label: 'Concept' },
  { key: 'clan', label: 'Clan' },
  { key: 'generation', label: 'Generation' },
  { key: 'sire', label: 'Sire' },
] as const;

export const ATTRIBUTE_GROUPS = [
  {
    key: 'physical',
    label: 'Physical',
    traits: [
      { key: 'strength', label: 'Strength' },
      { key: 'dexterity', label: 'Dexterity' },
      { key: 'stamina', label: 'Stamina' },
    ],
  },
  {
    key: 'social',
    label: 'Social',
    traits: [
      { key: 'charisma', label: 'Charisma' },
      { key: 'manipulation', label: 'Manipulation' },
      { key: 'appearance', label: 'Appearance' },
    ],
  },
  {
    key: 'mental',
    label: 'Mental',
    traits: [
      { key: 'perception', label: 'Perception' },
      { key: 'intelligence', label: 'Intelligence' },
      { key: 'wits', label: 'Wits' },
    ],
  },
] as const;

export const ABILITY_GROUPS = [
  {
    key: 'talents',
    label: 'Talents',
    customLabel: 'Custom talent',
    traits: [
      { key: 'alertness', label: 'Alertness' },
      { key: 'athletics', label: 'Athletics' },
      { key: 'awareness', label: 'Awareness' },
      { key: 'brawl', label: 'Brawl' },
      { key: 'empathy', label: 'Empathy' },
      { key: 'expression', label: 'Expression' },
      { key: 'intimidation', label: 'Intimidation' },
      { key: 'leadership', label: 'Leadership' },
      { key: 'streetwise', label: 'Streetwise' },
      { key: 'subterfuge', label: 'Subterfuge' },
    ],
  },
  {
    key: 'skills',
    label: 'Skills',
    customLabel: 'Custom skill',
    traits: [
      { key: 'animalKen', label: 'Animal Ken' },
      { key: 'crafts', label: 'Crafts' },
      { key: 'drive', label: 'Drive' },
      { key: 'etiquette', label: 'Etiquette' },
      { key: 'firearms', label: 'Firearms' },
      { key: 'larceny', label: 'Larceny' },
      { key: 'melee', label: 'Melee' },
      { key: 'performance', label: 'Performance' },
      { key: 'stealth', label: 'Stealth' },
      { key: 'survival', label: 'Survival' },
    ],
  },
  {
    key: 'knowledges',
    label: 'Knowledges',
    customLabel: 'Custom knowledge',
    traits: [
      { key: 'academics', label: 'Academics' },
      { key: 'computer', label: 'Computer' },
      { key: 'finance', label: 'Finance' },
      { key: 'investigation', label: 'Investigation' },
      { key: 'law', label: 'Law' },
      { key: 'medicine', label: 'Medicine' },
      { key: 'occult', label: 'Occult' },
      { key: 'politics', label: 'Politics' },
      { key: 'science', label: 'Science' },
      { key: 'technology', label: 'Technology' },
    ],
  },
] as const;

export const VIRTUES = [
  { key: 'conscience', label: 'Conscience/Conviction' },
  { key: 'selfControl', label: 'Self-Control/Instinct' },
  { key: 'courage', label: 'Courage' },
] as const;

/** `dicePenalty` is the dice a wound at that level takes off every pool. Incapacitated has none. */
export const HEALTH_LEVELS = [
  { key: 'bruised', label: 'Bruised', dicePenalty: 0 },
  { key: 'hurt', label: 'Hurt', dicePenalty: 1 },
  { key: 'injured', label: 'Injured', dicePenalty: 1 },
  { key: 'wounded', label: 'Wounded', dicePenalty: 2 },
  { key: 'mauled', label: 'Mauled', dicePenalty: 2 },
  { key: 'crippled', label: 'Crippled', dicePenalty: 5 },
  { key: 'incapacitated', label: 'Incapacitated' },
] as const;

/** The damage a health box can hold, in the order activating it steps through. */
export const DAMAGE_TYPES = ['empty', 'bashing', 'lethal', 'aggravated'] as const;

export type DamageType = (typeof DAMAGE_TYPES)[number];
export type HeaderField = (typeof HEADER_FIELDS)[number]['key'];
export type AttributeKey = (typeof ATTRIBUTE_GROUPS)[number]['traits'][number]['key'];
export type AbilityGroupKey = (typeof ABILITY_GROUPS)[number]['key'];
export type AbilityKey = (typeof ABILITY_GROUPS)[number]['traits'][number]['key'];
export type VirtueKey = (typeof VIRTUES)[number]['key'];
export type HealthLevelKey = (typeof HEALTH_LEVELS)[number]['key'];

export const ATTRIBUTE_KEYS: readonly AttributeKey[] = ATTRIBUTE_GROUPS.flatMap((group) =>
  group.traits.map((trait) => trait.key),
);
export const ABILITY_KEYS: readonly AbilityKey[] = ABILITY_GROUPS.flatMap((group) =>
  group.traits.map((trait) => trait.key),
);

/** Names one fixed rating on the sheet, as `<part of the character>.<trait>`. */
export type TraitRef =
  | `attributes.${AttributeKey}`
  | `abilities.${AbilityKey}`
  | `virtues.${VirtueKey}`
  | 'humanity.rating'
  | 'willpower.permanent'
  | 'willpower.temporary'
  | 'bloodPool.current';

export function rangeOf(trait: TraitRef): Range {
  const [section] = trait.split('.') as [keyof typeof RATING_RANGES];
  return RATING_RANGES[section];
}

/** Names the write-in ability of one ability group. */
export type CustomAbilityRef = `customAbilities.${AbilityGroupKey}`;

/** Names one write-in row: a rating whose name the player supplies. */
export type NamedRowRef =
  | CustomAbilityRef
  | `disciplines.${number}`
  | `backgrounds.${number}`;

/** Names one free-text field on the sheet. */
export type TextRef =
  | `header.${HeaderField}`
  | 'humanity.pathName'
  | 'humanity.bearing'
  | 'humanity.bearingModifier'
  | 'bloodPool.perTurn'
  | 'weakness'
  | 'experience'
  | 'notes';
