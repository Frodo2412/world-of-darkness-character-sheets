// The Advantages screen. Disciplines are the clan's rows (a Caitiff adds its own); Backgrounds are chosen with
// toggle chips, each chosen one gets a row, and a search narrows the chips; Virtues are three rows. Every
// number and every limit comes from `advantagesView`; this module draws it and forwards presses.
//
// A chip chosen at 0 dots is a choice of this screen only: the build records dots, not a Background held at 0,
// so such a chip is gone after a reload. The chips, the rows, the search field and the roving tab stops are
// updated in place and never rebuilt, so a focused control keeps its focus when it becomes unavailable.

import '../../../styles/builder/advantages.css';
import '../../../styles/builder/ranked.css';
import {
  advantagesView,
  pressBackground,
  reconcilePicked,
  type AdvantagesView,
  type BackgroundRow,
  type BackgroundsView,
  type DisciplineRow,
  type DisciplinesView,
  type VirtuesView,
} from '../../../domain/v20/creation/advantageViews';
import { report, type BuildReport } from '../../../domain/v20/creation/progress';
import { addDiscipline, removeDiscipline } from '../../../domain/v20/creation/updates';
import type { V20Build } from '../../../domain/v20/creation/build';
import type { BackgroundName } from '../../../domain/v20/creation/rules';
import { traitLabelId } from '../labelId';
import { clearNotices, showReadout, showRefusal } from '../messages';
import { drawCallout, drawPool, part, statusAfter, type Press } from '../parts/pool';
import { disciplineRow, rowsByKey, syncRows, wireAddField } from '../parts/ranked';
import { createStepperHost, renderStepper, stepperFor } from '../parts/ratingStepper';
import { findSearch, wireSearchField } from '../parts/search';
import type { Wiring } from '../wiring';
import type { ScreenModule } from './index';

const BACKGROUNDS_NOTICE = 'advantages-backgrounds-notice';

/** What the screen remembers apart from the build. */
const state = {
  /** The Backgrounds chosen with a chip. Anything the build holds a dot on joins it, so a row lowered to 0 stays. */
  picked: new Set<BackgroundName>(),
  /** The search as typed. */
  query: '',
  /** The last press on a plus or minus, from the click until the draw it causes. */
  press: null as Press | null,
  /** What each card's status would say, to tell a press that changed its pool from one that did not. */
  said: new Map<string, string>(),
  /** Says the result count once the player has paused; set when the screen is wired. */
  sayResults: (_text: string): void => {},
};

const cardOf = (root: ParentNode, name: string): HTMLElement => root.querySelector<HTMLElement>(`[data-advantage-card="${name}"]`)!;
const chipsOf = (root: ParentNode): HTMLButtonElement[] => [...root.querySelectorAll<HTMLButtonElement>('[data-bg-chip]')];
const chipFor = (root: ParentNode, name: string): HTMLButtonElement | undefined =>
  chipsOf(root).find((chip) => chip.dataset.bgChip === name);

/** Draws a card's pool; only the card a press changed says it aloud. */
function drawCardPool(card: HTMLElement, name: string, pool: DisciplinesView['pool']): void {
  drawPool(card, pool, statusAfter(state.press, name, pool.announcement, part(card, 'pool-status').textContent ?? ''));
  state.said.set(name, pool.announcement);
}

/** Shows or hides `element` with its text, writing only a changed text. */
function drawLine(element: HTMLElement, text: string | null): void {
  showReadout(element, text ?? '');
  element.hidden = text === null || text === '';
}

/** A Remove button for the row of `label`; its caller says what it removes. */
function removeButton(label: string, noticeId: string): HTMLButtonElement {
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = 'Remove';
  remove.setAttribute('aria-label', `Remove ${label}`);
  remove.setAttribute('aria-describedby', noticeId);
  return remove;
}

/** A Discipline's row; a Caitiff's own rows end in a Remove button, a clan's three do not. */
function disciplineRowElement(container: HTMLElement, row: DisciplineRow): HTMLElement {
  let remove: HTMLButtonElement | undefined;
  if (row.removable) {
    remove = removeButton(row.label, container.dataset.noticeId!);
    remove.dataset.removeDiscipline = row.label;
  }
  // Keyed by its removability too: a clan change can turn a clan's row into a Caitiff's of the same name.
  return disciplineRow(container, row.ref, row.label, `${row.ref}|${row.removable}`, remove);
}

