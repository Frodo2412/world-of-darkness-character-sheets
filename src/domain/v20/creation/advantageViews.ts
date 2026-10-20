// What the Advantages screen shows: the Disciplines card (the clan's rows, or the state that stands in for
// them), the Backgrounds card (a search over the fourteen Backgrounds, a chip for each and a row for each one
// chosen) and the Virtues card. Built on `allotmentReports` and the pool, row and callout views of
// poolViews.ts, so the page never recounts dots or compares a number against a budget or a maximum.
//
// A Background is chosen when the build holds a dot on it or when the screen has picked it. The build has no
// place to record a chip chosen at 0 dots, so `picked` is the screen's own state, passed in: it is gone after
// a reload. No line names the character or uses a pronoun.

import type { BuildTraitRef, V20Build } from './build';
import { matchByName } from './catalogue';
import { GENERATION_REF, maximumFor } from './limits';
import { calloutOf, poolOf, rowOf, type Callout, type PoolView, type RowView } from './poolViews';
import { allotmentReports, disciplineRows, type AllotmentReport } from './progress';
import { dotsOf, rating } from './ratings';
import {
  BACKGROUNDS,
  BACKGROUND_ALLOTMENT,
  BUILD_VIRTUES,
  DISCIPLINE_ALLOTMENT,
  FIXED_MAXIMUMS,
  GENERATION_TABLE,
  MAX_HELD,
  VIRTUE_ALLOTMENT,
  type BackgroundName,
} from './rules';
import { DISCIPLINES_NEED_CLAN, list, type GateReason } from './screens';
import { plural } from './wording';

/** Said beside the Background chips once six are chosen: the other chips cannot be pressed. */
export const SIX_IS_THE_MOST = 'Six is the most';

/** The line under the Virtues: Humanity and Willpower follow them. */
export const VIRTUES_DERIVATION = 'Humanity and Willpower are derived from the Virtues.';

/** Describes the group of Background chips: how the keys work. */
export const BACKGROUND_KEYS_HELP = 'Tab moves between chips; Space or Enter chooses or clears a Background.';

const BACKGROUNDS_LINE = 'Five dots across at most six Backgrounds.';
const NO_BACKGROUND_ROWS = 'Choose a chip to add its row.';
const VIRTUES_LINE = 'Seven dots over the free dot each Virtue has.';
const DISCIPLINES_LINE = {
  clan: "Three dots across the clan's Disciplines.",
  caitiff: 'Caitiff may place three dots on any Discipline.',
  none: 'Disciplines appear once a clan is chosen.',
} as const;

/** The Backgrounds a Sabbat character holds: shown with "(Sabbat)", stored and written to the sheet without it. */
const SABBAT_BACKGROUNDS: readonly BackgroundName[] = ['Black Hand Membership', 'Rituals'];

/** What a Background is called on the screen. The name the build stores and the sheet carries is unchanged. */
export const backgroundLabel = (name: BackgroundName): string => (SABBAT_BACKGROUNDS.includes(name) ? `${name} (Sabbat)` : name);

const backgroundRef = (name: BackgroundName): BuildTraitRef => `background:${name}`;

// Disciplines

export interface DisciplineRow extends RowView {
  /** A Caitiff's own row can be taken off; a clan's three cannot. */
  removable: boolean;
}

export interface DisciplinesView {
  /** One original line for the card, by what the clan allows. */
  line: string;
  pool: PoolView;
  rows: DisciplineRow[];
  /** Why no dots can be placed yet, and the screen that puts it right; null once a clan is chosen. */
  gate: GateReason | null;
  /** A Caitiff names the Disciplines wanted, from the catalogue or by writing one in. */
  canAdd: boolean;
}

