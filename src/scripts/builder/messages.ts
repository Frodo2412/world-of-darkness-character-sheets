// The builder's three message channels:
//  1. save status — the page's `#status-message`, written from here and from `../status`
//     (which the sheet uses too);
//  2. refusals and notices — a polite `[data-notice]` slot beside the controls,
//     named by the refused control's `aria-describedby`;
//  3. budgets — each readout is its own live region, written only when it changes.

import { BUILD_STEPS, type BuildStep } from '../../domain/v20/creation/rules';
import { clearStatus, showStatus } from '../status';

export const NOT_SAVED =
  'Changes are not being saved. This browser refused to store them. Do not close or reload this page until this message goes away, or your latest changes will be lost.';

/** Whether the last save failed, for a dialog opened while the message is up. */
let saveFailed = false;

/** Says the not-saved message in a dialog's own alert, which the page's alert behind a modal cannot do. */
function showDialogAlert(alert: HTMLElement): void {
  if (alert.textContent !== NOT_SAVED) alert.textContent = NOT_SAVED;
  alert.hidden = false;
}

/** Takes the not-saved message out of a dialog's alert. */
export function clearDialogAlert(dialog: HTMLElement): void {
  for (const alert of dialog.querySelectorAll<HTMLElement>('[data-dialog-alert]')) {
    alert.hidden = true;
    alert.textContent = '';
  }
}

/** Puts the not-saved message into a dialog that has just opened, if saving is still failing. */
export function restoreDialogAlert(dialog: HTMLElement): void {
  if (!saveFailed) return;
  for (const alert of dialog.querySelectorAll<HTMLElement>('[data-dialog-alert]')) showDialogAlert(alert);
}

/**
 * Channel 1. The not-saved message stays until a save succeeds. A dialog that is open has it in its
 * own alert as well, because the page's is inert behind it.
 */
export function reportSave(status: 'saved' | 'failed'): void {
  saveFailed = status === 'failed';
  if (saveFailed) {
    showStatus(NOT_SAVED);
    for (const alert of document.querySelectorAll<HTMLElement>('dialog[open] [data-dialog-alert]')) showDialogAlert(alert);
  } else {
    clearStatus();
    for (const dialog of document.querySelectorAll<HTMLElement>('dialog')) clearDialogAlert(dialog);
  }
}

/** The notice slot among the elements that describe `control`. */
function noticeSlotFor(control: HTMLElement): HTMLElement | undefined {
  const ids = control.getAttribute('aria-describedby')?.split(/\s+/) ?? [];
  return ids
    .map((id) => document.getElementById(id))
    .find((element): element is HTMLElement => element?.hasAttribute('data-notice') ?? false);
}

const stepTitle = (step: BuildStep): string =>
  BUILD_STEPS.find((entry) => entry.step === step)!.title;

/** A link that opens `step`, for a message that names where to fix something. */
function stepLink(step: BuildStep): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = `#${step}`;
  link.dataset.stepGo = step;
  link.textContent = `Go to ${stepTitle(step)}`;
  return link;
}

function write(slot: HTMLElement, text: string, step?: BuildStep, sayAgain = false): void {
  const key = `${text}|${step ?? ''}`;
  // An identical message already shown is left alone, so it is not announced again.
  if (slot.dataset.message === key) {
    if (!sayAgain) return;
    slot.replaceChildren();
  }
  slot.dataset.message = key;
  slot.replaceChildren(text, ...(step ? [' ', stepLink(step)] : []));
}

/**
 * Takes the invalid mark off the typed entries a cleared region explained, so the redraw gives them
 * back the stored value rather than leaving a refused entry with nothing said about it.
 */
function clearInvalidMarks(root: HTMLElement, slot: HTMLElement): void {
  if (!slot.id) return;
  for (const control of root.querySelectorAll(`[aria-invalid][aria-describedby~="${slot.id}"]`)) {
    control.removeAttribute('aria-invalid');
  }
}

function clear(slot: HTMLElement): void {
  if (slot.dataset.message === undefined) return;
  delete slot.dataset.message;
  slot.replaceChildren();
}

/** Channel 2: one refusal at a time, beside the control that was refused. */
export function showRefusal(
  root: HTMLElement,
  control: HTMLElement,
  reason: string,
  step?: BuildStep,
  /** Say it again even if it is already shown, as when the player tries the same blocked action twice. */
  sayAgain = false,
): void {
  const slot = noticeSlotFor(control);
  for (const other of root.querySelectorAll<HTMLElement>('[data-notice]')) {
    if (other === slot) continue;
    clear(other);
    clearInvalidMarks(root, other);
  }
  // Only a typed entry can hold a value the build does not; it stays visible, marked invalid.
  if (control instanceof HTMLInputElement) control.setAttribute('aria-invalid', 'true');
  if (slot) write(slot, reason, step, sayAgain);
}

/** Channel 2: what an applied change also did, beside the control that made it. */
export function showNotices(control: HTMLElement, notices: string[]): void {
  const slot = noticeSlotFor(control);
  if (slot && notices.length > 0) write(slot, notices.join(' '));
}

/** Clears every refusal and notice under `root`; an applied change does this. */
export function clearNotices(root: HTMLElement): void {
  for (const slot of root.querySelectorAll<HTMLElement>('[data-notice]')) clear(slot);
  for (const control of root.querySelectorAll('[aria-invalid]')) {
    control.removeAttribute('aria-invalid');
  }
}

/** Channel 3. Writing only a changed value keeps unchanged readouts silent. */
export function showReadout(readout: HTMLElement, text: string): void {
  if (readout.textContent !== text) readout.textContent = text;
}
