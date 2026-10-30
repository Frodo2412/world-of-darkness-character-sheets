import { describe, expect, it } from 'vitest';
import { movedTo } from './listKeys';

const key = (name: string, modifiers: { altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean } = {}) => ({
  key: name,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...modifiers,
});

describe('movedTo', () => {
  it.each([
    ['ArrowDown', 1, 2],
    ['ArrowRight', 1, 2],
    ['ArrowUp', 1, 0],
    ['ArrowLeft', 1, 0],
    ['Home', 1, 0],
    ['End', 1, 3],
  ])('takes %s from item %i to item %i of 4', (name, at, expected) => {
    expect(movedTo(key(name), at, 4)).toBe(expected);
  });

  it('wraps at both ends', () => {
    expect(movedTo(key('ArrowDown'), 3, 4)).toBe(0);
    expect(movedTo(key('ArrowUp'), 0, 4)).toBe(3);
  });

  it('ignores any other key', () => {
    expect(movedTo(key('a'), 0, 4)).toBeUndefined();
    expect(movedTo(key(' '), 0, 4)).toBeUndefined();
  });

  it.each(['altKey', 'ctrlKey', 'metaKey', 'shiftKey'] as const)('leaves the key to the browser when %s is held', (modifier) => {
    expect(movedTo(key('ArrowLeft', { [modifier]: true }), 1, 4)).toBeUndefined();
    expect(movedTo(key('Home', { [modifier]: true }), 1, 4)).toBeUndefined();
  });
});
