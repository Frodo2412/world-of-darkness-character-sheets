// The controls that browse the library: today the search field, "Clear filters" and the shortcut to the field.
// One-way contract: the page calls `sync(view, filter)` after every redraw, and a control reports
// what the player did by calling `onChange(patch)`; the controls hold no filter of their own beyond
// the last one they were shown. Nothing here touches the page when imported: the caller hands over the elements.

import { clearedFilter, type LibraryFilter, type LibraryView } from '../../domain/v20/library';

/** The key combination that goes to the search field on the player's platform, and how to tell them of it. */
export interface Shortcut {
  /** The modifier held with K: ⌘ on an Apple platform, Control elsewhere; never both. */
  modifier: 'Meta' | 'Control';
  /** For the eye: "⌘ K" or "Ctrl K". */
  hint: string;
  /** For assistive technology, as `aria-keyshortcuts` writes it. */
  keyShortcuts: string;
}

/** What `navigator` offers about the platform. `userAgentData` is not in every browser, nor in the DOM typings. */
export interface PlatformSource {
  userAgentData?: { platform?: string };
  platform?: string;
}

const APPLE: Shortcut = { modifier: 'Meta', hint: '⌘ K', keyShortcuts: 'Meta+K' };
const OTHER: Shortcut = { modifier: 'Control', hint: 'Ctrl K', keyShortcuts: 'Control+K' };

/** The platform names that are Apple's: "macOS" and "MacIntel", "iPhone", "iPad". */
const APPLE_PLATFORM = /^(?:mac|iphone|ipad|ipod)/i;

/** The one place the platform is read: ⌘K on an Apple platform, Ctrl+K anywhere else. */
export function shortcutFor(source: PlatformSource): Shortcut {
  const platform = source.userAgentData?.platform ?? source.platform ?? '';
  return APPLE_PLATFORM.test(platform) ? APPLE : OTHER;
}

/** The parts of a key press that decide whether it is the shortcut. */
export type KeyPress = Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'isComposing'>;

/** Whether `press` is exactly K with the shortcut's modifier: not the other platform's, not with more held, not mid-composition. */
export function isShortcut(press: KeyPress, shortcut: Shortcut): boolean {
  if (press.isComposing || press.altKey || press.shiftKey) return false;
  const apple = shortcut.modifier === 'Meta';
  return press.key.toLowerCase() === 'k' && press.metaKey === apple && press.ctrlKey === !apple;
}

export interface ControlElements {
  /** The row of browsing tools; the shortcut does nothing while it is hidden. */
  tools: HTMLElement;
  /** The native search box. */
  search: HTMLInputElement;
  /** Where the shortcut is written for the eye. */
  hint: HTMLElement;
  /** The button of the no-match state. */
  clear: HTMLButtonElement;
  /** Where key presses are heard: the document. */
  keys: Pick<Document, 'addEventListener'>;
}

export interface Controls {
  /** Shows the filter the page holds. The search text is written only when it differs, so the caret stays where the player has it. */
  sync(view: LibraryView, filter: LibraryFilter): void;
}

/** Wires the controls once; they keep their nodes for the life of the page, so focus is never lost to a redraw. */
export function createControls(
  elements: ControlElements,
  onChange: (patch: Partial<LibraryFilter>) => void,
  shortcut: Shortcut,
): Controls {
  const { tools, search, hint, clear, keys } = elements;
  let shown: LibraryFilter | undefined;

  // On every input event, so the list narrows as the player types.
  search.addEventListener('input', () => onChange({ search: search.value }));

  clear.addEventListener('click', () => {
    if (shown === undefined) return;
    onChange(clearedFilter(shown));
    // The button is gone once the list returns, so focus goes to where the player searches next.
    search.focus();
  });

  // Written here, not in the page: the page is built before it is known which platform it is read on.
  hint.textContent = shortcut.hint;
  hint.hidden = false;
  search.setAttribute('aria-keyshortcuts', shortcut.keyShortcuts);

  keys.addEventListener('keydown', (event) => {
    if (!isShortcut(event, shortcut)) return;
    // Already in the field, the press is the browser's (Ctrl+K is its own search on some platforms);
    // with no tools there is nowhere to go, and the browser keeps its shortcut.
    if (event.target === search || tools.hidden) return;
    event.preventDefault();
    search.focus();
  });

  return {
    sync(_view, filter) {
      shown = filter;
      if (search.value !== filter.search) search.value = filter.search;
    },
  };
}
