// What the builder page shows: everything it renders comes from `report`, so
// the page never compares numbers against budgets or maximums itself.

import { allotmentStates, isUnranked, poolStateOf, type AllotmentState } from './allotments';
import { CONCEPT_FIELDS, FIXED_TRAIT_REFS, type BuildTraitRef, type ConceptField, type V20Build } from './build';
import { freebieBudget, freebiesRemaining, freebiesSpent } from './freebies';
import { effectiveGeneration, limits, maximumFor, ordinal, violations } from './limits';
import {
  clanDisciplines,
  creationRating,
  dotsOf,
  freeDots,
  isCaitiff,
  isLocked,
  kindOf,
  rating,
  traitLabel,
} from './ratings';
import { FREEBIE_COSTS, RANKED_ALLOTMENTS, SCREENS, type BuildStep, type Rank } from './rules';
import { plural } from './wording';

export interface SettingsReport {
  baseGeneration: number;
  extraFreebies: number;
  freebieBudget: number;
  effectiveGeneration: number;
  maxTrait: number;
  bloodPoolMax: number;
  bloodPerTurn: number;
}

export interface ConceptReport {
  fields: Record<ConceptField, string>;
  clan: string;
}

/** One trait as a rating control shows it. */
export interface TraitReport {
  ref: BuildTraitRef;
  label: string;
  rating: number;
  /** The rating before freebie points. */
  creationRating: number;
  freebieDots: number;
  max: number;
  /**
   * The control's floor: the free dots, which nothing removes. Lowering into
   * creation or freebie dots from the wrong step is asked for and refused with
   * a reason that names the right step.
   */
  floor: number;
  locked: boolean;
  /** What is announced with the value. */
  valueText: string;
}

/** One pool of creation dots, with the text its readout shows. */
export interface AllotmentReport extends AllotmentState {
  overspent: boolean;
  /** "5 dots remaining", "Rank this group to place dots", "Overspent by 4 — …". */
  status: string;
}

export interface OutstandingItem {
  step: BuildStep;
  message: string;
}

export type FreebieSection = 'attributes' | 'abilities' | 'disciplines' | 'backgrounds' | 'virtues' | 'humanity' | 'willpower';

export interface FreebieReport {
  budget: number;
  spent: number;
  remaining: number;
  /** "15 freebie points remaining", or how far a stored build is over. */
  status: string;
  /** Each section's cost per dot and how many dots it holds bought with freebie points. */
  sections: Record<FreebieSection, { cost: number; dots: number }>;
}

/** Whether the build can be finished now, and what the Finish control says about it. */
export interface FinishReport {
  /** Something is outstanding, so Finish does nothing yet. */
  blocked: boolean;
  itemsLeft: number;
  unspentFreebies: number;
  /** The Finish control's label: "Finish character · 2 items left" while blocked, "Finish character" otherwise. */
  label: string;
  /** What activating a blocked Finish says. The label already says how many items are left, so this does not. */
  refusalMessage: string;
}

export interface BuildReport {
  settings: SettingsReport;
  concept: ConceptReport;
  ranks: Record<string, Rank | ''>;
  traits: Record<string, TraitReport>;
  allotments: Record<string, AllotmentReport>;
  disciplines: {
    /** No clan chosen: no Discipline dots can be placed with creation dots. */
    needsClan: boolean;
    /** A Caitiff adds the Disciplines it wants. */
    choosesOwn: boolean;
    /** Rows on the Advantages step, in order. */
    creationRows: BuildTraitRef[];
    /** Rows on Finishing touches, in order: also those bought outside the clan. */
    freebieRows: BuildTraitRef[];
  };
  freebies: FreebieReport;
  bloodPool: number | null;
  /** The range shown beside the Blood Pool field: "0 to 10 at 13th generation". */
  bloodPoolHint: string;
  outstanding: OutstandingItem[];
  finish: FinishReport;
}

export function settingsReport(build: V20Build): SettingsReport {
  const { maxTrait, bloodPoolMax, bloodPerTurn } = limits(build);
  return {
    baseGeneration: build.settings.baseGeneration,
    extraFreebies: build.settings.extraFreebies,
    freebieBudget: freebieBudget(build),
    effectiveGeneration: effectiveGeneration(build),
    maxTrait,
    bloodPoolMax,
    bloodPerTurn,
  };
}

