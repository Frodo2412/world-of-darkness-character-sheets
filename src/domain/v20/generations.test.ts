import { describe, expect, test } from 'vitest';
import { generationNumber } from './generations';

describe('generationNumber', () => {
  test.each([
    ['10', 10],
    ['10th', 10],
    ['3rd', 3],
    [' 9th generation ', 9],
    ['between 8 and 9', 8],
  ])('reads %j as %i', (text, expected) => {
    expect(generationNumber(text)).toBe(expected);
  });

  test.each(['', '   ', 'banana'])('finds no number in %j', (text) => {
    expect(generationNumber(text)).toBeUndefined();
  });
});
