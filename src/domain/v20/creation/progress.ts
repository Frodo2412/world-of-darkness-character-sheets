// What the builder page shows: everything it renders comes from `report`, so
// the page never compares numbers against budgets or maximums itself.

import type { V20Build } from './build';
import { freebieBudget, limits } from './limits';

export interface SettingsReport {
  baseGeneration: number;
  extraFreebies: number;
  freebieBudget: number;
  maxTrait: number;
  bloodPoolMax: number;
  bloodPerTurn: number;
}

export interface BuildReport {
  settings: SettingsReport;
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

export function report(build: V20Build): BuildReport {
  return { settings: settingsReport(build) };
}
