// Controls are found by data attributes, so a step adds fields in its markup
// without new wiring here. The page never judges a value itself: it forwards
// what the player entered and draws what `report` says.

import type { RatingChange, RatingControl } from '../../components/controls/rating-control';
import type { BuildTraitRef, ConceptField, V20Build } from '../../domain/v20/creation/build';
import { BUILD_STEPS, type BuildReport } from '../../domain/v20/creation/progress';
import type { UpdateResult } from '../../domain/v20/creation/result';
import { ordinal } from '../../domain/v20/creation/limits';
import {
  addDiscipline,
  clanChangeEffects,
  removeDiscipline,
  setBaseGeneration,
  setBloodPool,
  setClan,
  setConceptText,
  setExtraFreebies,
  setRank,
  setRating,
  type DotSource,
} from '../../domain/v20/creation/updates';
import { showReadout } from './messages';

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
}

type Setting = 'baseGeneration' | 'extraFreebies';

const SETTING_UPDATES: Record<Setting, (build: V20Build, entry: string) => UpdateResult> = {
  baseGeneration: (build, entry) => setBaseGeneration(build, Number(entry)),
  extraFreebies: setExtraFreebies,
};

type SettingControl = HTMLInputElement | HTMLSelectElement;

function wireClanChoice(root: HTMLElement, { commit, current }: Wiring): void {
  const select = root.querySelector<HTMLSelectElement>('[data-clan]');
  const panel = root.querySelector<HTMLElement>('[data-clan-change]');
  if (!select || !panel) return;
  const text = panel.querySelector<HTMLElement>('[data-clan-change-text]')!;
  const switchButton = panel.querySelector<HTMLButtonElement>('[data-clan-switch]')!;
  const keepButton = panel.querySelector<HTMLButtonElement>('[data-clan-keep]')!;

  function hidePanel(): void {
    panel!.hidden = true;
    text.replaceChildren();
  }

  // Choosing a clan that removes nothing applies at once. One that would remove
  // dots only asks, beside the select, so browsing the list never loses anything.
  select.addEventListener('change', () => {
    const build = current();
    const clan = select.value;
    if (clan === build.clan) {
      hidePanel();
      return;
    }
    const effects = clanChangeEffects(build, clan);
    if (effects.length === 0) {
      hidePanel();
      commit((latest) => setClan(latest, clan), select);
      return;
    }
    const items = effects.map((effect) => {
      const item = document.createElement('li');
      item.textContent = effect;
      return item;
    });
    const list = document.createElement('ul');
    list.append(...items);
    const question = document.createElement('p');
    question.textContent = `Switching to ${clan}:`;
    text.replaceChildren(question, list);
    switchButton.textContent = `Switch to ${clan}`;
    keepButton.textContent = `Keep ${build.clan}`;
    panel.dataset.pendingClan = clan;
    panel.hidden = false;
  });

  switchButton.addEventListener('click', () => {
    const clan = panel.dataset.pendingClan!;
    hidePanel();
    commit((latest) => setClan(latest, clan), select);
    select.focus();
  });

  keepButton.addEventListener('click', () => {
    hidePanel();
    select.value = current().clan;
    select.focus();
  });
}

export function wireControls(root: HTMLElement, wiring: Wiring): void {
  const { commit } = wiring;
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
  wireClanChoice(root, wiring);
  for (const select of root.querySelectorAll<HTMLSelectElement>('[data-rank]')) {
    select.addEventListener('change', () => {
      commit((build) => setRank(build, select.dataset.rank!, select.value), select);
    });
  }
  wireDisciplines(root, wiring);
  for (const input of root.querySelectorAll<HTMLInputElement>('[data-blood-pool]')) {
    input.addEventListener('change', () => {
      commit((build) => setBloodPool(build, input.value), input);
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

function wireDisciplines(root: HTMLElement, { commit }: Wiring): void {
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-add-discipline]')) {
    const input = button.parentElement!.querySelector<HTMLInputElement>('input')!;
    const mode = button.dataset.mode as DotSource;
    const add = () => {
      const name = input.value;
      if (commit((build) => addDiscipline(build, name, mode), input) === 'applied') input.value = '';
    };
    button.addEventListener('click', add);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') add();
    });
  }
  root.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-remove-discipline]');
    if (!button) return;
    const name = button.dataset.removeDiscipline!;
    const rows = button.closest<HTMLElement>('[data-discipline-rows]')!;
    // The button goes with its row, so a refusal is shown on the rows' first control.
    commit((build) => removeDiscipline(build, name), button);
    rows.querySelector<HTMLElement>('dot-rating, button')?.focus();
  });
}

