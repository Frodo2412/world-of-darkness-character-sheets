// A rating row's minus/plus stepper: the dots, the number and the two buttons, drawn from the report.
// The page serves (or, for a Discipline, creates) an empty `.rating-stepper`; `renderStepper` fills it
// once and then only updates it, so a focused button is never replaced. A button that cannot act is
// `aria-disabled`, not `disabled`: it keeps its focus and says why in text, and pressing it still asks
// the build, which refuses with the reason.

import type { BuildTraitRef } from '../../../domain/v20/creation/build';
import type { TraitReport } from '../../../domain/v20/creation/progress';
import type { DotSource } from '../../../domain/v20/creation/updates';

/** What the stepper shows for a trait, decided apart from the DOM. */
export interface StepperView {
  /** How many dots are drawn: a locked trait is drawn to the generation's scale so its fixed 0 shows as empty dots. */
  dots: number;
  canLower: boolean;
  canRaise: boolean;
  /** The visible reason a button cannot act, beside the plus: "Maximum 5", "Fixed for Nosferatu". */
  limit: string | null;
}

export function stepperView(trait: TraitReport, settings: { maxTrait: number }, clan: string): StepperView {
  return {
    dots: trait.locked ? settings.maxTrait : trait.max,
    canLower: !trait.locked && trait.rating > trait.floor,
    canRaise: !trait.locked && trait.rating < trait.max,
    limit: trait.locked ? `Fixed for ${clan}` : trait.rating >= trait.max ? `Maximum ${trait.max}` : null,
  };
}

/** The attributes an empty stepper is served with; the Astro row writes the same ones. */
export interface StepperHost {
  trait: BuildTraitRef;
  mode: DotSource;
  /** The id of the row's visible name; the stepper's reason is `<labelId>-limit`. */
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

function stepButton(step: -1 | 1, label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'rating-step';
  button.dataset.ratingStep = String(step);
  button.setAttribute('aria-label', `${step < 0 ? 'Decrease' : 'Increase'} ${label}`);
  button.textContent = step < 0 ? '−' : '+';
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
  // The dots only show the rating; the number and its text say it.
  const shown = span('rating-dots', dots);
  shown.setAttribute('aria-hidden', 'true');
  host.replaceChildren(
    stepButton(-1, label),
    shown,
    span('rating-value', number, text),
    stepButton(1, label),
    limit,
  );
  // Both buttons are described by the row's message slot; the plus by its reason first.
  const [lower, raise] = host.querySelectorAll('button');
  lower.setAttribute('aria-describedby', host.dataset.noticeId!);
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

export function renderStepper(host: HTMLElement, trait: TraitReport, settings: { maxTrait: number }, clan: string): void {
  if (host.childElementCount === 0) fill(host, trait.label);
  const view = stepperView(trait, settings, clan);
  const dots = host.querySelector('dot-rating')!;
  setAttr(dots, 'max', String(view.dots));
  setAttr(dots, 'freebie', String(trait.freebieDots));
  setAttr(dots, 'value', String(trait.rating));
  host.toggleAttribute('data-locked', trait.locked);
  // What the row holds, for styling and for the end-to-end steps; the buttons and text are what a player meets.
  host.dataset.value = String(trait.rating);
  host.dataset.min = String(trait.floor);
  host.dataset.max = String(trait.max);
  setText(host.querySelector('[data-rating-number]')!, String(trait.rating));
  setText(host.querySelector('[data-rating-text]')!, trait.valueText);
  const [lower, raise] = host.querySelectorAll('button');
  setUnavailable(lower, !view.canLower);
  setUnavailable(raise, !view.canRaise);
  const limit = host.querySelector<HTMLElement>('[data-rating-limit]')!;
  setText(limit, view.limit ?? '');
  limit.hidden = view.limit === null;
}
