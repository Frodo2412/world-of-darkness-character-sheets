import { describe, expect, test } from 'vitest';
import { blankBuild } from './build';
import { setBaseGeneration, setExtraFreebies } from './updates';

describe('setBaseGeneration', () => {
  const build = blankBuild('abc');

  test.each([4, 5, 6, 7, 8, 9, 10, 11, 12, 13])('accepts %ith generation', (generation) => {
    const result = setBaseGeneration(build, generation);
    expect(result).toEqual({
      status: 'applied',
      build: { ...build, settings: { ...build.settings, baseGeneration: generation } },
      notices: [],
    });
  });

  test.each([3, 14, 0, -1, 10.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'refuses %s with a sentence naming the range and hands back the same build',
    (generation) => {
      const result = setBaseGeneration(build, generation);
      expect(result.status).toBe('refused');
      expect(result.build).toBe(build);
      expect(result).toMatchObject({ reason: 'Base generation must be a whole number from 4th to 13th.' });
    },
  );

  test('does not mutate its input', () => {
    const snapshot = structuredClone(build);
    setBaseGeneration(build, 9);
    setBaseGeneration(build, 99);
    expect(build).toEqual(snapshot);
  });
});

describe('setExtraFreebies', () => {
  const build = { ...blankBuild('abc'), settings: { baseGeneration: 11, extraFreebies: 20 } };
  const reason = 'Extra freebie points must be a whole number from 0 to 999.';

  test.each([
    ['0', 0],
    ['999', 999],
    ['75', 75],
    ['007', 7],
    [' 50 ', 50],
  ])('accepts "%s" as %i, leaving the generation alone', (text, extraFreebies) => {
    expect(setExtraFreebies(build, text)).toEqual({
      status: 'applied',
      build: { ...build, settings: { baseGeneration: 11, extraFreebies } },
      notices: [],
    });
  });

  test.each(['-1', '1000', '2.5', 'lots', '', '   ', '1e3', '+5', '12abc', '99999999999999999999'])(
    'refuses "%s" with the whole-number sentence and hands back the same build',
    (text) => {
      const result = setExtraFreebies(build, text);
      expect(result.status).toBe('refused');
      expect(result.build).toBe(build);
      expect(result).toMatchObject({ reason });
    },
  );

  test('does not mutate its input', () => {
    const snapshot = structuredClone(build);
    setExtraFreebies(build, '30');
    setExtraFreebies(build, 'lots');
    expect(build).toEqual(snapshot);
  });
});
