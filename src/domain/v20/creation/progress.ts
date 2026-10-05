// What the builder page shows: everything it renders comes from `report`, so
// the page never compares numbers against budgets or maximums itself.

import type { ConceptField, V20Build } from './build';
import { freebieBudget, limits } from './limits';

export interface SettingsReport {
  baseGeneration: number;
  extraFreebies: number;
  freebieBudget: number;
  maxTrait: number;
  bloodPoolMax: number;
  bloodPerTurn: number;
}

export interface ConceptReport {
  fields: Record<ConceptField, string>;
  clan: string;
}

/** The builder's steps, in order. */
export const BUILD_STEPS = [
  'settings',
  'concept',
  'attributes',
  'abilities',
  'advantages',
  'finishing',
] as const;
export type BuildStep = (typeof BUILD_STEPS)[number];

export interface BuildReport {
  settings: SettingsReport;
  concept: ConceptReport;
  /** A short text status per step, '' when there is nothing to say. */
  steps: Record<BuildStep, string>;
}

export function settingsReport(build: V20Build): SettingsReport {
  const { maxTrait, bloodPoolMax, bloodPerTurn } = limits(build);
  return {
    baseGeneration: build.settings.baseGeneration,
    extraFreebies: build.settings.extraFreebies,
    freebieBudget: freebieBudget(build),
    maxTrait,
    bloodPoolMax,
    bloodPerTurn,
  };
}

export function conceptReport(build: V20Build): ConceptReport {
  return { fields: { ...build.concept }, clan: build.clan };
}

export function stepStatuses(build: V20Build): Record<BuildStep, string> {
  return {
    settings: '',
    concept: build.clan === '' ? 'clan needed' : '',
    attributes: '',
    abilities: '',
    advantages: '',
    finishing: '',
  };
}

export function report(build: V20Build): BuildReport {
  return {
    settings: settingsReport(build),
    concept: conceptReport(build),
    steps: stepStatuses(build),
  };
}
