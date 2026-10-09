import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createUndoWindow, removedText, UNDO_MS } from './undoWindow';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('removedText', () => {
  it('names what was removed and offers Undo', () => {
    expect(removedText('Allies')).toBe('Removed Allies. Undo');
  });
});

describe('createUndoWindow', () => {
  it('holds a removal for ten seconds', () => {
    expect(UNDO_MS).toBe(10_000);
    const seen: (string | undefined)[] = [];
    const window = createUndoWindow((held) => seen.push(held));
    window.hold('Allies', vi.fn());
    vi.advanceTimersByTime(9_999);
    expect(seen).toEqual(['Allies']);
    vi.advanceTimersByTime(1);
    expect(seen).toEqual(['Allies', undefined]);
  });

  it('cannot undo once it has expired', () => {
    const restore = vi.fn();
    const window = createUndoWindow(() => {});
    window.hold('Allies', restore);
    vi.advanceTimersByTime(UNDO_MS);
    expect(window.undo()).toBe(false);
    expect(restore).not.toHaveBeenCalled();
  });

  it('restores once and clears the notice', () => {
    const restore = vi.fn();
    const seen: (string | undefined)[] = [];
    const window = createUndoWindow((held) => seen.push(held));
    window.hold('Allies', restore);
    expect(window.undo()).toBe(true);
    expect(window.undo()).toBe(false);
    expect(restore).toHaveBeenCalledTimes(1);
    expect(seen).toEqual(['Allies', undefined]);
  });

  it('forgets the earlier removal when a later one is held', () => {
    const first = vi.fn();
    const second = vi.fn();
    const seen: (string | undefined)[] = [];
    const window = createUndoWindow((held) => seen.push(held));
    window.hold('Allies', first);
    window.hold('Contacts', second);
    expect(seen).toEqual(['Allies', 'Contacts']);
    window.undo();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('gives the later removal its own ten seconds', () => {
    const second = vi.fn();
    const window = createUndoWindow(() => {});
    window.hold('Allies', vi.fn());
    vi.advanceTimersByTime(6_000);
    window.hold('Contacts', second);
    vi.advanceTimersByTime(6_000);
    expect(window.undo()).toBe(true);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('has nothing to undo before anything is held', () => {
    expect(createUndoWindow(() => {}).undo()).toBe(false);
  });
});