function drawDisciplines(root: HTMLElement, view: DisciplinesView, current: BuildReport): void {
  const card = cardOf(root, 'disciplines');
  showReadout(part(card, 'adv-line'), view.line);
  drawCardPool(card, 'disciplines', view.pool);
  drawLine(part(card, 'needs-clan-text'), view.gate?.text ?? null);
  part(card, 'needs-clan').hidden = view.gate === null;
  part(card, 'discipline-add').hidden = !view.canAdd;
  // The rows are kept in the order of the view, and the ones that stay are never rebuilt.
  const container = part<HTMLElement>(card, 'discipline-rows');
  const existing = rowsByKey(container);
  syncRows(
    container,
    view.rows.map((row) => existing.get(`${row.ref}|${row.removable}`) ?? disciplineRowElement(container, row)),
  );
  for (const row of view.rows) {
    renderStepper(stepperFor(card, row.ref)!, current.traits[row.ref], current.settings, row);
  }
}

/** A Background's row: its name, the stepper and, while it holds no dot, a Remove button. */
function backgroundRowElement(row: BackgroundRow): HTMLElement {
  const labelId = traitLabelId('advantages', row.ref);
  const name = document.createElement('span');
  name.id = labelId;
  name.textContent = row.label;

  const stepper = createStepperHost({ trait: row.ref, mode: 'creation', labelId, noticeId: BACKGROUNDS_NOTICE });

  const remove = removeButton(row.label, BACKGROUNDS_NOTICE);
  remove.dataset.bgRemove = row.name;

  const actions = document.createElement('span');
  actions.className = 'advantages-row-actions';
  actions.append(stepper, remove);

  const element = document.createElement('div');
  element.className = 'rating-row';
  element.dataset.row = row.name;
  element.append(name, actions);
  return element;
}

function drawBackgrounds(root: HTMLElement, view: BackgroundsView, current: BuildReport): void {
  const card = cardOf(root, 'backgrounds');
  showReadout(part(card, 'adv-line'), view.line);
  drawCardPool(card, 'backgrounds', view.pool);
  showReadout(part(card, 'bg-heading'), view.heading);
  showReadout(part(card, 'bg-selected'), view.selected);
  state.sayResults(view.results);
  drawLine(part(card, 'bg-limit'), view.limit);
  drawLine(part(card, 'bg-empty'), view.empty);

  const entries = new Map(view.chips.map((chip) => [chip.name, chip]));
  for (const chip of chipsOf(card)) {
    const entry = entries.get(chip.dataset.bgChip as BackgroundName);
    chip.hidden = entry === undefined;
    chip.setAttribute('aria-pressed', String(entry?.selected ?? false));
    // Unavailable is aria-disabled, not disabled: the chip keeps its focus, and the reason describes it.
    if (entry?.unavailable) chip.setAttribute('aria-disabled', 'true');
    else chip.removeAttribute('aria-disabled');
    chip.setAttribute('aria-describedby', entry?.unavailable ? `${BACKGROUNDS_NOTICE} bg-limit` : BACKGROUNDS_NOTICE);
    part(chip, 'bg-chip-state').hidden = !entry?.selected;
  }

  const container = part<HTMLElement>(card, 'bg-rows');
  const existing = rowsByKey(container);
  syncRows(
    container,
    view.rows.map((row) => existing.get(row.name) ?? backgroundRowElement(row)),
  );
  for (const row of view.rows) {
    const element = container.querySelector<HTMLElement>(`:scope > [data-row="${row.name}"]`)!;
    renderStepper(element.querySelector<HTMLElement>('[data-build-trait]')!, current.traits[row.ref], current.settings, row);
    part<HTMLElement>(element, 'bg-remove').hidden = !row.removable;
  }
}

function drawVirtues(root: HTMLElement, view: VirtuesView, current: BuildReport): void {
  const card = cardOf(root, 'virtues');
  showReadout(part(card, 'adv-line'), view.line);
  showReadout(part(card, 'adv-derivation'), view.derivation);
  drawCardPool(card, 'virtues', view.pool);
  drawCallout(card, view.callout);
  for (const row of view.rows) {
    renderStepper(stepperFor(card, row.ref)!, current.traits[row.ref], current.settings, row);
  }
}

