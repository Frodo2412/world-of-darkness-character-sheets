import { countLabel } from '../../domain/v20/labels';
import { setText } from '../../scripts/dossier/dom';

/** The parts of the panel's search field the draw writes into. */
export interface SearchParts {
  input: HTMLInputElement;
  clear: HTMLElement;
  count: HTMLElement;
}

/** The clear button and the count: both are for a search that has been typed, so they wait for one. */
export function drawSearch({ input, clear, count }: SearchParts, matched: number): void {
  const searching = input.value.trim() !== '';
  clear.hidden = !searching;
  setText(count, searching ? `${countLabel(matched, 'entry', 'entries')} shown` : '');
}
