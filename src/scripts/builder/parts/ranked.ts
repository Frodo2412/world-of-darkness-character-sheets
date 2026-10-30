// The ranked rows of the creation screens. Two things live here:
//  - the Attributes and Abilities screens (`createRankedScreen`): each group's pool, callout and rows, drawn from
//    `rankedView`, with the one status region per group that says what a press changed;
//  - the Discipline rows of Finishing touches (bought with freebie points), drawn from the report. The rows of the
//    Advantages screen are its own (screens/advantages.ts); the row shell and the row sync are shared.

import type { BuildTraitRef, V20Build } from '../../../domain/v20/creation/build';
import { rankedView, type RankedGroupView, type RankedKey } from '../../../domain/v20/creation/poolViews';
import { report, type BuildReport } from '../../../domain/v20/creation/progress';
import { addDiscipline, type DotSource } from '../../../domain/v20/creation/updates';
import type { UpdateResult } from '../../../domain/v20/creation/result';
import { traitLabelId } from '../labelId';
import { showReadout } from '../messages';
import type { ScreenModule } from '../screens';
import type { Wiring } from '../wiring';
import { drawCallout, drawPool, part, statusAfter, type Press } from './pool';
import { createStepperHost, renderStepper, stepperFor } from './ratingStepper';

/** Keeps the summary's lines as given, rewriting the list only when its words change. */
function drawLines(list: HTMLElement, lines: string[]): void {
  if ([...list.children].map((item) => item.textContent).join('\n') === lines.join('\n')) return;
  list.replaceChildren(
    ...lines.map((line) => {
      const item = document.createElement('li');
      item.textContent = line;
      return item;
    }),
  );
}

/**
 * The screen module for one ranked allotment. Its state is its own: the last press and what each group last
 * said. It updates in place and never rebuilds a row, so a focused plus keeps its focus when it becomes unavailable.
 */
export function createRankedScreen(key: RankedKey): Pick<ScreenModule, 'wire' | 'render'> {
  let press: Press | null = null;
  const said = new Map<string, string>();
  const screenOf = (root: HTMLElement): HTMLElement => root.querySelector<HTMLElement>(`[data-ranked-screen="${key}"]`)!;

  function drawGroup(group: HTMLElement, view: RankedGroupView, current: BuildReport): void {
    const tag = part(group, 'ranked-tag');
    showReadout(tag, view.tag ?? '');
    tag.hidden = view.tag === null;

    const { pool } = view;
    drawPool(group, pool, statusAfter(press, view.key, pool.announcement, part(group, 'pool-status').textContent ?? ''));
    said.set(view.key, pool.announcement);

    drawCallout(group, view.callout);
    for (const row of view.rows) {
      const stepper = stepperFor(group, row.ref)!;
      renderStepper(stepper, current.traits[row.ref], current.settings, row);
    }
  }

  return {
    wire(root) {
      // Before the page-wide handler asks the build: that draw needs to know which group the press was in.
      screenOf(root).addEventListener('click', (event) => {
        const group = (event.target as Element).closest('[data-rating-step]')?.closest<HTMLElement>('[data-ranked-group]');
        if (group) press = { group: group.dataset.rankedGroup!, before: said.get(group.dataset.rankedGroup!) ?? '' };
      });
    },
    render(build: V20Build, root: HTMLElement) {
      const screen = screenOf(root);
      const view = rankedView(build, key);
      const current = report(build);
      showReadout(part(screen, 'ranked-intro'), view.intro);
      const priority = part(screen, 'ranked-priority');
      showReadout(priority, view.priority.text);
      drawLines(part(screen, 'ranked-summary'), view.summary);
      for (const group of view.groups) {
        drawGroup(screen.querySelector<HTMLElement>(`[data-ranked-group="${group.key}"]`)!, group, current);
      }
      press = null;
    },
  };
}

// The Discipline rows

/**
 * Wires a Discipline's add field: its button, and Enter in the field, apply `add` to the name typed. The field
 * empties once the name is added; a refusal leaves it as typed.
 */
