// A character in the middle of creation. Reads only the rules data, so its
// shape is declared once from the same catalogues the rules use.

import {
  HEADER_FIELDS,
  type AbilityKey,
  type AttributeKey,
  type HeaderField,
  type VirtueKey,
} from '../traits';
import {
  ABILITY_ALLOTMENT,
  ATTRIBUTE_ALLOTMENT,
  BACKGROUNDS,
  BUILD_VIRTUES,
  RANKED_ALLOTMENTS,
  type BackgroundName,
  type Rank,
} from './rules';

/** The Storyteller's house settings for a build. */
export interface BuildSettings {
  baseGeneration: number;
  extraFreebies: number;
}

/** The sheet's header fields the concept step fills as free text: all but Clan and Generation. */
export type ConceptField = Exclude<HeaderField, 'clan' | 'generation'>;

export const CONCEPT_FIELDS: readonly ConceptField[] = HEADER_FIELDS.map((field) => field.key).filter(
  (key): key is ConceptField => key !== 'clan' && key !== 'generation',
);

/**
 * Names one trait of a build. Deliberately not the sheet's `TraitRef` form,
 * so a build address can never be handed to a sheet function.
 */
export type FixedTraitRef =
  | `attribute:${AttributeKey}`
  | `ability:${AbilityKey}`
  | `virtue:${VirtueKey}`
  | `background:${BackgroundName}`
  | 'humanity'
  | 'willpower';
export type DisciplineRef = `discipline:${string}`;
export type BuildTraitRef = FixedTraitRef | DisciplineRef;

/** Dots a trait holds, by where they came from. Free dots come from the rules, not the build. */
export interface Dots {
  creation: number;
  freebie: number;
}

/** A Discipline the build holds or has added. Names are unique ignoring case and spaces. */
export interface DisciplineEntry extends Dots {
  name: string;
  /** A name the player wrote in, rather than one from the catalogue. */
  writeIn: boolean;
}

export const FIXED_TRAIT_REFS: readonly FixedTraitRef[] = [
  ...ATTRIBUTE_ALLOTMENT.groups.flatMap((group) =>
    group.traits.map((trait) => `attribute:${trait}` as FixedTraitRef),
  ),
  ...ABILITY_ALLOTMENT.groups.flatMap((group) =>
    group.traits.map((trait) => `ability:${trait}` as FixedTraitRef),
  ),
  ...BUILD_VIRTUES.map((virtue): FixedTraitRef => `virtue:${virtue.key}`),
  ...BACKGROUNDS.map((name): FixedTraitRef => `background:${name}`),
  'humanity',
  'willpower',
];

/** Every group a ranked allotment has, Attributes then Abilities. */
export const RANKED_GROUP_KEYS: readonly string[] = RANKED_ALLOTMENTS.flatMap((allotment) =>
  allotment.groups.map((group) => group.key),
);

export interface V20Build {
  id: string;
  system: 'v20';
  kind: 'build';
  schemaVersion: 1;
  settings: BuildSettings;
  concept: Record<ConceptField, string>;
  /** A clan name, or '' until one is chosen. */
  clan: string;
  /** Each ranked group's rank, or '' until it has one. */
  ranks: Record<string, Rank | ''>;
  traits: Record<FixedTraitRef, Dots>;
  disciplines: DisciplineEntry[];
  bloodPool: number;
}

const DEFAULT_BASE_GENERATION = 13;
const DEFAULT_EXTRA_FREEBIES = 0;

function recordOf<K extends string, V>(keys: readonly K[], value: () => V): Record<K, V> {
  return Object.fromEntries(keys.map((key) => [key, value()])) as Record<K, V>;
}

export function blankBuild(id: string): V20Build {
  return {
    id,
    system: 'v20',
    kind: 'build',
    schemaVersion: 1,
    settings: {
      baseGeneration: DEFAULT_BASE_GENERATION,
      extraFreebies: DEFAULT_EXTRA_FREEBIES,
    },
    concept: recordOf(CONCEPT_FIELDS, () => ''),
    clan: '',
    ranks: recordOf(RANKED_GROUP_KEYS, (): Rank | '' => ''),
    traits: recordOf(FIXED_TRAIT_REFS, (): Dots => ({ creation: 0, freebie: 0 })),
    disciplines: [],
    bloodPool: 0,
  };
}
