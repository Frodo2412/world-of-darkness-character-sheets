const region = document.querySelector<HTMLElement>('#status-message')!;

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
