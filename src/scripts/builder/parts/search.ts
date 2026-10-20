// The search shortcut every searchable screen shares: Ctrl/⌘+K focuses the current screen's search field,
// and the field's hint names the key for the platform.

export const isMacPlatform = (platform: string = navigator.platform): boolean => /^mac/i.test(platform);

/** The key as the hint writes it: "⌘K" on macOS, "Ctrl K" elsewhere. */
export const shortcutHint = (mac: boolean): string => (mac ? '⌘K' : 'Ctrl K');

/** Whether a key press is the shortcut: ⌘+K on macOS, Ctrl+K elsewhere, and never the other platform's modifier. */
export const isSearchShortcut = (event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey'>, mac: boolean): boolean =>
  event.key.toLowerCase() === 'k' && (mac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey);

/**
 * Focuses the field `currentField` names when the shortcut is pressed anywhere in `target`. A screen with no
 * search field (`undefined`) leaves the key to the browser.
 */
export function wireSearchShortcut(
  target: Document | HTMLElement,
  currentField: () => HTMLInputElement | undefined,
  mac: boolean = isMacPlatform(),
): void {
  target.addEventListener('keydown', (event) => {
    if (!isSearchShortcut(event as KeyboardEvent, mac)) return;
    const field = currentField();
    if (field === undefined) return;
    event.preventDefault();
    field.focus();
  });
}
