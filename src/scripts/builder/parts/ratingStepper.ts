// A rating row's minus/plus stepper: the dots, the number and the two buttons, drawn from the report.
// The page serves (or, for a Discipline, creates) an empty `.rating-stepper`; `renderStepper` fills it
// once and then only updates it, so a focused button is never replaced. A button that cannot act is
// `aria-disabled`, not `disabled`: it keeps its focus and says why in text, and pressing it still asks
// the build, which refuses with the reason. Each button is described by its own reason (the plus by
// "Maximum 5", the minus by "Minimum 1, free dot"), both reasons are shown on one line under the buttons, and a press
// that is applied says the trait's new value text once through the stepper's polite slot.

import type { BuildTraitRef } from '../../../domain/v20/creation/build';
import { freebieLimitsOf, type RowLimits } from '../../../domain/v20/creation/poolViews';
import type { TraitReport } from '../../../domain/v20/creation/progress';
import type { DotSource } from '../../../domain/v20/creation/updates';

/** What the stepper shows for a trait, decided apart from the DOM. */
export interface StepperView {
  /** How many dots are drawn: a locked trait is drawn to the generation's scale so its fixed 0 shows as empty dots. */
  dots: number;
  /** The lowest rating the minus reaches: what the row reports as `data-min`. */
  min: number;
  /** The highest rating the plus reaches: what the row reports as `data-max`. */
  max: number;
  canLower: boolean;
  canRaise: boolean;
  /** The visible reason the plus cannot act: "Maximum 5", "Fixed for Nosferatu". */
  limit: string | null;
  /** Why the minus cannot act, shown with the plus's reason and in the minus's description: "Minimum 1, free dot". */
  lowerReason: string | null;
  /** Whether `lowerReason` is drawn: not when the plus already shows the same words, which then describe both buttons. */
  lowerShown: boolean;
}

export function stepperView(trait: TraitReport, settings: { maxTrait: number }, row: RowLimits): StepperView {
  const shown = (limit: string | null, lowerReason: string | null) => lowerReason !== null && lowerReason !== limit;
  return {
    // A locked trait keeps the generation's scale; a rating above the row's top (freebie dots) still shows its dots.
    dots: trait.locked ? settings.maxTrait : Math.max(row.max, trait.rating),
    min: row.min,
    max: row.max,
    canLower: row.canLower,
    canRaise: row.canRaise,
    limit: row.limit,
    lowerReason: row.lowerLimit,
    lowerShown: shown(row.limit, row.lowerLimit),
  };
}

/** The attributes an empty stepper is served with; the Astro row writes the same ones. */
export interface StepperHost {
  trait: BuildTraitRef;
  mode: DotSource;
  /** The id of the row's visible name; the plus's reason is `<labelId>-limit`, the minus's `<labelId>-minimum`. */
  labelId: string;
  /** The message slot the row's refusals appear in. */
  noticeId: string;
}

export function createStepperHost({ trait, mode, labelId, noticeId }: StepperHost): HTMLElement {
  const host = document.createElement('div');
  host.className = 'rating-stepper';
  host.dataset.buildTrait = trait;
  host.dataset.mode = mode;
  host.dataset.labelId = labelId;
  host.dataset.noticeId = noticeId;
  return host;
}

/**
 * The stepper of `ref` in `scope`. Found by comparing the attribute, not by a selector built from it: a Caitiff's
 * written-in Discipline may be named with quotes or a backslash, which would make the selector throw.
 */
export const stepperFor = (scope: ParentNode, ref: string): HTMLElement | undefined =>
  [...scope.querySelectorAll<HTMLElement>('[data-build-trait]')].find((stepper) => stepper.dataset.buildTrait === ref);

function stepButton(step: -1 | 1, label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'rating-step';
  button.dataset.ratingStep = String(step);
  button.setAttribute('aria-label', `${step < 0 ? 'Decrease' : 'Increase'} ${label}`);
  // The symbol only draws the button; its name is the aria-label, so a name never has to contain the symbol.
  const symbol = document.createElement('span');
  symbol.setAttribute('aria-hidden', 'true');
  symbol.textContent = step < 0 ? '−' : '+';
  button.append(symbol);
  return button;
}

function span(className: string, ...children: Node[]): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = className;
  element.append(...children);
  return element;
}

