// What the Attributes and Abilities screens show for a ranked allotment: each group's priority choices, its
// pool meter and status words, its rows' limits, the callout for a group not fully placed, and the neutral
// "What the choices say" lines. Built on `allotmentReports`, `creationMaximum` and the rating selectors, so the
// page never recounts dots or compares a number against a budget or a maximum. No line names the character
// or uses a pronoun. The pool, row and callout pieces also serve the Advantages screen's flat pools
// (advantageViews.ts), which have no rank.

import { isUnranked, poolStateOf, type PoolState } from './allotments';
import { allotmentReports, type AllotmentReport } from './progress';
import type { BuildTraitRef, FixedTraitRef, V20Build } from './build';
import { creationMaximum } from './limits';
import { creationFloor, dotsOf, freeDots, isLocked, rating, traitLabel } from './ratings';
import { dotNoun } from './screens';
import { FIXED_MAXIMUMS, RANKED_ALLOTMENTS, RANKS, type Rank, type RankedAllotment } from './rules';
import { NOT_ALLOCATED, list, plural, titleCase } from './wording';

export type RankedKey = RankedAllotment['key'];

/** Said while no rank is held twice. */
export const PRIORITY_UNIQUE = 'Priority order is unique';

/** Said while a rank is held twice, which only a stored build can: the screen's own choices swap instead. */
export const PRIORITY_DUPLICATE = 'Priority order is not unique · Give each group a different rank';

/** One entry of a group's priority select. Every rank is always offered. */
export interface RankOption {
  rank: Rank;
  /** "Primary". */
  label: string;
  /** The dots that rank grants. */
  dots: number;
  /** "Primary · 7 dots". */
  text: string;
}

/** 'placed' is a dot in the group, 'open' one still to place, 'over' one past the rank's dots. */
export type Segment = 'placed' | 'open' | 'over';

export interface PoolView {
  state: PoolState;
  segments: Segment[];
  placed: number;
  /** The dots the rank grants; 0 while unranked. */
  total: number;
  /** "3 remaining", "Overspent by 2", "Not allocated". */
  remainingText: string;
  /** "4 / 7 spent · Allocation needed", "7 / 7 spent · Complete", or what to do while unranked. */
  spentText: string;
  /** What the group's status region holds: "Physical: 2 remaining", "Physical: Complete". */
  announcement: string;
}

/** One trait's plus control: whether it can place a dot now, and the visible reason when it cannot. */
export interface RowView {
  ref: BuildTraitRef;
  label: string;
  /** The trait's rating now, free, creation and freebie dots together. */
  rating: number;
  /** The highest rating creation dots reach: "Maximum 3". */
  max: number;
  canRaise: boolean;
  /** "Maximum 3", "Fixed for Nosferatu", "No dots left in Social", "Rank Social first"; null when the plus can act. */
  limit: string | null;
  /** The lowest rating creation dots can set: free and freebie dots already give it. */
  min: number;
  /** Whether the minus can take a creation dot off now. */
  canLower: boolean;
  /** "Minimum 1, free dot", "Minimum 0", "Fixed for Nosferatu"; null when the minus can act. */
  lowerLimit: string | null;
}

export interface Callout {
  /** "Finish Physical before moving on". */
  heading: string;
  /** "2 of 3 additional Physical dots are placed and 1 remains". */
  summary: string;
  /** The traits that can still take dots. */
  traits: string[];
  /** "Dots can go on Strength, Dexterity and Stamina."; empty when no trait can take one. */
  traitsText: string;
}

export interface RankedGroupView {
  key: string;
  label: string;
  rank: Rank | '';
  /** "All ratings 0–3" on every Abilities group; null on Attributes groups, which state no cap. */
  tag: string | null;
  pool: PoolView;
  rows: RowView[];
  callout: Callout | null;
}

export interface RankedScreenView {
  key: RankedKey;
  intro: string;
  /** The select's entries, the same for every group. */
  options: RankOption[];
  groups: RankedGroupView[];
  /** `unique` is true while no rank is held twice and at least one is held. `text` is then PRIORITY_UNIQUE; PRIORITY_DUPLICATE
   * while a rank is held twice; empty while none is held. */
  priority: { unique: boolean; text: string };
  /** "Strongest: Social", "Tertiary: Physical": neutral lines for the summary card. */
  summary: string[];
}

export const rankOptions = (allotment: RankedAllotment): RankOption[] =>
  RANKS.map((rank) => ({
    rank,
    label: titleCase(rank),
    dots: allotment.rankDots[rank],
    text: `${titleCase(rank)} · ${plural(allotment.rankDots[rank], 'dot')}`,
  }));

/** A pool's meter and words, for a ranked group or a flat pool. */
export function poolOf(report: AllotmentReport): PoolView {
  const { label, placed, remaining, dots } = report;
  const state = poolStateOf(report);
  const unranked = isUnranked(report);
  const remainingText =
    state === 'overspent' ? `Overspent by ${-remaining}` : state === 'unranked' ? NOT_ALLOCATED : `${remaining} remaining`;
  const segments: Segment[] = Array.from({ length: Math.max(dots, placed) }, (_, index) =>
    index >= dots ? 'over' : index < placed ? 'placed' : 'open',
  );
  return {
    state,
    segments,
    placed,
    total: dots,
    remainingText,
    spentText: unranked
      ? `Rank the group to place dots${placed > 0 ? ` · ${plural(placed, 'dot')} held` : ''}`
      : `${placed} / ${dots} spent · ${state === 'complete' ? 'Complete' : 'Allocation needed'}`,
    announcement: `${label}: ${state === 'complete' ? 'Complete' : remainingText}`,
  };
}

