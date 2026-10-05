// Pure reads of a trait's rating and where its dots came from. The rating is
// `free + creation + freebie`; this file is the only place the parts are added.

import { ABILITY_GROUPS, ATTRIBUTE_GROUPS } from '../traits';
import type { BuildTraitRef, DisciplineEntry, Dots, FixedTraitRef, V20Build } from './build';
import {
  ABILITY_ALLOTMENT,
  ATTRIBUTE_ALLOTMENT,
  BUILD_VIRTUES,
  CLAN_FIXED_TRAITS,
  CLANS,
  DISCIPLINES,
  VIRTUE_ALLOTMENT,
  type BuildStep,
  type ClanName,
  type TraitKind,
} from './rules';

const NO_DOTS: Dots = { creation: 0, freebie: 0 };

/** The kind of trait `ref` names, which sets its freebie cost and where it is placed. */
export function kindOf(ref: BuildTraitRef): TraitKind {
  if (ref === 'humanity' || ref === 'willpower') return ref;
  return ref.slice(0, ref.indexOf(':')) as TraitKind;
}

/** The part of `ref` after its kind: an Attribute key, a Background name, a Discipline name. */
export const keyOf = (ref: BuildTraitRef): string => ref.slice(ref.indexOf(':') + 1);

const LABELS: Record<string, string> = Object.fromEntries([
  ...ATTRIBUTE_GROUPS.flatMap((group) => group.traits.map((trait) => [`attribute:${trait.key}`, trait.label])),
  ...ABILITY_GROUPS.flatMap((group) => group.traits.map((trait) => [`ability:${trait.key}`, trait.label])),
  ...BUILD_VIRTUES.map((virtue) => [`virtue:${virtue.key}`, virtue.label]),
  ['humanity', 'Humanity'],
  ['willpower', 'Willpower'],
]);

/** The name a trait is shown and announced under. */
export function traitLabel(ref: BuildTraitRef): string {
  return LABELS[ref] ?? keyOf(ref);
}

/** The step whose creation dots (or, for Humanity and Willpower, Virtues) set the trait. */
export function creationStepOf(ref: BuildTraitRef): BuildStep {
  switch (kindOf(ref)) {
    case 'attribute':
      return ATTRIBUTE_ALLOTMENT.step;
    case 'ability':
      return ABILITY_ALLOTMENT.step;
    default:
      return VIRTUE_ALLOTMENT.step;
  }
}

/** A Discipline name compared ignoring case and surrounding whitespace. */
export const sameName = (a: string, b: string): boolean =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

/** The catalogue spelling of `name`, or undefined for a write-in. */
export function catalogueDiscipline(name: string): string | undefined {
  return DISCIPLINES.find((discipline) => sameName(discipline, name));
}

export function findDiscipline(build: V20Build, name: string): DisciplineEntry | undefined {
  return build.disciplines.find((entry) => sameName(entry.name, name));
}

export const isCaitiff = (build: V20Build): boolean => build.clan === 'Caitiff';

/** A clan's three Disciplines; none for Caitiff or for no clan. */
export function clanDisciplinesOf(clan: string): readonly string[] {
  return CLANS.find((entry) => entry.name === clan)?.disciplines ?? [];
}

/** The chosen clan's three Disciplines; none for Caitiff or before a clan is chosen. */
export const clanDisciplines = (build: V20Build): readonly string[] => clanDisciplinesOf(build.clan);

export const isClanDiscipline = (build: V20Build, name: string): boolean =>
  clanDisciplines(build).some((discipline) => sameName(discipline, name));

/** The rating a clan fixes `ref` at, if it does. */
export function fixedRating(build: V20Build, ref: BuildTraitRef): number | undefined {
  return CLAN_FIXED_TRAITS[build.clan as ClanName]?.[ref];
}

export const isLocked = (build: V20Build, ref: BuildTraitRef): boolean =>
  fixedRating(build, ref) !== undefined;

export function dotsOf(build: V20Build, ref: BuildTraitRef): Dots {
  if (kindOf(ref) === 'discipline') return findDiscipline(build, keyOf(ref)) ?? NO_DOTS;
  return build.traits[ref as FixedTraitRef] ?? NO_DOTS;
}

/**
 * Dots the trait has without spending anything: one for Attributes and
 * Virtues, and for Humanity and Willpower what the Virtues give them.
 */
export function freeDots(build: V20Build, ref: BuildTraitRef): number {
  const fixed = fixedRating(build, ref);
  if (fixed !== undefined) return fixed;
  switch (kindOf(ref)) {
    case 'attribute':
      return ATTRIBUTE_ALLOTMENT.freeDots;
    case 'virtue':
      return VIRTUE_ALLOTMENT.freeDots;
    case 'humanity':
      return creationRating(build, 'virtue:conscience') + creationRating(build, 'virtue:selfControl');
    case 'willpower':
      return creationRating(build, 'virtue:courage');
    default:
      return 0;
  }
}

/** The rating before freebie points: free dots plus creation dots. */
export function creationRating(build: V20Build, ref: BuildTraitRef): number {
  const fixed = fixedRating(build, ref);
  if (fixed !== undefined) return fixed;
  return freeDots(build, ref) + dotsOf(build, ref).creation;
}

/** The trait's rating: free, creation and freebie dots together. */
export function rating(build: V20Build, ref: BuildTraitRef): number {
  const fixed = fixedRating(build, ref);
  if (fixed !== undefined) return fixed;
  return creationRating(build, ref) + dotsOf(build, ref).freebie;
}

/** The lowest rating creation dots can set: what free and freebie dots already give. */
export function creationFloor(build: V20Build, ref: BuildTraitRef): number {
  return isLocked(build, ref) ? rating(build, ref) : freeDots(build, ref) + dotsOf(build, ref).freebie;
}

/** The lowest rating freebie points can set: what free and creation dots already give. */
export function freebieFloor(build: V20Build, ref: BuildTraitRef): number {
  return creationRating(build, ref);
}
