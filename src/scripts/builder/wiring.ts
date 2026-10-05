// Controls are found by data attributes, so a step adds fields in its markup
// without new wiring here. The page never judges a value itself: it forwards
// what the player entered and draws what `report` says.

import type { RatingChange, RatingControl } from '../../components/controls/rating-control';
import type { BuildTraitRef, ConceptField, V20Build } from '../../domain/v20/creation/build';
import type { BuildReport } from '../../domain/v20/creation/progress';
import type { UpdateResult } from '../../domain/v20/creation/result';
import {
  clanChangeEffects,
  setBaseGeneration,
  setClan,
  setConceptText,
  setExtraFreebies,
  setRank,
  setRating,
  type DotSource,
} from '../../domain/v20/creation/updates';
import { showReadout } from './messages';

export type Update = (build: V20Build) => UpdateResult;
/** Applies an update made through `control`, which is where a refusal or notice is shown. */
export type Commit = (update: Update, control: HTMLElement) => void;

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

function renderRating(control: RatingControl, report: BuildReport): void {
  const trait = report.traits[control.dataset.buildTrait!];
  if (!trait) return;
  const min = control.dataset.mode === 'freebie' ? trait.freebieMin : trait.creationMin;
  // A locked trait is drawn to the generation's scale so its fixed 0 is visible as empty dots.
  const max = trait.locked ? report.settings.maxTrait : trait.max;
  const attributes: Record<string, string> = {
    max: String(max),
    min: String(min),
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
    showReadout(readout, String(report.settings[readout.dataset.readout as keyof BuildReport['settings']]));
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
  for (const control of root.querySelectorAll<RatingControl>('[data-build-trait]')) {
    renderRating(control, report);
  }
}