/** Why the plus on `ref` cannot place a dot, in the order a player can act on: fixed, at its top, unranked, pool spent. */
function limitOf(build: V20Build, report: AllotmentReport, ref: BuildTraitRef, max: number): string | null {
  if (isLocked(build, ref)) return `Fixed for ${build.clan}`;
  if (rating(build, ref) >= max) return `Maximum ${max}`;
  if (isUnranked(report)) return `Rank ${report.label} first`;
  if (report.remaining <= 0) return `No dots left in ${report.label}`;
  return null;
}

/** Why the minus on `ref` cannot take a dot off, or null when it can: fixed, or at the floor free and freebie dots set. */
function lowerLimitOf(build: V20Build, ref: BuildTraitRef, floor: number): string | null {
  if (isLocked(build, ref)) return `Fixed for ${build.clan}`;
  if (rating(build, ref) > floor) return null;
  if (dotsOf(build, ref).freebie > 0) return `Minimum ${floor}, freebie dots are removed on Finishing touches`;
  const free = freeDots(build, ref);
  return free > 0 ? `Minimum ${floor}, free ${free === 1 ? 'dot' : 'dots'}` : `Minimum ${floor}`;
}

/** One trait's row in a pool. `max` is the top creation dots reach, which a screen may lower (Generation). */
export function rowOf(build: V20Build, report: AllotmentReport, ref: BuildTraitRef, max: number = creationMaximum(build, ref)): RowView {
  const limit = limitOf(build, report, ref, max);
  const min = creationFloor(build, ref);
  const lowerLimit = lowerLimitOf(build, ref, min);
  return {
    ref,
    label: traitLabel(ref),
    rating: rating(build, ref),
    max,
    canRaise: limit === null,
    limit,
    min,
    canLower: lowerLimit === null,
    lowerLimit,
  };
}

/** The callout for a pool not fully placed; none while unranked, complete or overspent. */
export function calloutOf(report: AllotmentReport, rows: RowView[], additional: boolean): Callout | null {
  if (isUnranked(report) || report.remaining <= 0) return null;
  const traits = rows.filter((row) => row.canRaise).map((row) => row.label);
  const noun = `${additional ? 'additional ' : ''}${dotNoun(report)}`;
  return {
    heading: `Finish ${report.label} before moving on`,
    summary: `${report.placed} of ${report.dots} ${noun} dots are placed and ${report.remaining} ${report.remaining === 1 ? 'remains' : 'remain'}`,
    traits,
    traitsText: traits.length === 0 ? '' : `Dots can go on ${list(traits)}.`,
  };
}

function summaryOf(groups: RankedGroupView[]): string[] {
  const named = (rank: Rank) => groups.filter((group) => group.rank === rank).map((group) => group.label);
  const lines = [
    named('primary').length > 0 ? `Strongest: ${list(named('primary'))}` : '',
    named('tertiary').length > 0 ? `Tertiary: ${list(named('tertiary'))}` : '',
  ].filter((line) => line !== '');
  if (lines.length > 0) return lines;
  // Only Secondary is held: say it, so a build with a rank never reads as having none.
  return named('secondary').length > 0 ? [`Secondary: ${list(named('secondary'))}`] : ['No priorities set yet.'];
}

function introOf(allotment: RankedAllotment): string {
  if (allotment.freeDots > 0) return `Dot counts include ${plural(allotment.freeDots, 'automatic dot')} in each trait.`;
  return `Every ${allotment.noun} starts at 0 and stops at ${FIXED_MAXIMUMS.abilityCreation} before freebie points.`;
}

/** The cap each group of an allotment with no automatic dots states; null where none is stated. */
const tagOf = (allotment: RankedAllotment): string | null =>
  allotment.freeDots > 0 ? null : `All ratings 0–${FIXED_MAXIMUMS.abilityCreation}`;

/** Everything the screen for one ranked allotment draws. */
export function rankedView(build: V20Build, key: RankedKey): RankedScreenView {
  const allotment = RANKED_ALLOTMENTS.find((entry) => entry.key === key)!;
  const reports = allotmentReports(build);
  const groups = allotment.groups.map((group): RankedGroupView => {
    const report = reports[group.key];
    const rows = group.traits.map((trait) => rowOf(build, report, `${allotment.traitKind}:${trait}` as FixedTraitRef));
    return {
      key: group.key,
      label: group.label,
      rank: report.rank,
      tag: tagOf(allotment),
      pool: poolOf(report),
      rows,
      callout: calloutOf(report, rows, allotment.freeDots > 0),
    };
  });
  const held = groups.map((group) => group.rank).filter((rank) => rank !== '');
  const unique = held.length > 0 && new Set(held).size === held.length;
  return {
    key,
    intro: introOf(allotment),
    options: rankOptions(allotment),
    groups,
    priority: { unique, text: held.length === 0 ? '' : unique ? PRIORITY_UNIQUE : PRIORITY_DUPLICATE },
    summary: summaryOf(groups),
  };
}
