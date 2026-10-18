import { describe, expect, it } from 'vitest';
import { discoverTabs } from './discover';

// The tab folders the repository really has, found by the same glob the page uses: adding a tab folder
// is how a tab is registered, so this is where the set the sheet offers is pinned.
const { tabs, showBar } = discoverTabs();
const built = tabs.filter((tab) => tab.key !== 'sheet');

describe("the sheet's tabs", () => {
  it('are the Character sheet first, then the five dossier tabs in their fixed order', () => {
    expect(tabs.map((tab) => tab.key)).toEqual(['sheet', 'disciplines', 'backgrounds', 'combat', 'journal', 'levelup']);
    expect(tabs.map((tab) => tab.label)).toEqual(['Character sheet', 'Disciplines', 'Backgrounds', 'Combat', 'Journal', 'Level up']);
  });

  it('show the bar, since there is more than the Character sheet', () => {
    expect(showBar).toBe(true);
  });

  it('are exactly the five tabs, each key once', () => {
    expect(built.map((tab) => tab.key).sort()).toEqual(['backgrounds', 'combat', 'disciplines', 'journal', 'levelup']);
    expect(new Set(tabs.map((tab) => tab.key)).size).toBe(tabs.length);
  });

  it('have an order of their own, so the bar never depends on how the glob listed them', () => {
    const orders = built.map((tab) => tab.order);

    expect(new Set(orders).size).toBe(orders.length);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('keep the live resources above every tab but Level up', () => {
    expect(Object.fromEntries(tabs.map((tab) => [tab.key, tab.showsResources]))).toEqual({
      sheet: true,
      disciplines: true,
      backgrounds: true,
      combat: true,
      journal: true,
      levelup: false,
    });
  });

  it('load their scripts only when shown: each descriptor holds a function, not the module', () => {
    for (const tab of built) expect(typeof tab.mount).toBe('function');
  });
});