export function disciplinesView(build: V20Build): DisciplinesView {
  const { creationRows, needsClan, choosesOwn } = disciplineRows(build);
  const report = allotmentReports(build).disciplines;
  return {
    line: needsClan ? DISCIPLINES_LINE.none : choosesOwn ? DISCIPLINES_LINE.caitiff : DISCIPLINES_LINE.clan,
    pool: poolOf(report),
    rows: creationRows.map((ref) => ({ ...rowOf(build, report, ref), removable: choosesOwn })),
    gate: needsClan ? { text: DISCIPLINES_NEED_CLAN, goTo: 'clan' } : null,
    canAdd: choosesOwn,
  };
}

// Backgrounds

export interface BackgroundChip {
  /** The name the build stores. */
  name: BackgroundName;
  /** The name as shown: "Rituals (Sabbat)". */
  label: string;
  /** The chip is pressed: the build holds a dot on it, or the screen has picked it. */
  selected: boolean;
  /** Six are chosen and this is not one of them, so it cannot be chosen. */
  unavailable: boolean;
}

export interface BackgroundRow extends RowView {
  name: BackgroundName;
  label: string;
  /** The row holds no dot, so it can be taken off and its chip cleared. */
  removable: boolean;
}

export interface BackgroundsView {
  line: string;
  pool: PoolView;
  /** The chips the search keeps, in the order of the list. */
  chips: BackgroundChip[];
  /** "All Backgrounds · 14": the chips the search keeps. */
  heading: string;
  /** Said to assistive technology each time the search changes the chips. */
  results: string;
  /** "Selected · 3/6". */
  selected: string;
  /** Why the unavailable chips cannot be pressed; null while any chip can. */
  limit: string | null;
  /** A row for each Background chosen, whatever the search says. */
  rows: BackgroundRow[];
  /** What stands where the rows will be while none is chosen; null once one is. */
  empty: string | null;
}

/** The Backgrounds that are chosen: held with a dot, or picked, in list order. */
export const selectedBackgrounds = (build: V20Build, picked: ReadonlySet<BackgroundName>): BackgroundName[] =>
  BACKGROUNDS.filter((name) => picked.has(name) || rating(build, backgroundRef(name)) > 0);

/**
 * The chips the screen keeps chosen: the Backgrounds the build holds a dot on, and the chips picked at 0 dots
 * that still fit within six, the earliest chosen first. The build's own cap counts dots only, so a dot bought
 * on one more Background (with freebie points) must not leave more than six chosen on this screen.
 */
export function reconcilePicked(build: V20Build, picked: ReadonlySet<BackgroundName>): Set<BackgroundName> {
  const held = BACKGROUNDS.filter((name) => rating(build, backgroundRef(name)) > 0);
  const empty = [...picked].filter((name) => !held.includes(name)).slice(0, Math.max(0, MAX_HELD - held.length));
  const keep = new Set<BackgroundName>([...held, ...empty]);
  return new Set([...picked, ...held].filter((name) => keep.has(name)));
}

/**
 * The most Generation dots creation can place: the Background's own top, and no more than brings the effective
 * generation to the best there is. A stored build already past it keeps what it holds.
 */
function generationTop(build: V20Build): number {
  return Math.max(0, Math.min(maximumFor(build, GENERATION_REF), build.settings.baseGeneration - GENERATION_TABLE[0].generation));
}

function backgroundRow(build: V20Build, report: AllotmentReport, name: BackgroundName): BackgroundRow {
  const ref = backgroundRef(name);
  const top = ref === GENERATION_REF ? generationTop(build) : undefined;
  const row = rowOf(build, report, ref, top);
  // A top lower than the Background's own is the generation's, and the row says so.
  const bound = top !== undefined && top < FIXED_MAXIMUMS.generationBackground && row.limit === `Maximum ${top}`;
  return {
    ...row,
    limit: bound ? `Maximum ${top}, ${GENERATION_TABLE[0].generation}th generation is the best` : row.limit,
    name,
    label: backgroundLabel(name),
    removable: row.rating === 0,
  };
}

