// The builder's three message channels:
//  1. save status — the top bar's autosave status, which says in text how long ago the build was stored,
//     and its alert, which says what to do when a write is refused;
//  2. refusals and notices — a polite `[data-notice]` slot beside the controls,
//     named by the refused control's `aria-describedby`;
//  3. budgets — each readout is its own live region, written only when it changes.

import type { BuildStep } from '../../domain/v20/creation/rules';
import { screenTitle } from '../../domain/v20/creation/wording';
import { AGE_REFRESH_MS, savedLabel } from './autosave';

export const NOT_SAVED =
  'Changes are not being saved. Your browser could not store this. Free up space, then choose Try saving again. Do not close or reload this page until this message goes away, or changes since the last save are lost.';

/** What a refused Save & exit says: the page stays open, and why. */
export const NOT_SAVED_ON_EXIT =
  'These changes were not saved, so you are still on the builder. Your browser could not store this. Free up space, then choose Try saving again.';

/** Whether the last save failed, for a dialog opened while the message is up. */
let saveFailed = false;
/** When the build was last stored by this page, in the page clock's milliseconds. */
let savedAt: number | undefined;
let ageTimer: number | undefined;

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

/** Redraws "Saved 2 min ago" every so often while the builder is shown. At most one clock runs. */
export function startAgeUpdates(): void {
  if (savedAt === undefined) return;
  drawAge();
  ageTimer ??= window.setInterval(drawAge, AGE_REFRESH_MS);
}

/** Stops that clock, for a view that has no status line to keep up to date. */
export function stopAgeUpdates(): void {
  if (ageTimer === undefined) return;
  window.clearInterval(ageTimer);
  ageTimer = undefined;
}

const autosave = <T extends HTMLElement>(part: string): T => document.querySelector<T>(`[data-autosave-${part}]`)!;

/** The status line: "Saved 2 min ago" or "Changes not saved", with a mark that echoes it. */
function drawStatus(text: string, state: 'saved' | 'not-saved'): void {
  const status = autosave('status');
  showReadout(status, text);
  status.dataset.state = state;
}

/** "Saved just now" ages by itself; the clock is read when it is drawn, so a fake page clock moves it. */
function drawAge(): void {
  if (saveFailed || savedAt === undefined) return;
  drawStatus(savedLabel(Date.now() - savedAt), 'saved');
}

/** Writes the failure alert. `again` says it anew even if it already reads the same, as when the player tries to leave. */
function drawFailure(text: string, again: boolean): void {
  const failure = autosave('failure');
  const alert = autosave('alert');
  if (!failure.hidden && alert.textContent === text) {
    if (!again) return;
    // Cleared now and written on the next frame: the same text written over itself in one task is not announced.
    alert.textContent = '';
    requestAnimationFrame(() => {
      if (!failure.hidden) alert.textContent = text;
    });
    return;
  }
  alert.textContent = text;
  failure.hidden = false;
}

function clearFailure(): void {
  autosave('failure').hidden = true;
  autosave('alert').textContent = '';
}

/**
 * What asked for a save. A change is saved on its own, so a failure that goes on is not said again;
 * a player who chose "Try saving again" or "Save & exit" asked, and is told the answer even if it is
 * the same one.
 */
export type SaveAsk = 'change' | 'retry' | 'exit';

/**
 * Channel 1. A stored change is shown quietly as text; a refused one is an alert that stays until a
 * save succeeds. A dialog that is open has the message in its own alert as well, because the page's is
 * inert behind it.
 */
export function reportSave(status: 'saved' | 'failed', ask: SaveAsk = 'change'): void {
  saveFailed = status === 'failed';
  if (saveFailed) {
    drawStatus('Changes not saved', 'not-saved');
    drawFailure(ask === 'exit' ? NOT_SAVED_ON_EXIT : NOT_SAVED, ask !== 'change');
    for (const alert of document.querySelectorAll<HTMLElement>('dialog[open] [data-dialog-alert]')) showDialogAlert(alert);
    return;
  }
  savedAt = Date.now();
  clearFailure();
  startAgeUpdates();
  for (const dialog of document.querySelectorAll<HTMLElement>('dialog')) clearDialogAlert(dialog);
}

/** The notice slot among the elements that describe `control`. */
function noticeSlotFor(control: HTMLElement): HTMLElement | undefined {
  const ids = control.getAttribute('aria-describedby')?.split(/\s+/) ?? [];
  return ids
    .map((id) => document.getElementById(id))
    .find((element): element is HTMLElement => element?.hasAttribute('data-notice') ?? false);
}

/** A link that opens `step`, for a message that names where to fix something. */
function stepLink(step: BuildStep): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = `#${step}`;
  link.dataset.stepGo = step;
  link.textContent = `Go to ${screenTitle(step)}`;
  return link;
}

function write(slot: HTMLElement, text: string, step?: BuildStep, sayAgain = false): void {
  const key = `${text}|${step ?? ''}`;
  // An identical message already shown is left alone, so it is not announced again.
  if (slot.dataset.message === key) {
    if (!sayAgain) return;
    // Cleared now and written on the next frame: the same text written over itself in one task is not announced.
    clear(slot);
    requestAnimationFrame(() => {
      if (slot.dataset.message === undefined) write(slot, text, step);
    });
    return;
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
