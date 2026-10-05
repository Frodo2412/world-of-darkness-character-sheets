// Pure reads over the allotment descriptors: what each ranked group or flat
// allotment grants, how many creation dots it holds, and what is left.
// Nothing here names a particular trait; the descriptors say it all.

import type { BuildTraitRef, FixedTraitRef, V20Build } from './build';
import { dotsOf, kindOf, keyOf } from './ratings';
import {
  BACKGROUNDS,
  BUILD_VIRTUES,
  FLAT_ALLOTMENTS,
  RANKED_ALLOTMENTS,
  type BuildStep,
  type FlatAllotment,
  type Rank,
  type RankedAllotment,
} from './rules';

/** One pool of creation dots: a ranked group, or a whole flat allotment. */
export interface AllotmentState {
  /** The group key, or the flat allotment's key. */
  key: string;
  /** "Physical", "Disciplines". */
  label: string;
  /** "Attribute", "Discipline". */
  noun: string;
  step: BuildStep;
  kind: 'ranked' | 'flat';
  /** For a ranked group: its rank, '' when unranked. */
  rank: Rank | '';
  /** Dots the pool grants: 0 for an unranked group. */
  dots: number;
  placed: number;
  /** Negative when overspent; an unranked group holding dots is overspent by all of them. */
  remaining: number;
  traits: readonly BuildTraitRef[];
}

const prefixOf = (allotment: RankedAllotment) => allotment.traitKind;

export function groupTraits(allotment: RankedAllotment, groupKey: string): FixedTraitRef[] {
  const group = allotment.groups.find((entry) => entry.key === groupKey);
  return (group?.traits ?? []).map((trait) => `${prefixOf(allotment)}:${trait}` as FixedTraitRef);
}

/** The traits a flat allotment's dots go on. Disciplines are whatever the build holds. */
export function flatTraits(build: V20Build, allotment: FlatAllotment): BuildTraitRef[] {
  switch (allotment.key) {
    case 'disciplines':
      return build.disciplines.map((entry): BuildTraitRef => `discipline:${entry.name}`);
    case 'backgrounds':
      return BACKGROUNDS.map((name): BuildTraitRef => `background:${name}`);
    case 'virtues':
      return BUILD_VIRTUES.map((virtue): BuildTraitRef => `virtue:${virtue.key}`);
  }
}

const placedOn = (build: V20Build, traits: readonly BuildTraitRef[]): number =>
  traits.reduce((sum, ref) => sum + dotsOf(build, ref).creation, 0);

function rankedStates(build: V20Build, allotment: RankedAllotment): AllotmentState[] {
  return allotment.groups.map((group) => {
    const rank = build.ranks[group.key] ?? '';
    const traits = groupTraits(allotment, group.key);
    const dots = rank === '' ? 0 : allotment.rankDots[rank];
    const placed = placedOn(build, traits);
    return {
      key: group.key,
      label: group.label,
      noun: group.label,
      step: allotment.step,
      kind: 'ranked',
      rank,
      dots,
      placed,
      remaining: dots - placed,
      traits,
    };
  });
}

function flatState(build: V20Build, allotment: FlatAllotment): AllotmentState {
  const traits = flatTraits(build, allotment);
  const placed = placedOn(build, traits);
  return {
    key: allotment.key,
    label: allotment.label,
    noun: allotment.noun,
    step: allotment.step,
    kind: 'flat',
    rank: '',
    dots: allotment.dots,
    placed,
    remaining: allotment.dots - placed,
    traits,
  };
}

/** Every pool in step order: the ranked groups, then the flat allotments. */
export function allotmentStates(build: V20Build): AllotmentState[] {
  return [
    ...RANKED_ALLOTMENTS.flatMap((allotment) => rankedStates(build, allotment)),
    ...FLAT_ALLOTMENTS.map((allotment) => flatState(build, allotment)),
  ];
}

/** The ranked allotment and group a trait belongs to, if it is in one. */
export function rankedGroupOf(
  ref: BuildTraitRef,
): { allotment: RankedAllotment; group: RankedAllotment['groups'][number] } | undefined {
  for (const allotment of RANKED_ALLOTMENTS) {
    if (kindOf(ref) !== allotment.traitKind) continue;
    const group = allotment.groups.find((entry) => entry.traits.includes(keyOf(ref)));
    if (group) return { allotment, group };
  }
  return undefined;
}

export function flatAllotmentOf(ref: BuildTraitRef): FlatAllotment | undefined {
  return FLAT_ALLOTMENTS.find((allotment) => allotment.traitKind === kindOf(ref));
}

/** The pool whose creation dots `ref` takes; Humanity and Willpower have none. */
export function allotmentStateFor(build: V20Build, ref: BuildTraitRef): AllotmentState | undefined {
  const states = allotmentStates(build);
  const ranked = rankedGroupOf(ref);
  if (ranked) return states.find((state) => state.key === ranked.group.key);
  const flat = flatAllotmentOf(ref);
  return flat && states.find((state) => state.key === flat.key);
}
