// Which rows of a list the Backgrounds tab shows, and how many it counts. Play mode shows (and
// counts) the rows that have a name; edit mode shows and counts every row, blank ones included,
// so a row can be filled in.

/** The two modes the tab draws for: the sheet's own `play` and `edit`. */
export type ListMode = 'play' | 'edit';

/** A row of a list with its place in the stored list, which is how an edit finds it again. */
export interface Listed<T> {
  index: number;
  entry: T;
}

/** Whether the row has a name: an unnamed row is not shown in play mode. */
export const isNamed = (entry: { name: string }): boolean => entry.name.trim() !== '';

/** The rows the tab shows in the mode, in stored order: the named ones in play, all of them in edit. */
export function listed<T extends { name: string }>(entries: readonly T[], mode: ListMode): Listed<T>[] {
  return entries.map((entry, index) => ({ index, entry })).filter(({ entry }) => mode === 'edit' || isNamed(entry));
}
