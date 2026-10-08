// The controls that browse the library: the search field, the clan filter, the status filter, the sort control, "Clear filters"
// and the shortcut to the search field.
// One-way contract: the page calls `sync(view, filter)` after every redraw, and a control reports
// what the player did by calling `onChange(patch)`; the controls hold no filter of their own beyond
// the last one they were shown. `sync` writes the filter's values into the controls on every redraw;
// `createControls` writes their fixed options and the shortcut hint once.
// Nothing here touches the page when imported: the caller hands over the elements.

import {
  ALL_CLANS,
  clearedFilter,
  ORDERS,
  type LibraryClan,
  type LibraryFilter,
  type LibraryOrder,
  type LibraryStatus,
  type LibraryView,
} from '../../domain/v20/library';

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
  /** The native clan select; it has no options until `createControls` writes them. */
  clan: HTMLSelectElement;
  /** The status filter's fieldset: a radio per status, and beside each a `status-count` slot. */
  status: HTMLElement;
  /** The native sort select; it has no options until `createControls` writes them. */
  order: HTMLSelectElement;
}

/** What the clan filter calls the choice of every clan; its value is `ALL_CLANS`. */
const ALL_CLANS_LABEL = 'All clans';

/** The statuses, as the filter offers them: each is the value of one radio. */
const STATUSES: readonly LibraryStatus[] = ['all', 'ready'];

function option(value: string, label: string): HTMLOptionElement {
  const element = document.createElement('option');
  element.value = value;
  element.textContent = label;
  return element;
}

/** One status: the radio that chooses it and the slot beside it that tells how many it holds. */
interface StatusOption {
  value: LibraryStatus;
  radio: HTMLInputElement;
  count: HTMLElement;
}

/** Finds the radio of every status and the count written with it. A page without them is a mistake in the page. */
function statusOptions(group: HTMLElement): StatusOption[] {
  return STATUSES.map((value) => {
    const radio = group.querySelector<HTMLInputElement>(`input[type="radio"][value="${value}"]`);
    const count = radio?.closest('label')?.querySelector<HTMLElement>('[data-slot="status-count"]');
    if (!radio || !count) throw new Error(`The status filter has no "${value}" option with a count to write.`);
    return { value, radio, count };
  });
}

export interface Controls {
  /**
   * Shows the filter the page holds, and how many entries each status holds. The search text is written only
   * when it differs, so the caret stays where the player has it. The clan shown is the one the view resolved:
   * a clan that has gone from the library is shown as all clans.
   */
  sync(view: LibraryView, filter: LibraryFilter): void;
}

/**
 * Wires the controls once; they keep their nodes for the life of the page, so focus is never lost to a redraw.
 * The clan filter's options are written here, once, from `clans`: the clans of the whole library.
 */
export function createControls(
  elements: ControlElements,
  clans: readonly LibraryClan[],
  onChange: (patch: Partial<LibraryFilter>) => void,
  shortcut: Shortcut,
): Controls {
  const { tools, search, hint, clear, keys, clan, status, order } = elements;
  const statuses = statusOptions(status);
  let shown: LibraryFilter | undefined;

  clan.replaceChildren(option(ALL_CLANS, ALL_CLANS_LABEL), ...clans.map(({ key, label }) => option(key, label)));
  order.replaceChildren(
    ...(Object.entries(ORDERS) as [LibraryOrder, (typeof ORDERS)[LibraryOrder]][]).map(([value, { label }]) => option(value, label)),
  );

  // On every input event, so the list narrows as the player types.
  search.addEventListener('input', () => onChange({ search: search.value }));

  clan.addEventListener('change', () => onChange({ clan: clan.value }));

  order.addEventListener('change', () => onChange({ order: order.value as LibraryOrder }));

  // A radio reports only when it becomes the chosen one, whether by pointer or by the arrow keys.
  for (const { value, radio } of statuses) {
    radio.addEventListener('change', () => {
      if (radio.checked) onChange({ status: value });
    });
  }

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
    sync(view, filter) {
      shown = filter;
      if (search.value !== filter.search) search.value = filter.search;
      if (clan.value !== view.clan) clan.value = view.clan;
      if (order.value !== filter.order) order.value = filter.order;
      for (const { value, radio, count } of statuses) {
        radio.checked = value === filter.status;
        count.textContent = String(view.statusCounts[value]);
      }
    },
  };
}
