// Controls are found by data attributes, so a step adds fields in its markup
// without new wiring here. The page never judges a value itself: it forwards
// what the player entered and draws what `report` says.

import type { V20Build } from '../../domain/v20/creation/build';
import type { BuildReport } from '../../domain/v20/creation/progress';
import type { UpdateResult } from '../../domain/v20/creation/result';
import { setBaseGeneration, setExtraFreebies } from '../../domain/v20/creation/updates';
import { showReadout } from './messages';

export type Update = (build: V20Build) => UpdateResult;
/** Applies an update made through `control`, which is where a refusal is reported. */
export type Commit = (update: Update, control: HTMLElement) => void;

type Setting = 'baseGeneration' | 'extraFreebies';
type Readout = keyof BuildReport['settings'];

const SETTING_UPDATES: Record<Setting, (build: V20Build, entry: string) => UpdateResult> = {
  baseGeneration: (build, entry) => setBaseGeneration(build, Number(entry)),
  extraFreebies: setExtraFreebies,
};

type SettingControl = HTMLInputElement | HTMLSelectElement;

export function wireControls(root: HTMLElement, commit: Commit): void {
  // Typed numbers are judged on `change` (leaving the field or Enter), never per keystroke.
  for (const control of root.querySelectorAll<SettingControl>('[data-setting]')) {
    control.addEventListener('change', () => {
      const update = SETTING_UPDATES[control.dataset.setting as Setting];
      commit((build) => update(build, control.value), control);
    });
  }
}

export function renderControls(root: HTMLElement, report: BuildReport): void {
  for (const control of root.querySelectorAll<SettingControl>('[data-setting]')) {
    // A refused entry stays as typed until it is corrected or another change applies.
    if (control.getAttribute('aria-invalid') === 'true') continue;
    const value = String(report.settings[control.dataset.setting as Setting]);
    if (control.value !== value) control.value = value;
  }
  for (const readout of root.querySelectorAll<HTMLElement>('[data-readout]')) {
    showReadout(readout, String(report.settings[readout.dataset.readout as Readout]));
  }
}
