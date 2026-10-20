// Controls are found by data attributes, so a step adds fields in its markup
// without new wiring here. The page never judges a value itself: it forwards
// what the player entered and draws what `report` says.

import type { RatingChange, RatingControl } from '../../components/controls/rating-control';
import type { BuildTraitRef, V20Build } from '../../domain/v20/creation/build';
import type { BuildReport } from '../../domain/v20/creation/progress';
import type { UpdateResult } from '../../domain/v20/creation/result';
import { ordinal } from '../../domain/v20/creation/limits';
import { setRank, setRating, type DotSource } from '../../domain/v20/creation/updates';
import type { BuildStore } from '../../storage/buildStore';
import type { CharacterStore } from '../../storage/characterStore';
import { showReadout } from './messages';
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
  // Rating rows are found when they change, so rows drawn later need no wiring.
  root.addEventListener('change', (event) => {
    const control = (event.target as Element).closest<RatingControl>('[data-build-trait]');
    if (!control || !(event instanceof CustomEvent)) return;
    const { value } = (event as CustomEvent<RatingChange>).detail;
    const trait = control.dataset.buildTrait as BuildTraitRef;
    const mode = control.dataset.mode as DotSource;
    commit((build) => setRating(build, trait, value, mode), control);
  });
}

/** Readouts that show something other than the bare number. */
const READOUT_FORMATS: Partial<Record<keyof BuildReport['settings'], (value: number) => string>> = {
  effectiveGeneration: ordinal,
};

function renderRating(control: RatingControl, report: BuildReport): void {
  const trait = report.traits[control.dataset.buildTrait!];
  if (!trait) return;
  // A locked trait is drawn to the generation's scale so its fixed 0 is visible as empty dots.
  const max = trait.locked ? report.settings.maxTrait : trait.max;
  const attributes: Record<string, string> = {
    max: String(max),
    min: String(trait.floor),
    valuetext: trait.valueText,
    freebie: String(trait.freebieDots),
  };
  for (const [name, value] of Object.entries(attributes)) {
    if (control.getAttribute(name) !== value) control.setAttribute(name, value);
  }
  control.toggleAttribute('locked', trait.locked);
  if (control.value !== trait.rating) control.value = trait.rating;
}

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
  for (const control of root.querySelectorAll<RatingControl>('[data-build-trait]')) {
    renderRating(control, report);
  }
}
