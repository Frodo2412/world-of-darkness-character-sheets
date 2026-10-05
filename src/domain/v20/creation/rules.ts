// The creation rules as data: names and numbers only. Functions that read
// them live in the other creation files, so this file has no behavior to test
// beyond its values.

import type { Range } from '../traits';

// Moved to the base domain; re-exported so every creation import keeps working.
export { GENERATION_TABLE, type GenerationRow } from '../generations';

/** Freebie points every build has before the Storyteller's extra points. */
export const STANDARD_FREEBIE_BUDGET = 15;

/** The extra freebie points a Storyteller may grant. */
export const EXTRA_FREEBIES_RANGE: Range = { min: 0, max: 999 };

/** The thirteen clans with their three clan Disciplines, then Caitiff, who have none. */
export const CLANS = [
  { name: 'Assamite', disciplines: ['Celerity', 'Obfuscate', 'Quietus'] },
  { name: 'Brujah', disciplines: ['Celerity', 'Potence', 'Presence'] },
  { name: 'Follower of Set', disciplines: ['Obfuscate', 'Presence', 'Serpentis'] },
  { name: 'Gangrel', disciplines: ['Animalism', 'Fortitude', 'Protean'] },
  { name: 'Giovanni', disciplines: ['Dominate', 'Necromancy', 'Potence'] },
  { name: 'Lasombra', disciplines: ['Dominate', 'Obtenebration', 'Potence'] },
  { name: 'Malkavian', disciplines: ['Auspex', 'Dementation', 'Obfuscate'] },
  { name: 'Nosferatu', disciplines: ['Animalism', 'Obfuscate', 'Potence'] },
  { name: 'Ravnos', disciplines: ['Animalism', 'Chimerstry', 'Fortitude'] },
  { name: 'Toreador', disciplines: ['Auspex', 'Celerity', 'Presence'] },
  { name: 'Tremere', disciplines: ['Auspex', 'Dominate', 'Thaumaturgy'] },
  { name: 'Tzimisce', disciplines: ['Animalism', 'Auspex', 'Vicissitude'] },
  { name: 'Ventrue', disciplines: ['Dominate', 'Fortitude', 'Presence'] },
  { name: 'Caitiff', disciplines: [] },
] as const satisfies readonly { name: string; disciplines: readonly string[] }[];

export type ClanName = (typeof CLANS)[number]['name'];

export const CLAN_NAMES: readonly ClanName[] = CLANS.map((clan) => clan.name);

/** Suggestions for Nature and Demeanor; any other text is accepted too. */
export const ARCHETYPES = [
  'Architect',
  'Autocrat',
  'Bon Vivant',
  'Bravo',
  'Capitalist',
  'Caregiver',
  'Celebrant',
  'Chameleon',
  'Child',
  'Competitor',
  'Conformist',
  'Conniver',
  'Creep Show',
  'Curmudgeon',
  'Dabbler',
  'Deviant',
  'Director',
  'Enigma',
  'Eye of the Storm',
  'Fanatic',
  'Gallant',
  'Guru',
  'Idealist',
  'Judge',
  'Loner',
  'Martyr',
  'Masochist',
  'Monster',
  'Pedagogue',
  'Penitent',
  'Perfectionist',
  'Rebel',
  'Rogue',
  'Sadist',
  'Scientist',
  'Sociopath',
  'Soldier',
  'Survivor',
  'Thrill-Seeker',
  'Traditionalist',
  'Trickster',
  'Visionary',
] as const;

/** The builder's steps in order, with the title each is shown under. */
export const BUILD_STEPS = [
  { step: 'settings', title: 'Settings' },
  { step: 'concept', title: 'Concept' },
  { step: 'attributes', title: 'Attributes' },
  { step: 'abilities', title: 'Abilities' },
  { step: 'advantages', title: 'Advantages' },
  { step: 'finishing', title: 'Finishing touches' },
] as const;

export type BuildStep = (typeof BUILD_STEPS)[number]['step'];

/** Every Discipline a clan in the catalogue has, alphabetically. */
export const DISCIPLINES = [
  'Animalism',
  'Auspex',
  'Celerity',
  'Chimerstry',
  'Dementation',
  'Dominate',
  'Fortitude',
  'Necromancy',
  'Obfuscate',
  'Obtenebration',
  'Potence',
  'Presence',
  'Protean',
  'Quietus',
  'Serpentis',
  'Thaumaturgy',
  'Vicissitude',
] as const;

/** The Backgrounds, in the order they are listed (and written to the sheet). */
export const BACKGROUNDS = [
  'Allies',
  'Alternate Identity',
  'Black Hand Membership',
  'Contacts',
  'Domain',
  'Fame',
  'Generation',
  'Herd',
  'Influence',
  'Mentor',
  'Resources',
  'Retainers',
  'Rituals',
  'Status',
] as const;

export type BackgroundName = (typeof BACKGROUNDS)[number];

/** The Background whose dots improve the generation. */
export const GENERATION_BACKGROUND: BackgroundName = 'Generation';

/** The Virtues as the builder names them. Keys match the sheet's. */
export const BUILD_VIRTUES = [
  { key: 'conscience', label: 'Conscience' },
  { key: 'selfControl', label: 'Self-Control' },
  { key: 'courage', label: 'Courage' },
] as const;

