import { describe, expect, test } from 'vitest';
import { savedLabel } from './autosave';

describe('savedLabel', () => {
  test.each([
    [0, 'Saved just now'],
    [59_999, 'Saved just now'],
    [60_000, 'Saved 1 min ago'],
    [90_000, 'Saved 1 min ago'],
    [119_999, 'Saved 1 min ago'],
    [120_000, 'Saved 2 min ago'],
    [61 * 60_000, 'Saved 61 min ago'],
  ])('after %i ms it reads %j', (elapsed, label) => {
    expect(savedLabel(elapsed)).toBe(label);
  });

  test('a clock that has gone backwards still reads "just now"', () => {
    expect(savedLabel(-5_000)).toBe('Saved just now');
  });
});
