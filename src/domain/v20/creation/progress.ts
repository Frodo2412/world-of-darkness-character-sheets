// What the builder page shows: everything it renders comes from `report`, so
// the page never compares numbers against budgets or maximums itself.

import { allotmentStates, type AllotmentState } from './allotments';
import { FIXED_TRAIT_REFS, type BuildTraitRef, type ConceptField, type V20Build } from './build';
import { freebieBudget, freebiesRemaining, freebiesSpent } from './freebies';
import { effectiveGeneration, limits, maximumFor, violations } from './limits';
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
import { BUILD_STEPS, FREEBIE_COSTS, RANKED_ALLOTMENTS, type BuildStep, type Rank } from './rules';

export { BUILD_STEPS, type BuildStep } from './rules';

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
  bloodPool: number;
  outstanding: OutstandingItem[];
  /** A short text status per step, '' when there is nothing to say. */
  steps: Record<BuildStep, string>;
}

const plural = (count: number, one: string, many = `${one}s`): string =>
  `${count} ${count === 1 ? one : many}`;

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
  return { fields: { ...build.concept }, clan: build.clan };
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

function disciplineRows(build: V20Build): BuildReport['disciplines'] {
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

function allotmentStatus(state: AllotmentState): string {
  if (state.remaining < 0) {
    const over = -state.remaining;
    const what = state.kind === 'ranked' ? `${state.label} traits` : state.label;
    return `Overspent by ${over} — lower ${what} by ${over}`;
  }
  if (state.kind === 'ranked' && state.rank === '') return 'Rank this group to place dots';
  return `${plural(state.remaining, 'dot')} remaining`;
}

export function allotmentReports(build: V20Build): Record<string, AllotmentReport> {
  return Object.fromEntries(
    allotmentStates(build).map((state) => [
      state.key,
      { ...state, overspent: state.remaining < 0, status: allotmentStatus(state) },
    ]),
  );
}

const stepIndex = (step: BuildStep): number => BUILD_STEPS.findIndex((entry) => entry.step === step);

/** What still stands between the build and a finished character, in step order. */
export function outstanding(build: V20Build): OutstandingItem[] {
  const items: OutstandingItem[] = [];
  if (build.clan === '') items.push({ step: 'concept', message: 'Choose a clan' });

  const states = allotmentStates(build);
  for (const allotment of RANKED_ALLOTMENTS) {
    const { step } = allotment;
    const keys = allotment.groups.map((group) => group.key);
    const groups = states.filter((state) => keys.includes(state.key));
    if (groups.some((group) => group.rank === '')) {
      items.push({ step, message: `Rank the ${allotment.noun} groups` });
    }
    for (const group of groups.filter((entry) => entry.rank !== '')) {
      if (group.remaining > 0) {
        items.push({ step, message: `Place ${plural(group.remaining, `${group.label} dot`)}` });
      } else if (group.remaining < 0) {
        items.push({ step, message: `Lower ${group.label} traits by ${plural(-group.remaining, 'dot')}` });
      }
    }
  }
  for (const state of states.filter((entry) => entry.kind === 'flat')) {
    if (state.remaining > 0) {
      items.push({ step: state.step, message: `Place ${plural(state.remaining, `${state.noun} dot`)}` });
    } else if (state.remaining < 0) {
      items.push({ step: state.step, message: `Lower ${state.label} by ${plural(-state.remaining, 'dot')}` });
    }
  }
  for (const violation of violations(build)) {
    items.push({ step: violation.step, message: violation.message });
  }
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => stepIndex(a.item.step) - stepIndex(b.item.step) || a.index - b.index)
    .map(({ item }) => item);
}

export const unspentFreebies = (build: V20Build): number => Math.max(0, freebiesRemaining(build));

/** The step navigation's word on each step, from the same reads as the outstanding list. */
export function stepStatuses(build: V20Build): Record<BuildStep, string> {
  const states = allotmentStates(build);
  const items = outstanding(build);
  const statusOf = (step: BuildStep): string => {
    const own = states.filter((state) => state.step === step);
    if (own.some((state) => state.remaining < 0)) return 'overspent';
    if (own.some((state) => state.kind === 'ranked' && state.rank === '')) return 'ranks needed';
    const left = own.reduce((sum, state) => sum + Math.max(0, state.remaining), 0);
    if (left > 0) return `${plural(left, 'dot')} left`;
    if (items.some((item) => item.step === step)) return 'check limits';
    return '';
  };
  return {
    settings: '',
    concept: build.clan === '' ? 'clan needed' : '',
    attributes: statusOf('attributes'),
    abilities: statusOf('abilities'),
    advantages: statusOf('advantages'),
    finishing: items.some((item) => item.step === 'finishing') ? 'check limits' : '',
  };
}

export function report(build: V20Build): BuildReport {
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
    outstanding: outstanding(build),
    steps: stepStatuses(build),
  };
}
