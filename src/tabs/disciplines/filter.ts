import type { DisciplineView } from '../../domain/v20/disciplineView';
import { matchesQuery } from '../../domain/v20/search';

/**
 * The Disciplines that match the search, each with the powers that do. A Discipline whose own name
 * matches keeps all its powers; otherwise only the powers whose name or summary match (together with
 * the Discipline's name, so "presence awe" finds Awe). An empty query keeps everything.
 */
export function filterDisciplines(views: readonly DisciplineView[], query: string): DisciplineView[] {
  if (query.trim() === '') return [...views];
  return views.flatMap((view) => {
    if (matchesQuery(query, view.name)) return [view];
    const powers = view.powers.filter((power) => matchesQuery(query, view.name, power.searchText));
    return powers.length > 0 ? [{ ...view, powers }] : [];
  });
}

/** The Discipline shown in detail: the chosen one if it survived the search, else the first that did. */
export function selectedDiscipline(views: readonly DisciplineView[], chosen: string | undefined): DisciplineView | undefined {
  return views.find((view) => view.key === chosen) ?? views[0];
}
