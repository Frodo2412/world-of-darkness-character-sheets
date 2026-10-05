// The builder's three message channels:
//  1. save status — the page's `#status-message`, written only from here;
//  2. refusals and notices — a polite `[data-notice]` slot beside the controls,
//     named by the refused control's `aria-describedby`;
//  3. budgets — each readout is its own live region, written only when it changes.

import { clearStatus, showStatus } from '../status';

export const NOT_SAVED =
  'Changes are not being saved. This browser refused to store them. Do not close or reload this page until this message goes away, or your latest changes will be lost.';

/** Channel 1. The not-saved message stays until a save succeeds. */
export function reportSave(status: 'saved' | 'failed'): void {
  if (status === 'failed') showStatus(NOT_SAVED);
  else clearStatus();
}

/** The notice slot among the elements that describe `control`. */
function noticeSlotFor(control: HTMLElement): HTMLElement | undefined {
  const ids = control.getAttribute('aria-describedby')?.split(/\s+/) ?? [];
  return ids
    .map((id) => document.getElementById(id))
    .find((element): element is HTMLElement => element?.hasAttribute('data-notice') ?? false);
}

/** Channel 2. An identical refusal already shown is left alone, so it is not announced again. */
export function showRefusal(control: HTMLElement, reason: string): void {
  // Only a typed entry can hold a value the build does not; it stays visible, marked invalid.
  if (control instanceof HTMLInputElement) control.setAttribute('aria-invalid', 'true');
  const slot = noticeSlotFor(control);
  if (slot && slot.textContent !== reason) slot.textContent = reason;
}

/** Clears every refusal and notice under `root`; an applied change does this. */
export function clearNotices(root: HTMLElement): void {
  for (const slot of root.querySelectorAll<HTMLElement>('[data-notice]')) {
    if (slot.textContent !== '') slot.textContent = '';
  }
  for (const control of root.querySelectorAll('[aria-invalid]')) {
    control.removeAttribute('aria-invalid');
  }
}

/** Channel 3. Writing only a changed value keeps unchanged readouts silent. */
export function showReadout(readout: HTMLElement, text: string): void {
  if (readout.textContent !== text) readout.textContent = text;
}
