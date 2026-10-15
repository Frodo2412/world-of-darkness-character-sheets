import { describe, expect, test } from 'vitest';
import { pointTotal } from './points';

describe('pointTotal', () => {
  test('is 0 for no entries', () => {
    expect(pointTotal([])).toBe(0);
  });

  test('is the one entry for one', () => {
    expect(pointTotal([{ points: 3 }])).toBe(3);
  });

  test('adds many', () => {
    expect(pointTotal([{ points: 1 }, { points: 2 }, { points: 5 }])).toBe(8);
  });

  test('counts entries worth nothing', () => {
    expect(pointTotal([{ points: 0 }, { points: 2 }])).toBe(2);
  });
});
