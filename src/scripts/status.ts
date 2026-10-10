import type { SaveResult } from '../storage/characterStore';

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

/** Takes the message down only if it is still `text`: another message that replaced it stays. */
export function clearStatusIf(text: string): void {
  if (region.textContent === text) clearStatus();
}

/**
 * Reports the outcome of a save: the application bar says whether the latest
 * change is stored, and a refusal is also announced by the status message.
 */
export function reportSave(result: SaveResult): void {
  if (result.status === 'failed') {
    drawSaveStatus(NOT_SAVED, 'not-saved');
    showStatus('Changes not saved. This browser refused to store your latest changes.');
  } else {
    drawSaveStatus(SAVED, 'saved');
    clearStatus();
  }
}

// The words carry the meaning; the dot's shape (see global.css) echoes it.
function drawSaveStatus(text: string, state: 'saved' | 'not-saved'): void {
  if (saveStatus === null) return;
  saveStatus.textContent = text;
  saveStatus.dataset.state = state;
}
