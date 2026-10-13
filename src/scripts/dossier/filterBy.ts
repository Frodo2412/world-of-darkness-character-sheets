import { matchesQuery } from '../../domain/v20/search';

/** The items whose `fieldsOf` text holds every word of `query`, in their order; all of them for an empty query. */
export function filterBy<T>(items: readonly T[], query: string, fieldsOf: (item: T) => (string | undefined)[]): T[] {
  return items.filter((item) => matchesQuery(query, ...fieldsOf(item)));
}