export function wireAddField(button: HTMLButtonElement, add: (name: string, input: HTMLInputElement) => UpdateResult['status']): void {
  const input = button.parentElement!.querySelector<HTMLInputElement>('input')!;
  const submit = () => {
    if (add(input.value, input) === 'applied') input.value = '';
  };
  button.addEventListener('click', submit);
  input.addEventListener('keydown', (event) => {
    // The Enter that accepts an input-method candidate (as in Japanese or Chinese) is not a submission.
    if (event.key === 'Enter' && !event.isComposing) submit();
  });
}

/** Wires the field that buys a Discipline by name on Finishing touches. */
export function wireFreebieDisciplines(root: HTMLElement, { commit }: Wiring): void {
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-add-discipline][data-mode="freebie"]')) {
    wireAddField(button, (name, input) => commit((build) => addDiscipline(build, name, 'freebie'), input));
  }
}

/** A Discipline's row: its name, its stepper and `extra`, the control that ends it. Kept as long as its `key` stays. */
export function disciplineRow(container: HTMLElement, ref: BuildTraitRef, label: string, key: string, extra?: HTMLElement): HTMLElement {
  const { mode, stepId, noticeId } = container.dataset;
  const labelId = traitLabelId(stepId!, ref);
  const name = document.createElement('span');
  name.id = labelId;
  name.textContent = label;

  const rating = createStepperHost({ trait: ref, mode: mode as DotSource, labelId, noticeId: noticeId! });

  const actions = document.createElement('span');
  actions.className = 'advantages-row-actions';
  actions.append(rating);
  if (extra) actions.append(extra);

  const row = document.createElement('div');
  row.className = 'rating-row';
  row.dataset.row = key;
  row.append(name, actions);
  return row;
}

/** The rows of `container` by their key. */
export const rowsByKey = (container: HTMLElement): Map<string, HTMLElement> =>
  new Map([...container.querySelectorAll<HTMLElement>(':scope > [data-row]')].map((row) => [row.dataset.row!, row]));

/**
 * Where focus goes when the row that held it leaves: the row that now sits in its place (else the one before),
 * on its first button; with no row left, the field that adds one, so focus never falls to the page.
 */
function refocusNear(container: HTMLElement, index: number): void {
  const rows = container.querySelectorAll<HTMLElement>(':scope > [data-row]');
  const addField = container.parentElement?.querySelector<HTMLElement>(
    `[data-discipline-add][data-mode="${container.dataset.mode}"] input`,
  );
  (rows[Math.min(index, rows.length - 1)]?.querySelector<HTMLElement>('button') ?? addField)?.focus();
}

/**
 * Makes `container` hold exactly `rows`, in order, touching only the rows that were added, removed or moved: a
 * row that stays is never re-inserted, so a focused rating keeps its focus. A moved row that had focus gets it
 * back; a removed one (a Remove press, or a bought Discipline lowered to 0) hands it on with `refocusNear`.
 */
export function syncRows(container: HTMLElement, rows: HTMLElement[]): void {
  const focused = document.activeElement;
  const keep = new Set<Element>(rows);
  const before = [...container.children];
  const focusedAt = before.findIndex((child) => child.contains(focused));
  // A static list: removing from `container.children` while walking it would skip rows.
  for (const child of before) if (!keep.has(child)) child.remove();
  rows.forEach((row, index) => {
    if (container.children[index] !== row) container.insertBefore(row, container.children[index] ?? null);
  });
  if (focusedAt >= 0 && !keep.has(before[focusedAt])) refocusNear(container, focusedAt);
  else if (focused instanceof HTMLElement && container.contains(focused) && document.activeElement !== focused) focused.focus();
}

/** Keeps the bought Disciplines of Finishing touches in report order, reusing rows that are still there. */
export function renderFreebieDisciplineRows(root: HTMLElement, report: BuildReport): void {
  for (const container of root.querySelectorAll<HTMLElement>('[data-discipline-rows][data-mode="freebie"]')) {
    const existing = rowsByKey(container);
    syncRows(
      container,
      report.disciplines.freebieRows.map((ref) => existing.get(ref) ?? disciplineRow(container, ref, report.traits[ref].label, ref)),
    );
  }
}
