import { describe, expect, it } from 'vitest';
import { isPlainClick, scrollToShow, tabKeyAction } from './tabBar';

describe('tabKeyAction', () => {
  it('moves focus to the next tab on ArrowRight and the previous on ArrowLeft', () => {
    expect(tabKeyAction('ArrowRight', 1, 4)).toEqual({ kind: 'focus', index: 2 });
    expect(tabKeyAction('ArrowLeft', 2, 4)).toEqual({ kind: 'focus', index: 1 });
  });

  it('wraps around at either end', () => {
    expect(tabKeyAction('ArrowRight', 3, 4)).toEqual({ kind: 'focus', index: 0 });
    expect(tabKeyAction('ArrowLeft', 0, 4)).toEqual({ kind: 'focus', index: 3 });
  });

  it('goes to the first tab on Home and the last on End', () => {
    expect(tabKeyAction('Home', 2, 4)).toEqual({ kind: 'focus', index: 0 });
    expect(tabKeyAction('End', 1, 4)).toEqual({ kind: 'focus', index: 3 });
  });

  it('activates on Enter and on Space', () => {
    expect(tabKeyAction('Enter', 1, 4)).toEqual({ kind: 'activate' });
    expect(tabKeyAction(' ', 1, 4)).toEqual({ kind: 'activate' });
  });

  it('leaves every other key alone, Tab included', () => {
    for (const key of ['Tab', 'ArrowUp', 'ArrowDown', 'a', 'PageDown', 'Escape']) {
      expect(tabKeyAction(key, 1, 4)).toBeUndefined();
    }
  });
});

describe('isPlainClick', () => {
  const click = { button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false };

  it('is a primary click with no modifier', () => {
    expect(isPlainClick(click)).toBe(true);
  });

  it('is not a middle click or a click with ctrl, cmd, shift or alt, which belong to the browser', () => {
    expect(isPlainClick({ ...click, button: 1 })).toBe(false);
    expect(isPlainClick({ ...click, ctrlKey: true })).toBe(false);
    expect(isPlainClick({ ...click, metaKey: true })).toBe(false);
    expect(isPlainClick({ ...click, shiftKey: true })).toBe(false);
    expect(isPlainClick({ ...click, altKey: true })).toBe(false);
  });
});

describe('scrollToShow', () => {
  const view = { scrollLeft: 100, width: 300 };

  it('stays put when the tab is already in view', () => {
    expect(scrollToShow({ left: 150, width: 80 }, view)).toBe(100);
  });

  it('scrolls back until a tab left of the view starts at its edge', () => {
    expect(scrollToShow({ left: 40, width: 80 }, view)).toBe(40);
  });

  it('scrolls on until a tab right of the view ends at its edge', () => {
    expect(scrollToShow({ left: 380, width: 80 }, view)).toBe(160);
  });
});
