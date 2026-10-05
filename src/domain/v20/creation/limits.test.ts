import { describe, expect, test } from 'vitest';
import { blankBuild } from './build';
import { freebieBudget, limits, violations } from './limits';

describe('blankBuild', () => {
  const build = blankBuild('abc');

  test('is a version 1 V20 build with the given id', () => {
    expect(build.id).toBe('abc');
    expect(build.system).toBe('v20');
    expect(build.kind).toBe('build');
    expect(build.schemaVersion).toBe(1);
  });

  test('starts at 13th generation with no extra freebie points', () => {
    expect(build.settings).toEqual({ baseGeneration: 13, extraFreebies: 0 });
  });
});

describe('limits', () => {
  const at = (baseGeneration: number) => ({
    ...blankBuild('abc'),
    settings: { baseGeneration, extraFreebies: 0 },
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
  ])('at %ith generation: max trait %i, blood pool %i, %i blood per turn', (generation, maxTrait, bloodPoolMax, bloodPerTurn) => {
    expect(limits(at(generation))).toEqual({ generation, maxTrait, bloodPoolMax, bloodPerTurn });
  });

  test.each([3, 14, 0, 9.5])('has no row for generation %s', (generation) => {
    expect(() => limits(at(generation))).toThrow();
  });
});

describe('freebieBudget', () => {
  const withExtra = (extraFreebies: number) => ({
    ...blankBuild('abc'),
    settings: { baseGeneration: 13, extraFreebies },
  });

  test('is 15 with no extra freebie points', () => {
    expect(freebieBudget(blankBuild('abc'))).toBe(15);
  });

  test.each([
    [20, 35],
    [75, 90],
    [999, 1014],
  ])('is 15 plus %i extra = %i', (extra, budget) => {
    expect(freebieBudget(withExtra(extra))).toBe(budget);
  });
});

describe('violations', () => {
  test('a blank build breaks no rule', () => {
    expect(violations(blankBuild('abc'))).toEqual([]);
  });
});
