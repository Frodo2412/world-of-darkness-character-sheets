// The ranked rows of the creation screens. Two things live here:
//  - the Attributes and Abilities screens (`createRankedScreen`): each group's pool, callout and rows, drawn from
//    `rankedView`, with the one status region per group that says what a press changed;
//  - the Discipline rows of a step: the clan's three, then any others, drawn from the report. A Caitiff on
//    Advantages, and anyone buying with freebie points, can add one from the catalogue or by name.

import type { BuildTraitRef, V20Build } from '../../../domain/v20/creation/build';
import { rankedView, type RankedGroupView, type RankedKey, type Segment } from '../../../domain/v20/creation/poolViews';
import { report, type BuildReport } from '../../../domain/v20/creation/progress';
import { addDiscipline, removeDiscipline, type DotSource } from '../../../domain/v20/creation/updates';
import { traitLabelId } from '../labelId';
import { showReadout } from '../messages';
import type { ScreenModule } from '../screens';
import type { Wiring } from '../wiring';
import { createStepperHost, renderStepper } from './ratingStepper';

/** A press on a row's plus or minus, remembered from the click until the draw it causes. */
export interface Press {
  group: string;
  /** What the group's status would have said just before the press. */
  before: string;
}

/**
 * What a group's status region holds after a draw. Only the group a press changed says its pool: the same
 * words, once. A press the build refused changes nothing, so what the region held stays. Any other change (a
 * re-rank, a change elsewhere) leaves the region empty rather than stale, and an emptied region is not read out.
 */
export function statusAfter(press: Press | null, group: string, announcement: string, shown: string): string {
  if (press?.group !== group) return '';
  return announcement === press.before ? shown : announcement;
}

const part = <T extends HTMLElement>(scope: ParentNode, name: string): T => scope.querySelector<T>(`[data-${name}]`)!;

/** Keeps the meter's segments in step with the pool, adding or dropping only the ones that differ. */
function drawMeter(meter: HTMLElement, segments: Segment[]): void {
  while (meter.childElementCount < segments.length) {
    const segment = document.createElement('span');
    segment.className = 'builder-meter-segment';
    meter.append(segment);
  }
  while (meter.childElementCount > segments.length) meter.lastElementChild!.remove();
  segments.forEach((state, index) => {
    const segment = meter.children[index];
    if (segment.getAttribute('data-segment') !== state) segment.setAttribute('data-segment', state);
    segment.toggleAttribute('data-filled', state === 'placed');
  });
}

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

function drawCallout(group: HTMLElement, callout: RankedGroupView['callout']): void {
  const box = part(group, 'callout');
  box.hidden = callout === null;
  if (callout === null) return;
  showReadout(part(box, 'callout-heading'), callout.heading);
  showReadout(part(box, 'callout-summary'), callout.summary);
  const traits = part(box, 'callout-traits');
  showReadout(traits, callout.traitsText);
  traits.hidden = callout.traitsText === '';
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
    part(group, 'pool').dataset.state = pool.state;
    drawMeter(part(group, 'pool-meter'), pool.segments);
    showReadout(part(group, 'pool-remaining'), pool.remainingText);
    showReadout(part(group, 'pool-spent'), pool.spentText);
    showReadout(part(group, 'pool-status'), statusAfter(press, view.key, pool.announcement, part(group, 'pool-status').textContent ?? ''));
    said.set(view.key, pool.announcement);

    drawCallout(group, view.callout);
    for (const row of view.rows) {
      const stepper = group.querySelector<HTMLElement>(`[data-build-trait="${row.ref}"]`)!;
      renderStepper(stepper, current.traits[row.ref], current.settings, current.concept.clan, row);
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
      priority.hidden = view.priority.text === '';
      drawLines(part(screen, 'ranked-summary'), view.summary);
      for (const group of view.groups) {
        drawGroup(screen.querySelector<HTMLElement>(`[data-ranked-group="${group.key}"]`)!, group, current);
      }
      press = null;
    },
  };
}

// The Discipline rows of a step

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
      // The button goes with its row, so a refusal is shown on the rows' first control. Where focus goes
      // when the row leaves is decided once, by syncRows.
      commit((build) => removeDiscipline(build, button.dataset.removeDiscipline!), button);
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
function syncRows(container: HTMLElement, rows: HTMLElement[]): void {
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
