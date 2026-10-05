const region = document.querySelector<HTMLElement>('#status-message')!;
// Not a live region: a save follows every change. A refused save is announced
// by the status message instead.
const saveStatus = document.querySelector<HTMLElement>('#save-status');

const SAVED = 'Saved';
const NOT_SAVED = 'Changes not saved';

export const STORAGE_UNAVAILABLE =
  'Characters cannot be saved in this browser. Its storage is turned off or blocked for this site.';

/** Shows a message that stays until `clearStatus` is called. */
export function showStatus(text: string): void {
  if (region.textContent !== text) region.textContent = text;
  region.hidden = false;
}

export function clearStatus(): void {
  region.hidden = true;
  region.textContent = '';
}

/** Reports in the application bar that the latest change is stored. */
export function showSaved(): void {
  drawSaveStatus(SAVED, 'saved');
}

/** Reports in the application bar that the latest change could not be stored. */
export function showNotSaved(): void {
  drawSaveStatus(NOT_SAVED, 'not-saved');
}

// The words carry the meaning; the dot's shape (see global.css) echoes it.
function drawSaveStatus(text: string, state: 'saved' | 'not-saved'): void {
  if (saveStatus === null) return;
  saveStatus.textContent = text;
  saveStatus.dataset.state = state;
}
