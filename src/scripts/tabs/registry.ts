import type { TabDescriptor } from './descriptor';

export interface TabList {
  /** The Character sheet first, then the others by `order`. */
  tabs: readonly TabDescriptor[];
  /** A bar is drawn only when there is more than one tab to choose from. */
  showBar: boolean;
}

/** The tabs a visitor sees: the Character sheet, then `others` in their fixed order. */
export function arrangeTabs(sheet: TabDescriptor, others: readonly TabDescriptor[]): TabList {
  // The Character sheet is placed by being first, so only its key can clash with the rest.
  const keys = new Set([sheet.key]);
  const orders = new Set<number>();
  const ordered = [...others].sort((a, b) => a.order - b.order);
  for (const { key, order } of ordered) {
    if (keys.has(key)) throw new Error(`Two tabs have the key "${key}"`);
    if (orders.has(order)) throw new Error(`Two tabs have the order ${order}`);
    keys.add(key);
    orders.add(order);
  }
  return { tabs: [sheet, ...ordered], showBar: ordered.length > 0 };
}
