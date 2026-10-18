/** The points of a section's entries added up: what the Merits and Flaws headings show. */
export function pointTotal(entries: readonly { points: number }[]): number {
  return entries.reduce((total, entry) => total + entry.points, 0);
}