export function conceptReport(build: V20Build): ConceptReport {
  // The sample concept and drive are not sheet header fields, so the readout leaves them out.
  const fields = Object.fromEntries(CONCEPT_FIELDS.map((field) => [field, build.concept[field]])) as Record<ConceptField, string>;
  return { fields, clan: build.clan };
}

function valueText(build: V20Build, ref: BuildTraitRef, max: number): string {
  const value = rating(build, ref);
  if (isLocked(build, ref)) return `${value}, fixed for ${build.clan}`;
  const { freebie } = dotsOf(build, ref);
  if (freebie === 0) return `${value} of ${max}`;
  const base = ref === 'humanity' || ref === 'willpower' ? 'from Virtues' : 'from creation';
  return `${value} of ${max}: ${creationRating(build, ref)} ${base}, ${freebie} from freebie points`;
}

export function traitReport(build: V20Build, ref: BuildTraitRef): TraitReport {
  const max = maximumFor(build, ref);
  return {
    ref,
    label: traitLabel(ref),
    rating: rating(build, ref),
    creationRating: creationRating(build, ref),
    freebieDots: dotsOf(build, ref).freebie,
    max,
    floor: freeDots(build, ref),
    locked: isLocked(build, ref),
    valueText: valueText(build, ref, max),
  };
}

const disciplineRef = (name: string): BuildTraitRef => `discipline:${name}`;

const SECTION_KINDS: Record<FreebieSection, keyof typeof FREEBIE_COSTS> = {
  attributes: 'attribute',
  abilities: 'ability',
  disciplines: 'discipline',
  backgrounds: 'background',
  virtues: 'virtue',
  humanity: 'humanity',
  willpower: 'willpower',
};

export function freebieReport(build: V20Build): FreebieReport {
  const remaining = freebiesRemaining(build);
  const traits: BuildTraitRef[] = [...FIXED_TRAIT_REFS, ...build.disciplines.map((entry) => disciplineRef(entry.name))];
  const sections = Object.fromEntries(
    Object.entries(SECTION_KINDS).map(([section, kind]) => [
      section,
      {
        cost: FREEBIE_COSTS[kind],
        dots: traits.filter((ref) => kindOf(ref) === kind).reduce((sum, ref) => sum + dotsOf(build, ref).freebie, 0),
      },
    ]),
  ) as FreebieReport['sections'];
  return {
    budget: freebieBudget(build),
    spent: freebiesSpent(build),
    remaining,
    status:
      remaining >= 0
        ? `${plural(remaining, 'freebie point')} remaining`
        : `Overspent by ${plural(-remaining, 'freebie point')}`,
    sections,
  };
}

export function disciplineRows(build: V20Build): BuildReport['disciplines'] {
  const clan = clanDisciplines(build);
  // Catalogue names are stored in catalogue spelling, so a plain comparison finds clan rows.
  const others = build.disciplines.map((entry) => entry.name).filter((name) => !clan.includes(name));
  const placedOthers = build.disciplines
    .filter((entry) => !clan.includes(entry.name) && (isCaitiff(build) || entry.creation > 0))
    .map((entry) => entry.name);
  return {
    needsClan: build.clan === '',
    choosesOwn: isCaitiff(build),
    creationRows: [...clan, ...placedOthers].map(disciplineRef),
    freebieRows: [...clan, ...others].map(disciplineRef),
  };
}

/** How a player says an overspent pool's traits: a ranked group's are named for the group. */
const overspentTraits = (state: AllotmentState): string => (state.kind === 'ranked' ? `${state.label} traits` : state.label);

function allotmentStatus(state: AllotmentState): string {
  switch (poolStateOf(state)) {
    case 'overspent':
      return `Overspent by ${-state.remaining} — lower ${overspentTraits(state)} by ${-state.remaining}`;
    case 'unranked':
      return 'Rank this group to place dots';
    default:
      return `${plural(state.remaining, 'dot')} remaining`;
  }
}

export function allotmentReports(build: V20Build): Record<string, AllotmentReport> {
  return Object.fromEntries(
    allotmentStates(build).map((state) => [
      state.key,
      { ...state, overspent: poolStateOf(state) === 'overspent', status: allotmentStatus(state) },
    ]),
  );
}

