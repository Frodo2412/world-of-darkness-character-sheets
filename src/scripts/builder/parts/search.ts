// The search every searchable screen shares: Ctrl/⌘+K focuses the current screen's search field, the field's
// hint names the key for the platform, and the result count is said once the player pauses.

import { createSettledStatus } from './settledStatus';

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

/** The three parts of a screen's search, as `SearchField.astro` draws them. */
export interface SearchParts {
  search: HTMLInputElement;
  hint: HTMLElement;
  results: HTMLElement;
}

/** Finds a screen's search parts by the prefix its `SearchField` was given: `data-<prefix>-search`, `-search-hint`, `-results`. */
export function findSearch(root: ParentNode, prefix: string): SearchParts {
  return {
    search: root.querySelector<HTMLInputElement>(`[data-${prefix}-search]`)!,
    hint: root.querySelector<HTMLElement>(`[data-${prefix}-search-hint]`)!,
    results: root.querySelector<HTMLElement>(`[data-${prefix}-results]`)!,
  };
}

/**
 * Wires one screen's search: the hint and key names on the field, `onInput` with the query at every change, and
 * the shortcut, which goes to this field only while its screen is the one shown (neither it nor the builder
 * around it is hidden). Returns what says a result count, once the player has paused.
 */
export function wireSearchField(
  { search, hint, results }: SearchParts,
  onInput: (query: string) => void,
  mac: boolean = isMacPlatform(),
): (text: string) => void {
  wireSearchHint(search, hint, mac);
  search.addEventListener('input', () => onInput(search.value));
  wireSearchShortcut(document, () => (search.closest('[hidden]') ? undefined : search), mac);
  return createSettledStatus(results);
}
