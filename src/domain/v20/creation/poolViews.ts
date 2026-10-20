// What the Attributes and Abilities screens show for a ranked allotment: each group's priority choices, its
// pool meter and status words, its rows' limits, the callout for a group not fully placed, and the neutral
// "What the choices say" lines. Built on `allotmentReports`, `creationMaximum` and the rating selectors, so the
// page never recounts dots or compares a number against a budget or a maximum. No line names the character
// or uses a pronoun.

import { allotmentReports, type AllotmentReport } from './progress';
import type { FixedTraitRef, V20Build } from './build';
import { creationMaximum } from './limits';
import { isLocked, rating, traitLabel } from './ratings';
import { dotNoun, list } from './screens';
import { FIXED_MAXIMUMS, RANKED_ALLOTMENTS, RANKS, type Rank, type RankedAllotment } from './rules';
import { plural } from './wording';

export type RankedKey = RankedAllotment['key'];

/** Said while no rank is held twice. */
export const PRIORITY_UNIQUE = 'Priority order is unique';

/** One entry of a group's priority select. Every rank is always offered. */
export interface RankOption {
  rank: Rank;
  /** "Primary". */
  label: string;
  /** The dots that rank grants. */
  dots: number;
  /** "Primary · 7". */
  text: string;
}

/** 'placed' is a dot in the group, 'open' one still to place, 'over' one past the rank's dots. */
export type Segment = 'placed' | 'open' | 'over';

/** Said in words as well as colour: the state is never carried by the meter's colour alone. */
export type PoolState = 'unranked' | 'open' | 'complete' | 'overspent';

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
  ref: FixedTraitRef;
  label: string;
  /** The highest rating creation dots reach: "Maximum 3". */
  max: number;
  canRaise: boolean;
  /** "Maximum 3", "Fixed for Nosferatu", "No dots left in Social", "Rank Social first"; null when the plus can act. */
  limit: string | null;
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
  pool: PoolView;
  rows: RowView[];
  callout: Callout | null;
}

export interface RankedScreenView {
  key: RankedKey;
  intro: string;
  /** "All ratings 0–3" on Abilities; null where no cap is stated. */
  tag: string | null;
  /** The select's entries, the same for every group. */
  options: RankOption[];
  groups: RankedGroupView[];
  /** True while no rank is held twice and at least one is held; `text` is then PRIORITY_UNIQUE, else empty. */
  priority: { unique: boolean; text: string };
  /** "Strongest: Social", "Tertiary: Physical": neutral lines for the summary card. */
  summary: string[];
}

const titleCase = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

export const rankOptions = (allotment: RankedAllotment): RankOption[] =>
  RANKS.map((rank) => ({
    rank,
    label: titleCase(rank),
    dots: allotment.rankDots[rank],
    text: `${titleCase(rank)} · ${allotment.rankDots[rank]}`,
  }));

function poolOf(report: AllotmentReport): PoolView {
  const { label, placed, remaining, dots } = report;
  const state: PoolState =
    remaining < 0 ? 'overspent' : report.rank === '' ? 'unranked' : remaining === 0 ? 'complete' : 'open';
  const remainingText =
    state === 'overspent' ? `Overspent by ${-remaining}` : state === 'unranked' ? 'Not allocated' : `${remaining} remaining`;
  const segments: Segment[] = Array.from({ length: Math.max(dots, placed) }, (_, index) =>
    index >= dots ? 'over' : index < placed ? 'placed' : 'open',
  );
  return {
    state,
    segments,
    placed,
    total: dots,
    remainingText,
    spentText:
      state === 'unranked'
        ? 'Rank the group to place dots'
        : `${placed} / ${dots} spent · ${state === 'complete' ? 'Complete' : 'Allocation needed'}`,
    announcement: `${label}: ${state === 'complete' ? 'Complete' : remainingText}`,
  };
}

/** Why the plus on `ref` cannot place a dot, in the order a player can act on: fixed, at its top, unranked, pool spent. */
function limitOf(build: V20Build, report: AllotmentReport, ref: FixedTraitRef, max: number): string | null {
  if (isLocked(build, ref)) return `Fixed for ${build.clan}`;
  if (rating(build, ref) >= max) return `Maximum ${max}`;
  if (report.rank === '') return `Rank ${report.label} first`;
  if (report.remaining <= 0) return `No dots left in ${report.label}`;
  return null;
}

function rowOf(build: V20Build, report: AllotmentReport, ref: FixedTraitRef): RowView {
  const max = creationMaximum(build, ref);
  const limit = limitOf(build, report, ref, max);
  return { ref, label: traitLabel(ref), max, canRaise: limit === null, limit };
}

function calloutOf(report: AllotmentReport, rows: RowView[], additional: boolean): Callout | null {
  if (report.rank === '' || report.remaining <= 0) return null;
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
  return lines.length > 0 ? lines : ['No priorities set yet.'];
}

function introOf(allotment: RankedAllotment): { intro: string; tag: string | null } {
  if (allotment.freeDots > 0) {
    return { intro: `Dot counts include ${plural(allotment.freeDots, 'automatic dot')} in each trait.`, tag: null };
  }
  const cap = FIXED_MAXIMUMS.abilityCreation;
  return { intro: `Every ${allotment.noun} starts at 0 and stops at ${cap} before freebie points.`, tag: `All ratings 0–${cap}` };
}

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
      pool: poolOf(report),
      rows,
      callout: calloutOf(report, rows, allotment.freeDots > 0),
    };
  });
  const held = groups.map((group) => group.rank).filter((rank) => rank !== '');
  const unique = held.length > 0 && new Set(held).size === held.length;
  return {
    key,
    ...introOf(allotment),
    options: rankOptions(allotment),
    groups,
    priority: { unique, text: unique ? PRIORITY_UNIQUE : '' },
    summary: summaryOf(groups),
  };
}
