import { tabFromUrl, hrefFor } from './address';
import type { TabKey } from './descriptor';

/** The parts of `window` the tab history uses, so a test can stand in for it. */
export interface HistoryWindow {
  location: { href: string };
  history: { pushState(data: unknown, unused: string, url: string): void };
  addEventListener(type: 'popstate', listener: () => void): void;
}

export interface TabHistory {
  /** The tab the address names now. */
  current(): TabKey;
  /** Makes `key` the address as a new history entry; nothing when it already is. */
  push(key: TabKey): void;
  /** Calls `listener` with the tab the address names after Back or Forward. */
  onPop(listener: (key: TabKey) => void): void;
}

/** Keeps the tab in the address (`?tab=`) and follows Back and Forward. */
export function createTabHistory(win: HistoryWindow, keys: readonly TabKey[]): TabHistory {
  const current = (): TabKey => tabFromUrl(new URL(win.location.href), keys);
  return {
    current,
    push(key) {
      if (key === current()) return;
      win.history.pushState(null, '', hrefFor(new URL(win.location.href), key));
    },
    onPop(listener) {
      win.addEventListener('popstate', () => listener(current()));
    },
  };
}