const stepTitle = (step: string): string => BUILD_STEPS.find((entry) => entry.step === step)?.title ?? step;

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

/** Keeps each container's rows in report order, reusing rows that are still there. */
function renderDisciplines(root: HTMLElement, report: BuildReport): void {
  const { disciplines } = report;
  for (const container of root.querySelectorAll<HTMLElement>('[data-discipline-rows]')) {
    const creation = container.dataset.mode === 'creation';
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
  for (const hint of root.querySelectorAll<HTMLElement>('[data-needs-clan]')) hint.hidden = !disciplines.needsClan;
  for (const add of root.querySelectorAll<HTMLElement>('[data-discipline-add][data-mode="creation"]')) {
    add.hidden = !disciplines.choosesOwn;
  }
}

function renderOutstanding(root: HTMLElement, report: BuildReport): void {
  const { outstanding } = report;
  for (const intro of root.querySelectorAll<HTMLElement>('[data-outstanding-intro]')) {
    showReadout(intro, outstanding.length === 0 ? 'Nothing outstanding.' : 'Before finishing:');
  }
  for (const list of root.querySelectorAll<HTMLElement>('[data-outstanding-list]')) {
    const key = JSON.stringify(outstanding);
    if (list.dataset.items === key) continue;
    list.dataset.items = key;
    list.replaceChildren(
      ...outstanding.map((item) => {
        const link = document.createElement('a');
        link.href = `#${item.step}`;
        link.dataset.stepGo = item.step;
        link.textContent = item.message;
        const where = document.createElement('span');
        where.className = 'outstanding-step';
        where.dataset.outstandingStep = item.step;
        where.textContent = ` (${stepTitle(item.step)})`;
        const entry = document.createElement('li');
        entry.append(link, where);
        return entry;
      }),
    );
    list.hidden = outstanding.length === 0;
  }
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-finish]')) {
    button.setAttribute('aria-disabled', String(outstanding.length > 0));
  }
}

function renderFreebies(root: HTMLElement, report: BuildReport): void {
  for (const status of root.querySelectorAll<HTMLElement>('[data-freebie-remaining]')) {
    showReadout(status, report.freebies.status);
  }
  for (const count of root.querySelectorAll<HTMLElement>('[data-freebie-dots]')) {
    const { dots } = report.freebies.sections[count.dataset.freebieDots as keyof BuildReport['freebies']['sections']];
    showReadout(count, `${dots} ${dots === 1 ? 'dot' : 'dots'} bought`);
  }
  for (const input of root.querySelectorAll<HTMLInputElement>('[data-blood-pool]')) {
    if (input.getAttribute('aria-invalid') !== 'true' && input.value !== String(report.bloodPool)) {
      input.value = String(report.bloodPool);
    }
  }
  for (const hint of root.querySelectorAll<HTMLElement>('[data-blood-pool-hint]')) {
    showReadout(hint, `0 to ${report.settings.bloodPoolMax} — set with your Storyteller`);
  }
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
  for (const control of root.querySelectorAll<SettingControl>('[data-setting]')) {
    // A refused entry stays as typed until it is corrected or another change applies.
    if (control.getAttribute('aria-invalid') === 'true') continue;
    const value = String(report.settings[control.dataset.setting as Setting]);
    if (control.value !== value) control.value = value;
  }
  for (const readout of root.querySelectorAll<HTMLElement>('[data-readout]')) {
    const key = readout.dataset.readout as keyof BuildReport['settings'];
    const format = READOUT_FORMATS[key] ?? String;
    showReadout(readout, format(report.settings[key]));
  }
  // Leave a matching input alone so typing does not move the caret.
  for (const input of root.querySelectorAll<HTMLInputElement>('[data-concept]')) {
    const text = report.concept.fields[input.dataset.concept as ConceptField];
    if (input.value !== text) input.value = text;
  }
  for (const select of root.querySelectorAll<HTMLSelectElement>('[data-clan]')) {
    const panel = root.querySelector<HTMLElement>('[data-clan-change]');
    if (panel?.hidden !== false && select.value !== report.concept.clan) select.value = report.concept.clan;
    // Once a clan is chosen it can be switched but not cleared.
    select.options[0].disabled = report.concept.clan !== '';
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
  renderDisciplines(root, report);
  renderFreebies(root, report);
  renderOutstanding(root, report);
  for (const control of root.querySelectorAll<RatingControl>('[data-build-trait]')) {
    renderRating(control, report);
  }
}
