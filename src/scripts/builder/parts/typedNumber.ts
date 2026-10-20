// Typed numbers: the settings and the starting Blood Pool. A value is judged when the entry is finished
// (leaving the field or Enter), never per keystroke, and a refused entry stays as typed.

import type { V20Build } from '../../../domain/v20/creation/build';
import type { BuildReport } from '../../../domain/v20/creation/progress';
import type { UpdateResult } from '../../../domain/v20/creation/result';
import { setBaseGeneration, setBloodPool, setExtraFreebies } from '../../../domain/v20/creation/updates';
import type { Wiring } from '../wiring';

/** The fields whose entry is judged when it is finished: the settings and the starting Blood Pool. */
type EntryField = 'baseGeneration' | 'extraFreebies' | 'bloodPool';

const ENTRY_UPDATES: Record<EntryField, (build: V20Build, text: string) => UpdateResult> = {
  baseGeneration: (build, text) => setBaseGeneration(build, Number(text)),
  extraFreebies: setExtraFreebies,
  bloodPool: setBloodPool,
};

/** What an entry's field shows for the build as it is; an unrecorded Blood Pool is an empty field. */
const ENTRY_TEXT: Record<EntryField, (report: BuildReport) => string> = {
  baseGeneration: (report) => String(report.settings.baseGeneration),
  extraFreebies: (report) => String(report.settings.extraFreebies),
  bloodPool: (report) => (report.bloodPool === null ? '' : String(report.bloodPool)),
};

type EntryControl = HTMLInputElement | HTMLSelectElement;

export function wireTypedNumbers(root: HTMLElement, { commit }: Wiring): void {
  for (const control of root.querySelectorAll<EntryControl>('[data-entry]')) {
    control.addEventListener('change', () => {
      const update = ENTRY_UPDATES[control.dataset.entry as EntryField];
      commit((build) => update(build, control.value), control);
    });
  }
}

export function renderTypedNumbers(root: HTMLElement, report: BuildReport): void {
  for (const control of root.querySelectorAll<EntryControl>('[data-entry]')) {
    // A refused entry stays as typed until it is corrected or another change applies.
    if (control.getAttribute('aria-invalid') === 'true') continue;
    const value = ENTRY_TEXT[control.dataset.entry as EntryField](report);
    if (control.value !== value) control.value = value;
  }
}
