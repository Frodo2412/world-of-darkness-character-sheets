// The script side of components/dossier/SearchField.astro: reports the query as it changes, shows the
// clear button once there is something to clear, and says how many items match.

export interface SearchBox {
  query(): string;
  /** Says the number of matches in the field's polite region; blank text clears it. */
  say(text: string): void;
  clear(): void;
}

/** "3 matches", "1 match", "No matches". */
export const matchesText = (count: number): string => (count === 0 ? 'No matches' : `${count} ${count === 1 ? 'match' : 'matches'}`);

/** Wires the search field inside `field` (the element marked `data-search`). `onQuery` hears every change of the query. */
export function wireSearch(field: ParentNode, onQuery: (query: string) => void): SearchBox {
  const input = field.querySelector<HTMLInputElement>('[data-search-input]')!;
  const clearButton = field.querySelector<HTMLButtonElement>('[data-search-clear]')!;
  const count = field.querySelector<HTMLElement>('[data-search-count]')!;

  const changed = (): void => {
    clearButton.hidden = input.value === '';
    onQuery(input.value);
  };
  const clear = (): void => {
    input.value = '';
    changed();
  };

  input.addEventListener('input', changed);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && input.value !== '') {
      event.preventDefault();
      clear();
    }
  });
  clearButton.addEventListener('click', () => {
    clear();
    input.focus();
  });

  return {
    query: () => input.value,
    say(text) {
      if (count.textContent !== text) count.textContent = text;
    },
    clear,
  };
}
