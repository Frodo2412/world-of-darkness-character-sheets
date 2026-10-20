// The Discipline rows of a step: the clan's three, then any others, drawn from the report. A Caitiff on
// Advantages, and anyone buying with freebie points, can add one from the catalogue or by name.

import type { BuildTraitRef } from '../../../domain/v20/creation/build';
import type { BuildReport } from '../../../domain/v20/creation/progress';
import { addDiscipline, removeDiscipline, type DotSource } from '../../../domain/v20/creation/updates';
import type { Wiring } from '../wiring';

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
      rows.querySelector<HTMLElement>('dot-rating, button')?.focus();
    });
  }
}

const slug = (text: string): string => text.replace(/[^a-zA-Z0-9]/g, '-');

function disciplineRow(container: HTMLElement, ref: BuildTraitRef, label: string, removable: boolean): HTMLElement {
  const { mode, stepId, noticeId } = container.dataset;
  const labelId = `${stepId}-${slug(ref)}-label`;
  const name = document.createElement('span');
  name.id = labelId;
  name.textContent = label;

  const rating = document.createElement('dot-rating');
  rating.dataset.buildTrait = ref;
  rating.dataset.mode = mode;
  rating.setAttribute('aria-labelledby', labelId);
  rating.setAttribute('aria-describedby', noticeId!);
  rating.setAttribute('max', '5');
  rating.setAttribute('value', '0');

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
    const same = rows.length === existing.size && rows.every((row, index) => container.children[index] === row);
    if (!same) container.replaceChildren(...rows);
  }
}
