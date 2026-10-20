// The search shortcut every searchable screen shares: Ctrl/⌘+K focuses the current screen's search field,
// and the field's hint names the key for the platform.

export const isMacPlatform = (platform: string = navigator.platform): boolean => /^mac/i.test(platform);

/** The key as the hint writes it: "⌘K" on macOS, "Ctrl K" elsewhere. */
export const shortcutHint = (mac: boolean): string => (mac ? '⌘K' : 'Ctrl K');

/**
 * Names the shortcut on the field and beside it. The hint sits where the browser draws the field's clear
 * button, so it is hidden while the field holds text.
 */
export function wireSearchHint(search: HTMLInputElement, hint: HTMLElement, mac: boolean = isMacPlatform()): void {
  hint.textContent = shortcutHint(mac);
  search.setAttribute('aria-keyshortcuts', mac ? 'Meta+K' : 'Control+K');
  const show = (): void => {
    hint.hidden = search.value !== '';
  };
  show();
  search.addEventListener('input', show);
}

/**
 * Whether a key press is the shortcut: ⌘+K on macOS, Ctrl+K elsewhere, never the other platform's modifier,
 * and never with Shift or Alt held, which are other shortcuts the browser may own.
 */
export const isSearchShortcut = (
  event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>,
  mac: boolean,
): boolean =>
  event.key.toLowerCase() === 'k' &&
  !event.shiftKey &&
  !event.altKey &&
  (mac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey);

/**
 * Focuses the field `currentField` names when the shortcut is pressed anywhere in `target`. A screen with no
 * search field (`undefined`) leaves the key to the browser, as does a page with a modal dialog open: the
 * field is out of reach behind it.
 */
export function wireSearchShortcut(
  target: Document | HTMLElement,
  currentField: () => HTMLInputElement | undefined,
  mac: boolean = isMacPlatform(),
): void {
  target.addEventListener('keydown', (event) => {
    if (!isSearchShortcut(event as KeyboardEvent, mac)) return;
    if (document.querySelector('dialog:modal') !== null) return;
    const field = currentField();
    if (field === undefined) return;
    event.preventDefault();
    field.focus();
  });
}
