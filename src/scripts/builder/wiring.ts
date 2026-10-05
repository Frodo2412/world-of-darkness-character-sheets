// Controls are found by data attributes, so a step adds fields in its markup
// without new wiring here. The page never judges a value itself: it forwards
// what the player entered and draws what `report` says.

import type { ConceptField, V20Build } from '../../domain/v20/creation/build';
import type { BuildReport } from '../../domain/v20/creation/progress';
import type { UpdateResult } from '../../domain/v20/creation/result';
import {
  setBaseGeneration,
  setClan,
  setConceptText,
  setExtraFreebies,
} from '../../domain/v20/creation/updates';
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
  // Free text is kept as it is typed, as on the sheet.
  for (const input of root.querySelectorAll<HTMLInputElement>('[data-concept]')) {
    input.addEventListener('input', () => {
      const field = input.dataset.concept as ConceptField;
      commit((build) => setConceptText(build, field, input.value), input);
    });
  }
  for (const select of root.querySelectorAll<HTMLSelectElement>('[data-clan]')) {
    select.addEventListener('change', () => {
      commit((build) => setClan(build, select.value), select);
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
  // Leave a matching input alone so typing does not move the caret.
  for (const input of root.querySelectorAll<HTMLInputElement>('[data-concept]')) {
    const text = report.concept.fields[input.dataset.concept as ConceptField];
    if (input.value !== text) input.value = text;
  }
  for (const select of root.querySelectorAll<HTMLSelectElement>('[data-clan]')) {
    if (select.value !== report.concept.clan) select.value = report.concept.clan;
    // Once a clan is chosen it can be switched but not cleared.
    select.options[0].disabled = report.concept.clan !== '';
  }
  for (const readout of root.querySelectorAll<HTMLElement>('[data-readout]')) {
    showReadout(readout, String(report.settings[readout.dataset.readout as Readout]));
  }
}
