import { describe, expect, test } from 'vitest';
import * as rules from './rules';
import { GENERATION_TABLE, STANDARD_FREEBIE_BUDGET } from './rules';

describe('generation table', () => {
  test('has one row for each generation from 4th to 13th, most potent first', () => {
    expect(GENERATION_TABLE.map((row) => row.generation)).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  test.each([
    [13, 5, 10, 1],
    [12, 5, 11, 1],
    [11, 5, 12, 1],
    [10, 5, 13, 1],
    [9, 5, 14, 2],
    [8, 5, 15, 3],
    [7, 6, 20, 4],
    [6, 7, 30, 6],
    [5, 8, 40, 8],
    [4, 9, 50, 10],
  ])('%ith generation: max trait %i, blood pool %i, %i blood per turn', (generation, maxTrait, bloodPoolMax, bloodPerTurn) => {
    expect(GENERATION_TABLE.find((row) => row.generation === generation)).toEqual({
      generation,
      maxTrait,
      bloodPoolMax,
      bloodPerTurn,
    });
  });
});

test('every build starts with 15 freebie points', () => {
  expect(STANDARD_FREEBIE_BUDGET).toBe(15);
});

test('rules.ts exports data only, no functions', () => {
  const functions = Object.entries(rules).filter(([, value]) => typeof value === 'function');
  expect(functions).toEqual([]);
});
