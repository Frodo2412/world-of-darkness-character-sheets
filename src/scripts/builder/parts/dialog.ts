// A native modal dialog: opened from one button, closed by Escape, a close
// button or a form button, with focus returned to the button that opened it.
// Refusals inside it use the dialog's own [data-notice] regions, which are
// cleared when it closes.

import { clearNotices } from '../messages';

/**
 * Wires `dialog` to `opener`. Any `[data-dialog-close]` inside closes it, and so
 * does a link to a step, which takes focus itself. `onClose` runs last, after the
 * dialog's refusals are cleared, so it can redraw fields from the build.
 */
export function wireDialog(dialog: HTMLDialogElement, opener: HTMLElement, onClose: () => void): void {
  let followedLink = false;

  opener.addEventListener('click', () => dialog.showModal());

  dialog.addEventListener('click', (event) => {
    const target = event.target as Element;
    if (target.closest('[data-dialog-close]')) {
      dialog.close();
    } else if (target.closest('[data-step-go]')) {
      followedLink = true;
      dialog.close();
    }
  });

  dialog.addEventListener('close', () => {
    // Moving focus first lets an entry still being typed finish and be judged.
    if (followedLink) followedLink = false;
    else opener.focus();
    clearNotices(dialog);
    onClose();
  });
}
