import { folded } from './text';

/**
 * Whether every word of `query` occurs in some one of `fields`, ignoring case, accents and the space
 * around the words. An empty query matches everything; a field that is not there is skipped.
 */
export function matchesQuery(query: string, ...fields: (string | undefined)[]): boolean {
  const words = folded(query).split(/\s+/).filter(Boolean);
  const haystacks = fields.filter((field) => field !== undefined).map(folded);
  return words.every((word) => haystacks.some((haystack) => haystack.includes(word)));
}