/** At most this many Disciplines and Backgrounds are held, as the sheet has rows for. */
export const MAX_HELD = 6;

/** The fixed ceilings that do not follow the generation. */
export const FIXED_MAXIMUMS = {
  generationBackground: 5,
  virtue: 5,
  humanity: 10,
  willpower: 10,
  /** Abilities cannot go above this with creation dots alone. */
  abilityCreation: 3,
} as const;

/** What one freebie dot of each kind of trait costs. */
export const FREEBIE_COSTS = {
  attribute: 5,
  ability: 2,
  discipline: 7,
  background: 1,
  virtue: 2,
  humanity: 2,
  willpower: 1,
} as const;

export type TraitKind = keyof typeof FREEBIE_COSTS;

export const RANKS = ['primary', 'secondary', 'tertiary'] as const;
export type Rank = (typeof RANKS)[number];

/**
 * A ranked allotment: groups ranked primary, secondary and tertiary for the
 * given dots. Traits are named by their build key.
 */
export interface RankedAllotment {
  readonly kind: 'ranked';
  readonly key: 'attributes' | 'abilities';
  /** The singular noun, as in "Rank the Attribute groups". */
  readonly noun: string;
  readonly traitKind: TraitKind;
  readonly step: BuildStep;
  readonly rankDots: Readonly<Record<Rank, number>>;
  readonly freeDots: number;
  readonly groups: readonly { key: string; label: string; traits: readonly string[] }[];
}

/** A flat allotment: one pool of creation dots over a set of traits. */
export interface FlatAllotment {
  readonly kind: 'flat';
  readonly key: 'disciplines' | 'backgrounds' | 'virtues';
  readonly label: string;
  /** The singular noun, as in "Place 1 Virtue dot". */
  readonly noun: string;
  readonly traitKind: TraitKind;
  readonly step: BuildStep;
  readonly dots: number;
  readonly freeDots: number;
}

export const ATTRIBUTE_ALLOTMENT: RankedAllotment = {
  kind: 'ranked',
  key: 'attributes',
  noun: 'Attribute',
  traitKind: 'attribute',
  step: 'attributes',
  rankDots: { primary: 7, secondary: 5, tertiary: 3 },
  freeDots: 1,
  groups: [
    { key: 'physical', label: 'Physical', traits: ['strength', 'dexterity', 'stamina'] },
    { key: 'social', label: 'Social', traits: ['charisma', 'manipulation', 'appearance'] },
    { key: 'mental', label: 'Mental', traits: ['perception', 'intelligence', 'wits'] },
  ],
};

export const ABILITY_ALLOTMENT: RankedAllotment = {
  kind: 'ranked',
  key: 'abilities',
  noun: 'Ability',
  traitKind: 'ability',
  step: 'abilities',
  rankDots: { primary: 13, secondary: 9, tertiary: 5 },
  freeDots: 0,
  groups: [
    {
      key: 'talents',
      label: 'Talents',
      traits: ['alertness', 'athletics', 'awareness', 'brawl', 'empathy', 'expression', 'intimidation', 'leadership', 'streetwise', 'subterfuge'],
    },
    {
      key: 'skills',
      label: 'Skills',
      traits: ['animalKen', 'crafts', 'drive', 'etiquette', 'firearms', 'larceny', 'melee', 'performance', 'stealth', 'survival'],
    },
    {
      key: 'knowledges',
      label: 'Knowledges',
      traits: ['academics', 'computer', 'finance', 'investigation', 'law', 'medicine', 'occult', 'politics', 'science', 'technology'],
    },
  ],
};

export const DISCIPLINE_ALLOTMENT: FlatAllotment = {
  kind: 'flat',
  key: 'disciplines',
  label: 'Disciplines',
  noun: 'Discipline',
  traitKind: 'discipline',
  step: 'advantages',
  dots: 3,
  freeDots: 0,
};

export const BACKGROUND_ALLOTMENT: FlatAllotment = {
  kind: 'flat',
  key: 'backgrounds',
  label: 'Backgrounds',
  noun: 'Background',
  traitKind: 'background',
  step: 'advantages',
  dots: 5,
  freeDots: 0,
};

export const VIRTUE_ALLOTMENT: FlatAllotment = {
  kind: 'flat',
  key: 'virtues',
  label: 'Virtues',
  noun: 'Virtue',
  traitKind: 'virtue',
  step: 'advantages',
  dots: 7,
  freeDots: 1,
};

export const RANKED_ALLOTMENTS: readonly RankedAllotment[] = [ATTRIBUTE_ALLOTMENT, ABILITY_ALLOTMENT];
export const FLAT_ALLOTMENTS: readonly FlatAllotment[] = [
  DISCIPLINE_ALLOTMENT,
  BACKGROUND_ALLOTMENT,
  VIRTUE_ALLOTMENT,
];

/** Traits a clan fixes at a rating that no dots of any kind may change. */
export const CLAN_FIXED_TRAITS: Readonly<Partial<Record<ClanName, Readonly<Record<string, number>>>>> = {
  Nosferatu: { 'attribute:appearance': 0 },
};
