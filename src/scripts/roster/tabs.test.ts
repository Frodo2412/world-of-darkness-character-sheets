import { describe, expect, it } from 'vitest';
import { nextTab } from './tabs';

describe('nextTab', () => {
  it('moves to the next tab on ArrowRight and the previous on ArrowLeft', () => {
    expect(nextTab('ArrowRight', 1, 4)).toBe(2);
    expect(nextTab('ArrowLeft', 2, 4)).toBe(1);
  });

  it('wraps from the last tab to the first on ArrowRight', () => {
    expect(nextTab('ArrowRight', 3, 4)).toBe(0);
  });

  it('wraps from the first tab to the last on ArrowLeft', () => {
    expect(nextTab('ArrowLeft', 0, 4)).toBe(3);
  });

  it('goes to the first tab on Home and the last on End, from anywhere', () => {
    expect(nextTab('Home', 2, 4)).toBe(0);
    expect(nextTab('Home', 0, 4)).toBe(0);
    expect(nextTab('End', 1, 4)).toBe(3);
    expect(nextTab('End', 3, 4)).toBe(3);
  });

  it('leaves the tab alone for any other key', () => {
    for (const key of ['Tab', 'Enter', ' ', 'ArrowUp', 'ArrowDown', 'a', 'PageDown']) {
      expect(nextTab(key, 2, 4)).toBe(2);
    }
  });

  it('stays on the only tab whatever the key', () => {
    for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End', 'Tab']) {
      expect(nextTab(key, 0, 1)).toBe(0);
    }
  });
});
