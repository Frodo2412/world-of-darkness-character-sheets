// The controls that browse the library: today the search field and "Clear filters".
// One-way contract: the page calls `sync(view, filter)` after every redraw, and a control reports
// what the player did by calling `onChange(patch)`; the controls hold no filter of their own beyond
// the last one they were shown. Nothing here touches the page when imported: the caller hands over the elements.

import { clearedFilter, type LibraryFilter, type LibraryView } from '../../domain/v20/library';

export interface ControlElements {
  /** The native search box. */
  search: HTMLInputElement;
  /** The button of the no-match state. */
  clear: HTMLButtonElement;
}

export interface Controls {
  /** Shows the filter the page holds. The search text is written only when it differs, so the caret stays where the player has it. */
  sync(view: LibraryView, filter: LibraryFilter): void;
}

/** Wires the controls once; they keep their nodes for the life of the page, so focus is never lost to a redraw. */
export function createControls(elements: ControlElements, onChange: (patch: Partial<LibraryFilter>) => void): Controls {
  const { search, clear } = elements;
  let shown: LibraryFilter | undefined;

  // On every input event, so the list narrows as the player types.
  search.addEventListener('input', () => onChange({ search: search.value }));

  clear.addEventListener('click', () => {
    if (shown === undefined) return;
    onChange(clearedFilter(shown));
    // The button is gone once the list returns, so focus goes to where the player searches next.
    search.focus();
  });

  return {
    sync(_view, filter) {
      shown = filter;
      if (search.value !== filter.search) search.value = filter.search;
    },
  };
}
