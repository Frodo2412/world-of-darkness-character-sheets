// Counts and points as words: "1 entry", "3 entries", "2 pts", "1 point".

/** "1 entry", "3 entries": the count with the form of the noun it needs. */
export const countLabel = (n: number, singular: string, plural: string): string =>
  `${n} ${n === 1 ? singular : plural}`;

/** A row's points: "1 pt", "2 pts". */
export const pointsLabel = (n: number): string => countLabel(n, 'pt', 'pts');

/** A section header's points: "1 point", "3 points". */
export const pointsTotalLabel = (n: number): string => countLabel(n, 'point', 'points');
