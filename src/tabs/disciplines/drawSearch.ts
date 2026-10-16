import { countLabel } from '../../domain/v20/labels';
import type { DisciplineView } from '../../domain/v20/disciplineView';
import { filterBy } from '../../scripts/dossier/filterBy';
import { setText } from '../../scripts/dossier/dom';

/** The parts of the panel's search field the draw writes into. */
export interface SearchParts {
  input: HTMLInputElement;
  clear: HTMLElement;
  count: HTMLElement;
}

/**
 * What the words of `query` leave of the Disciplines: a Discipline whose name has them keeps all its
 * powers; otherwise it is kept for the powers whose name or summary have them, and only those.
 */
export function narrowDisciplines(disciplines: readonly DisciplineView[], query: string): DisciplineView[] {
  return disciplines.flatMap((discipline) => {
    if (filterBy([discipline], query, ({ name }) => [name]).length > 0) return [discipline];
    const powers = filterBy(discipline.powers, query, ({ name, rule }) => [name, rule.summary]);
    return powers.length > 0 ? [{ ...discipline, powers }] : [];
  });
}

/** The clear button and the count: both are for a search that has been typed, so they wait for one. */
export function drawSearch({ input, clear, count }: SearchParts, matched: number): void {
  const searching = input.value.trim() !== '';
  clear.hidden = !searching;
  setText(count, searching ? `${countLabel(matched, 'Discipline', 'Disciplines')} shown` : '');
}