/** Puts focus on a Background's chip, or on the search when a search has hidden it. */
function focusChip(root: HTMLElement, name: string): void {
  const chip = chipFor(root, name);
  (chip && !chip.hidden ? chip : part<HTMLElement>(root, 'bg-search')).focus();
}

/** The field that adds a Discipline by name or from the catalogue, and the Remove button of each row a Caitiff added. */
function wireDisciplines(root: HTMLElement, { commit }: Wiring): void {
  const card = cardOf(root, 'disciplines');
  wireAddField(part(card, 'add-discipline'), (name, input) => commit((build) => addDiscipline(build, name, 'creation'), input));
  // Delegated to the rows' container, so rows drawn later need no wiring.
  part(card, 'discipline-rows').addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-remove-discipline]');
    if (!button) return;
    // The button goes with its row, so a refusal is shown on the rows' first control. Where focus goes when
    // the row leaves is decided once, by syncRows.
    commit((build) => removeDiscipline(build, button.dataset.removeDiscipline!), button);
  });
}

/** A chip press chooses or clears a Background on this screen, or says why it cannot. */
function wireChips(root: HTMLElement, { current }: Wiring): void {
  const chips = part(root, 'bg-chips');
  chips.addEventListener('click', (event) => {
    const chip = (event.target as Element).closest<HTMLElement>('[data-bg-chip]');
    if (!chip) return;
    const name = chip.dataset.bgChip as BackgroundName;
    const outcome = pressBackground(current(), state.picked, name);
    if (outcome.kind === 'refuse') {
      // Said again each time, as when the player tries the same blocked action twice.
      showRefusal(root, chip, outcome.reason, outcome.step, true);
      return;
    }
    if (outcome.kind === 'choose') state.picked.add(name);
    else state.picked.delete(name);
    clearNotices(root);
    drawScreen(current(), root);
  });
}

/** A Remove press takes an empty row off and clears its chip; focus goes to the chip. */
function wireRemove(root: HTMLElement, { current }: Wiring): void {
  part(root, 'bg-rows').addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLElement>('[data-bg-remove]');
    if (!button) return;
    const name = button.dataset.bgRemove as BackgroundName;
    if (pressBackground(current(), state.picked, name).kind !== 'clear') return;
    state.picked.delete(name);
    clearNotices(root);
    drawScreen(current(), root);
    focusChip(root, name);
  });
}

function wireSearch(root: HTMLElement, { current }: Wiring): void {
  const parts = findSearch(root, 'bg');
  state.query = parts.search.value;
  state.sayResults = wireSearchField(parts, (query) => {
    state.query = query;
    drawScreen(current(), root);
  });
}

/** Remembers which card a plus or minus was pressed in, before the page-wide handler asks the build. */
function wirePresses(root: HTMLElement): void {
  part(root, 'advantages-screen').addEventListener('click', (event) => {
    const card = (event.target as Element).closest('[data-rating-step]')?.closest<HTMLElement>('[data-advantage-card]');
    if (card) state.press = { group: card.dataset.advantageCard!, before: state.said.get(card.dataset.advantageCard!) ?? '' };
  });
}

/** Draws the whole screen. A chip, a Remove press and the search change only this screen, so they draw it alone. */
function drawScreen(build: V20Build, root: HTMLElement): void {
  // Whatever the build holds a dot on stays chosen, so a row lowered to 0 is still there to be raised again;
  // chips chosen at 0 dots give way when a dot bought elsewhere takes their place among the six.
  state.picked = reconcilePicked(build, state.picked);
  const view: AdvantagesView = advantagesView(build, state.picked, state.query);
  const current = report(build);
  showReadout(part(root, 'adv-intro'), view.intro);
  drawDisciplines(root, view.disciplines, current);
  drawBackgrounds(root, view.backgrounds, current);
  drawVirtues(root, view.virtues, current);
}

export default {
  id: 'advantages',
  wire(root, wiring) {
    wireDisciplines(root, wiring);
    wirePresses(root);
    wireChips(root, wiring);
    wireRemove(root, wiring);
    wireSearch(root, wiring);
  },
  render(build: V20Build, root) {
    drawScreen(build, root);
    state.press = null;
  },
} satisfies ScreenModule;
