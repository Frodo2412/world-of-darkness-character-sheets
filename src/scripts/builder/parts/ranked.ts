// The Discipline rows of a step: the clan's three, then any others, drawn from the report. A Caitiff on
// Advantages, and anyone buying with freebie points, can add one from the catalogue or by name.

import type { BuildTraitRef } from '../../../domain/v20/creation/build';
import type { BuildReport } from '../../../domain/v20/creation/progress';
import { addDiscipline, removeDiscipline, type DotSource } from '../../../domain/v20/creation/updates';
import { traitLabelId } from '../labelId';
import type { Wiring } from '../wiring';
import { createStepperHost } from './ratingStepper';

/** Wires the add field and the Remove buttons of the Discipline rows made for `mode`. */
export function wireDisciplineRows(root: HTMLElement, { commit }: Wiring, mode: DotSource): void {
  for (const button of root.querySelectorAll<HTMLButtonElement>(`[data-add-discipline][data-mode="${mode}"]`)) {
    const input = button.parentElement!.querySelector<HTMLInputElement>('input')!;
    const add = () => {
      const name = input.value;
      if (commit((build) => addDiscipline(build, name, mode), input) === 'applied') input.value = '';
    };
    button.addEventListener('click', add);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') add();
    });
  }
  for (const rows of root.querySelectorAll<HTMLElement>(`[data-discipline-rows][data-mode="${mode}"]`)) {
    // Delegated to the rows' container, so rows drawn later need no wiring.
    rows.addEventListener('click', (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>('[data-remove-discipline]');
      if (!button) return;
      const name = button.dataset.removeDiscipline!;
      // The button goes with its row, so a refusal is shown on the rows' first control.
      commit((build) => removeDiscipline(build, name), button);
      // With no row left, the add field is the nearest control; focus would otherwise fall to the page.
      const addField = rows.parentElement?.querySelector<HTMLElement>(`[data-discipline-add][data-mode="${mode}"] input`);
      (rows.querySelector<HTMLElement>('button') ?? addField)?.focus();
    });
  }
}

function disciplineRow(container: HTMLElement, ref: BuildTraitRef, label: string, removable: boolean): HTMLElement {
  const { mode, stepId, noticeId } = container.dataset;
  const labelId = traitLabelId(stepId!, ref);
  const name = document.createElement('span');
  name.id = labelId;
  name.textContent = label;

  const rating = createStepperHost({ trait: ref, mode: mode as DotSource, labelId, noticeId: noticeId! });

  const actions = document.createElement('span');
  actions.className = 'discipline-row-actions';
  actions.append(rating);
  if (removable) {
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove ${label}`);
    remove.setAttribute('aria-describedby', noticeId!);
    remove.dataset.removeDiscipline = label;
    actions.append(remove);
  }

  const row = document.createElement('div');
  row.className = 'rating-row';
  row.dataset.row = `${ref}|${removable}`;
  row.append(name, actions);
  return row;
}

/**
 * Makes `container` hold exactly `rows`, in order, touching only the rows that were added, removed or moved: a
 * row that stays is never re-inserted, so a focused rating keeps its focus. A moved row that had focus gets it back.
 */
function syncRows(container: HTMLElement, rows: HTMLElement[]): void {
  const focused = document.activeElement;
  const keep = new Set<Element>(rows);
  // A static list: removing from `container.children` while walking it would skip rows.
  for (const child of container.querySelectorAll(':scope > *')) if (!keep.has(child)) child.remove();
  rows.forEach((row, index) => {
    if (container.children[index] !== row) container.insertBefore(row, container.children[index] ?? null);
  });
  if (focused instanceof HTMLElement && container.contains(focused) && document.activeElement !== focused) focused.focus();
}

/** Keeps each container's rows for `mode` in report order, reusing rows that are still there. */
export function renderDisciplineRows(root: HTMLElement, report: BuildReport, mode: DotSource): void {
  const { disciplines } = report;
  for (const container of root.querySelectorAll<HTMLElement>(`[data-discipline-rows][data-mode="${mode}"]`)) {
    const creation = mode === 'creation';
    const refs = creation ? disciplines.creationRows : disciplines.freebieRows;
    const removable = creation && disciplines.choosesOwn;
    const existing = new Map(
      [...container.querySelectorAll<HTMLElement>(':scope > [data-row]')].map((row) => [row.dataset.row!, row]),
    );
    const rows = refs.map(
      (ref) => existing.get(`${ref}|${removable}`) ?? disciplineRow(container, ref, report.traits[ref].label, removable),
    );
    syncRows(container, rows);
  }
}
