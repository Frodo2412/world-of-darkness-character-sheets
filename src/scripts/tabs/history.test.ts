import { describe, expect, it } from 'vitest';
import { createTabHistory, type HistoryWindow } from './history';

const keys = ['sheet', 'disciplines', 'combat'];

/** A window whose address changes the way a browser's does, and that can go Back. */
function fakeWindow(start: string) {
  const entries = [new URL(start, 'http://localhost/').href];
  let at = 0;
  const listeners: (() => void)[] = [];
  const win: HistoryWindow & { go(offset: number): void; entries: string[]; at(): number } = {
    location: {
      get href() {
        return entries[at];
      },
    },
    history: {
      pushState(_data, _unused, url) {
        entries.splice(at + 1, entries.length, new URL(url, entries[at]).href);
        at += 1;
      },
      replaceState(_data, _unused, url) {
        entries[at] = new URL(url, entries[at]).href;
      },
    },
    addEventListener: (_type, listener) => void listeners.push(listener),
    go(offset) {
      at += offset;
      for (const listener of listeners) listener();
    },
    entries,
    at: () => at,
  };
  return win;
}

describe('createTabHistory', () => {
  it('reads the tab from the address', () => {
    expect(createTabHistory(fakeWindow('/sheet/?id=a1&tab=combat'), keys).current()).toBe('combat');
    expect(createTabHistory(fakeWindow('/sheet/?id=a1'), keys).current()).toBe('sheet');
  });

  it('puts a tab in the address as a new entry, keeping the character', () => {
    const win = fakeWindow('/sheet/?id=a1');
    createTabHistory(win, keys).push('combat');
    expect(win.entries).toEqual(['http://localhost/sheet/?id=a1', 'http://localhost/sheet/?id=a1&tab=combat']);
  });

  it('adds no entry for the tab the address already names', () => {
    const win = fakeWindow('/sheet/?id=a1&tab=combat');
    createTabHistory(win, keys).push('combat');
    createTabHistory(fakeWindow('/sheet/?id=a1'), keys).push('sheet');
    expect(win.entries).toHaveLength(1);
  });

  it('puts a tab in the address in place of the current entry, adding none', () => {
    const win = fakeWindow('/sheet/?id=a1&tab=combat');
    const history = createTabHistory(win, keys);

    history.replace('sheet');
    history.replace('sheet');

    expect(win.entries).toEqual(['http://localhost/sheet/?id=a1']);
  });

  it('tells the listener the tab the address names after Back and after Forward', () => {
    const win = fakeWindow('/sheet/?id=a1');
    const history = createTabHistory(win, keys);
    const seen: string[] = [];
    history.onPop((key) => void seen.push(key));
    history.push('combat');
    history.push('disciplines');

    win.go(-1);
    win.go(-1);
    win.go(1);

    expect(seen).toEqual(['combat', 'sheet', 'combat']);
  });

  it('drops the forward entries when a new tab is chosen after going Back', () => {
    const win = fakeWindow('/sheet/?id=a1');
    const history = createTabHistory(win, keys);
    history.push('combat');
    win.go(-1);

    history.push('disciplines');

    expect(win.entries.map((entry) => new URL(entry).search)).toEqual(['?id=a1', '?id=a1&tab=disciplines']);
  });
});