/** Draws the empty stepper's parts, once. */
function fill(host: HTMLElement, label: string): void {
  const dots = document.createElement('dot-rating');
  dots.setAttribute('readonly', '');
  const number = span('rating-number');
  number.dataset.ratingNumber = '';
  number.setAttribute('aria-hidden', 'true');
  const text = span('visually-hidden');
  text.dataset.ratingText = '';
  const limit = span('rating-limit');
  limit.dataset.ratingLimit = '';
  limit.id = `${host.dataset.labelId}-limit`;
  limit.hidden = true;
  const minimum = span('rating-limit');
  minimum.dataset.ratingMinimum = '';
  minimum.id = `${host.dataset.labelId}-minimum`;
  minimum.hidden = true;
  // Said once per applied press, apart from the readouts: a polite slot that is always on the page.
  const announce = span('visually-hidden');
  announce.dataset.ratingAnnounce = '';
  announce.setAttribute('role', 'status');
  // The dots only show the rating; the number and its text say it.
  const shown = span('rating-dots', dots);
  shown.setAttribute('aria-hidden', 'true');
  // Both reasons are drawn on one line under the controls, the minus's first, so a narrow row never splits its controls.
  const reasons = span('rating-reasons', minimum, limit);
  reasons.dataset.ratingReasons = '';
  reasons.hidden = true;
  host.replaceChildren(stepButton(-1, label), shown, span('rating-value', number, text), stepButton(1, label), reasons, announce);
  // The row is a group named by the trait. Each button is described by its own reason, then the row's message slot.
  host.setAttribute('role', 'group');
  host.setAttribute('aria-labelledby', host.dataset.labelId!);
  const [lower, raise] = host.querySelectorAll('button');
  lower.setAttribute('aria-describedby', `${minimum.id} ${host.dataset.noticeId}`);
  raise.setAttribute('aria-describedby', `${limit.id} ${host.dataset.noticeId}`);
}

/** Sets an attribute only when it differs, so an unchanged redraw changes nothing. */
function setAttr(element: Element, name: string, value: string): void {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

/** A button that cannot act says so with `aria-disabled`, which `false` would only repeat. */
function setUnavailable(button: Element, unavailable: boolean): void {
  if (unavailable) setAttr(button, 'aria-disabled', 'true');
  else button.removeAttribute('aria-disabled');
}

function setText(element: Element, text: string): void {
  if (element.textContent !== text) element.textContent = text;
}

/**
 * Draws the stepper from `trait` and the `row` a screen decided for it. A row drawn this way is the screen's
 * (`data-row-view`): the page-wide draw of the freebie steppers, `renderFreebieStepper`, leaves it be.
 */
export function renderStepper(host: HTMLElement, trait: TraitReport, settings: { maxTrait: number }, row: RowLimits): void {
  setAttr(host, 'data-row-view', '');
  draw(host, trait, settings, row);
}

/** Draws a stepper no screen owns: its limits are the trait's own (`freebieLimitsOf`). */
export function renderFreebieStepper(host: HTMLElement, trait: TraitReport, settings: { maxTrait: number }, clan: string): void {
  if (host.hasAttribute('data-row-view')) return;
  draw(host, trait, settings, freebieLimitsOf(trait, clan));
}

function draw(host: HTMLElement, trait: TraitReport, settings: { maxTrait: number }, row: RowLimits): void {
  if (host.childElementCount === 0) fill(host, trait.label);
  const view = stepperView(trait, settings, row);
  const dots = host.querySelector('dot-rating')!;
  setAttr(dots, 'max', String(view.dots));
  setAttr(dots, 'freebie', String(trait.freebieDots));
  setAttr(dots, 'value', String(trait.rating));
  host.toggleAttribute('data-locked', trait.locked);
  // What the row holds, for styling and for the end-to-end steps; the buttons and text are what a player meets.
  host.dataset.value = String(trait.rating);
  host.dataset.min = String(view.min);
  host.dataset.max = String(view.max);
  setText(host.querySelector('[data-rating-number]')!, String(trait.rating));
  setText(host.querySelector('[data-rating-text]')!, trait.valueText);
  const [lower, raise] = host.querySelectorAll('button');
  setUnavailable(lower, !view.canLower);
  setUnavailable(raise, !view.canRaise);
  const limit = host.querySelector<HTMLElement>('[data-rating-limit]')!;
  setText(limit, view.limit ?? '');
  limit.hidden = view.limit === null;
  // Said by the minus's description either way; drawn only where the plus does not already say the same.
  const minimum = host.querySelector<HTMLElement>('[data-rating-minimum]')!;
  setText(minimum, view.lowerReason ?? '');
  minimum.hidden = view.lowerReason === null;
  minimum.classList.toggle('visually-hidden', !view.lowerShown);
  host.querySelector<HTMLElement>('[data-rating-reasons]')!.hidden = view.limit === null && !view.lowerShown;
}

/** Says the trait's value text through the stepper's polite slot; called once for each applied press. */
export function announceValue(host: HTMLElement): void {
  if (!host.isConnected) return;
  setText(host.querySelector('[data-rating-announce]')!, host.querySelector('[data-rating-text]')!.textContent ?? '');
}
