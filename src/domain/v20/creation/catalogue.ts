// Looking things up by name in the builder's catalogues. No data lives here.

/** The items whose name holds `query`, ignoring case and the space around it, in their order; every item for a blank query. */
export function matchByName<T extends { name: string }>(items: readonly T[], query: string): T[] {
  const wanted = query.trim().toLowerCase();
  return items.filter((item) => item.name.toLowerCase().includes(wanted));
}