const stepIndex = (step: BuildStep): number => SCREENS.findIndex((entry) => entry.id === step);

/** What a pool still asks of the player: dots to place, or dots to lower. An unranked group asks for its rank first. */
function dotItem(state: AllotmentState): OutstandingItem | undefined {
  switch (poolStateOf(state)) {
    case 'open':
      return { step: state.step, message: `Place ${plural(state.remaining, `${state.noun} dot`)}` };
    case 'overspent':
      return { step: state.step, message: `Lower ${overspentTraits(state)} by ${plural(-state.remaining, 'dot')}` };
    default:
      return undefined;
  }
}

const dotItems = (states: AllotmentState[]): OutstandingItem[] =>
  states.map(dotItem).filter((item): item is OutstandingItem => item !== undefined);

const clanItem = (build: V20Build): OutstandingItem[] => (build.clan === '' ? [{ step: 'clan', message: 'Choose a clan' }] : []);

function rankedItems(states: AllotmentState[]): OutstandingItem[] {
  return RANKED_ALLOTMENTS.flatMap((allotment) => {
    const groups = states.filter((state) => allotment.groups.some((group) => group.key === state.key));
    const rank: OutstandingItem[] = groups.some(isUnranked)
      ? [{ step: allotment.step, message: `Rank the ${allotment.noun} groups` }]
      : [];
    return [...rank, ...dotItems(groups.filter((group) => !isUnranked(group)))];
  });
}

const flatItems = (states: AllotmentState[]): OutstandingItem[] => dotItems(states.filter((state) => state.kind === 'flat'));

const bloodPoolItem = (build: V20Build): OutstandingItem[] =>
  build.bloodPool === null ? [{ step: 'finishing', message: 'Record a starting Blood Pool' }] : [];

const violationItems = (build: V20Build): OutstandingItem[] =>
  violations(build).map((violation) => ({ step: violation.step, message: violation.message }));

/** The items in step order, those on one step in the order given. */
const sortByStep = (items: OutstandingItem[]): OutstandingItem[] =>
  items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => stepIndex(a.item.step) - stepIndex(b.item.step) || a.index - b.index)
    .map(({ item }) => item);

/** What still stands between the build and a finished character, in step order. */
export function outstanding(build: V20Build): OutstandingItem[] {
  const states = allotmentStates(build);
  return sortByStep([
    ...clanItem(build),
    ...rankedItems(states),
    ...flatItems(states),
    ...bloodPoolItem(build),
    ...violationItems(build),
  ]);
}

export const unspentFreebies = (build: V20Build): number => Math.max(0, freebiesRemaining(build));

/** The range shown beside the Blood Pool field, which follows the effective generation. */
export function bloodPoolHint(build: V20Build): string {
  return `0 to ${limits(build).bloodPoolMax} at ${ordinal(effectiveGeneration(build))} generation`;
}

const FINISH_REFUSAL = 'This build is not finished: resolve the outstanding items first.';

/** Whether the build can be finished: nothing is outstanding. The one test the page and the storage both make. */
export const isFinishable = (build: V20Build, items: OutstandingItem[] = outstanding(build)): boolean =>
  items.length === 0;

export function finishReport(build: V20Build, items: OutstandingItem[] = outstanding(build)): FinishReport {
  const blocked = !isFinishable(build, items);
  const left = `${plural(items.length, 'item')} left`;
  return {
    blocked,
    itemsLeft: items.length,
    unspentFreebies: unspentFreebies(build),
    label: blocked ? `Finish character · ${left}` : 'Finish character',
    refusalMessage: FINISH_REFUSAL,
  };
}

export function report(build: V20Build): BuildReport {
  const items = outstanding(build);
  const disciplines = disciplineRows(build);
  const refs: BuildTraitRef[] = [...FIXED_TRAIT_REFS, ...disciplines.freebieRows];
  return {
    settings: settingsReport(build),
    concept: conceptReport(build),
    ranks: { ...build.ranks },
    traits: Object.fromEntries(refs.map((ref) => [ref, traitReport(build, ref)])),
    allotments: allotmentReports(build),
    disciplines,
    freebies: freebieReport(build),
    bloodPool: build.bloodPool,
    bloodPoolHint: bloodPoolHint(build),
    outstanding: items,
    finish: finishReport(build, items),
  };
}
