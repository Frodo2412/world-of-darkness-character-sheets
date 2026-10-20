// Controls are found by data attributes, so a step adds fields in its markup
// without new wiring here. The page never judges a value itself: it forwards
// what the player entered and draws what `report` says.

import type { BuildTraitRef, V20Build } from '../../domain/v20/creation/build';
import type { BuildReport } from '../../domain/v20/creation/progress';
import type { UpdateResult } from '../../domain/v20/creation/result';
import { ordinal } from '../../domain/v20/creation/limits';
import { rating } from '../../domain/v20/creation/ratings';
import { setRank, setRating, type DotSource } from '../../domain/v20/creation/updates';
import type { BuildStore } from '../../storage/buildStore';
import type { CharacterStore } from '../../storage/characterStore';
import { showReadout } from './messages';
import { announceValue, renderStepper } from './parts/ratingStepper';
import { renderTypedNumbers, wireTypedNumbers } from './parts/typedNumber';

export type Update = (build: V20Build) => UpdateResult;
/**
 * Applies an update made through `control`, which is where a refusal or
 * notice is shown, and says whether it was applied.
 */
export type Commit = (update: Update, control: HTMLElement) => UpdateResult['status'];

export interface Wiring {
  commit: Commit;
  /** The build as it is now, for questions asked before committing. */
  current: () => V20Build;
  builds: BuildStore;
  characters: CharacterStore;
  /** Redraws every screen from the build, giving back what a cleared refusal had left typed. */
  render: () => void;
}

export function wireControls(root: HTMLElement, wiring: Wiring): void {
  const { commit } = wiring;
  wireTypedNumbers(root, wiring);
  for (const select of root.querySelectorAll<HTMLSelectElement>('[data-rank]')) {
    select.addEventListener('change', () => {
      commit((build) => setRank(build, select.dataset.rank!, select.value), select);
    });
  }
  // A step button is found when it is pressed, so rows drawn later need no wiring. The build, not the
  // page, judges the step: a button that cannot act (aria-disabled) still asks, and the refusal says why.
  root.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-rating-step]');
    const stepper = button?.closest<HTMLElement>('[data-build-trait]');
    if (!button || !stepper) return;
    const trait = stepper.dataset.buildTrait as BuildTraitRef;
    const mode = stepper.dataset.mode as DotSource;
    const step = Number(button.dataset.ratingStep);
    const result = commit((build) => setRating(build, trait, rating(build, trait) + step, mode), button);
    // A refusal is said by the row's message slot; only an applied press says the new value.
    if (result === 'applied') announceValue(stepper);
  });
}

/** Readouts that show something other than the bare number. */
const READOUT_FORMATS: Partial<Record<keyof BuildReport['settings'], (value: number) => string>> = {
  effectiveGeneration: ordinal,
};

export function renderControls(root: HTMLElement, report: BuildReport): void {
  renderTypedNumbers(root, report);
  for (const readout of root.querySelectorAll<HTMLElement>('[data-readout]')) {
    const key = readout.dataset.readout as keyof BuildReport['settings'];
    const format = READOUT_FORMATS[key] ?? String;
    showReadout(readout, format(report.settings[key]));
  }
  for (const select of root.querySelectorAll<HTMLSelectElement>('[data-rank]')) {
    const rank = report.ranks[select.dataset.rank!];
    if (select.value !== rank) select.value = rank;
  }
  for (const status of root.querySelectorAll<HTMLElement>('[data-allotment-status]')) {
    const allotment = report.allotments[status.dataset.allotmentStatus!];
    status.toggleAttribute('data-overspent', allotment.overspent);
    showReadout(status.querySelector<HTMLElement>('[data-readout-text]')!, allotment.status);
  }
  for (const stepper of root.querySelectorAll<HTMLElement>('[data-build-trait]')) {
    const trait = report.traits[stepper.dataset.buildTrait!];
    if (trait) renderStepper(stepper, trait, report.settings, report.concept.clan);
  }
}
