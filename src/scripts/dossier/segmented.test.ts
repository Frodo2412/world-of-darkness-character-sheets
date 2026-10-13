import { describe, expect, it } from 'vitest';
import { segmentFocusTarget } from './segmented';

describe('segmentFocusTarget', () => {
  it('moves to the next segment on ArrowRight and the previous on ArrowLeft, wrapping at the ends', () => {
    expect(segmentFocusTarget('ArrowRight', 0, 3)).toBe(1);
    expect(segmentFocusTarget('ArrowLeft', 1, 3)).toBe(0);
    expect(segmentFocusTarget('ArrowRight', 2, 3)).toBe(0);
    expect(segmentFocusTarget('ArrowLeft', 0, 3)).toBe(2);
  });

  it('goes to the first segment on Home and the last on End', () => {
    expect(segmentFocusTarget('Home', 2, 3)).toBe(0);
    expect(segmentFocusTarget('End', 0, 3)).toBe(2);
  });

  it('leaves Enter and Space to the button, which presses itself', () => {
    expect(segmentFocusTarget('Enter', 1, 3)).toBeUndefined();
    expect(segmentFocusTarget(' ', 1, 3)).toBeUndefined();
  });

  it('leaves every other key alone', () => {
    for (const key of ['Tab', 'ArrowUp', 'ArrowDown', 'a']) {
      expect(segmentFocusTarget(key, 1, 3)).toBeUndefined();
    }
  });
});