/** The Backgrounds card for a search `query`, with `picked` the chips the screen has chosen. */
export function backgroundsView(build: V20Build, picked: ReadonlySet<BackgroundName>, query: string): BackgroundsView {
  const chosen = selectedBackgrounds(build, picked);
  const full = chosen.length >= MAX_HELD;
  const report = allotmentReports(build).backgrounds;
  // Searched by the name as shown, so what a player reads is what finds it.
  const kept = matchByName(
    BACKGROUNDS.map((stored) => ({ name: backgroundLabel(stored), stored })),
    query,
  );
  return {
    line: BACKGROUNDS_LINE,
    pool: poolOf(report),
    chips: kept.map(({ name: label, stored }) => {
      const selected = chosen.includes(stored);
      return { name: stored, label, selected, unavailable: full && !selected };
    }),
    heading: `All Backgrounds · ${kept.length}`,
    results: kept.length === 0 ? `No Background matches "${query.trim()}".` : `${plural(kept.length, 'Background')} listed`,
    selected: `Selected · ${chosen.length}/${MAX_HELD}`,
    limit: full ? SIX_IS_THE_MOST : null,
    rows: chosen.map((name) => backgroundRow(build, report, name)),
    empty: chosen.length === 0 ? NO_BACKGROUND_ROWS : null,
  };
}

/** What pressing a chip does. A refusal says why, and the screen that can put it right when it is not this one. */
export type BackgroundPress = { kind: 'choose' } | { kind: 'clear' } | { kind: 'refuse'; reason: string; step?: 'finishing' };

export function pressBackground(build: V20Build, picked: ReadonlySet<BackgroundName>, name: BackgroundName): BackgroundPress {
  const chosen = selectedBackgrounds(build, picked);
  if (!chosen.includes(name)) return chosen.length >= MAX_HELD ? { kind: 'refuse', reason: SIX_IS_THE_MOST } : { kind: 'choose' };
  if (rating(build, backgroundRef(name)) === 0) return { kind: 'clear' };
  // Freebie dots come off on Finishing touches; creation dots where they were placed.
  return dotsOf(build, backgroundRef(name)).freebie > 0
    ? { kind: 'refuse', reason: `Remove the freebie dots of ${backgroundLabel(name)} on Finishing touches first.`, step: 'finishing' }
    : { kind: 'refuse', reason: `Lower ${backgroundLabel(name)} to 0 first.` };
}

// Virtues

export interface VirtuesView {
  line: string;
  pool: PoolView;
  rows: RowView[];
  callout: Callout | null;
  derivation: string;
}

export function virtuesView(build: V20Build): VirtuesView {
  const report = allotmentReports(build).virtues;
  const rows = BUILD_VIRTUES.map((virtue) => rowOf(build, report, `virtue:${virtue.key}`));
  return {
    line: VIRTUES_LINE,
    pool: poolOf(report),
    rows,
    callout: calloutOf(report, rows, VIRTUE_ALLOTMENT.freeDots > 0),
    derivation: VIRTUES_DERIVATION,
  };
}

// The screen

export interface AdvantagesView {
  /** "Place 3 Discipline dots, 5 Background dots and 7 Virtue dots." */
  intro: string;
  disciplines: DisciplinesView;
  backgrounds: BackgroundsView;
  virtues: VirtuesView;
}

export function advantagesView(build: V20Build, picked: ReadonlySet<BackgroundName>, query: string): AdvantagesView {
  const dots = [DISCIPLINE_ALLOTMENT, BACKGROUND_ALLOTMENT, VIRTUE_ALLOTMENT].map((allotment) =>
    plural(allotment.dots, `${allotment.noun} dot`),
  );
  return {
    intro: `Place ${list(dots)}.`,
    disciplines: disciplinesView(build),
    backgrounds: backgroundsView(build, picked, query),
    virtues: virtuesView(build),
  };
}
