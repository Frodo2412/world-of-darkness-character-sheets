import { describe, expect, test } from 'vitest';
import { CALLED_SHOTS, RANGE_BANDS } from './modifiers';

describe('CALLED_SHOTS', () => {
  test('is the Targeting table: Medium +1 / none, Small +2 / +1, Precise +3 / +2', () => {
    expect(CALLED_SHOTS.map(({ key, label, examples, difficulty, damage, page }) => ({ key, label, examples, difficulty, damage, page }))).toEqual([
      { key: 'medium', label: 'Medium', examples: 'limb, briefcase', difficulty: 1, damage: 0, page: 274 },
      { key: 'small', label: 'Small', examples: 'hand, head, cellphone', difficulty: 2, damage: 1, page: 274 },
      { key: 'precise', label: 'Precise', examples: 'eye, heart, lock', difficulty: 3, damage: 2, page: 274 },
    ]);
  });

  test('difficulty and damage grow with the smaller target', () => {
    const difficulties = CALLED_SHOTS.map((entry) => entry.difficulty);
    const damages = CALLED_SHOTS.map((entry) => entry.damage);

    expect(difficulties).toEqual([...difficulties].sort((a, b) => a - b));
    expect(damages).toEqual([...damages].sort((a, b) => a - b));
  });
});

describe('RANGE_BANDS', () => {
  test('is the Range maneuver: point blank 4, short range 6, long range (up to twice short) 8', () => {
    expect(RANGE_BANDS).toEqual([
      { key: 'point-blank', label: 'Point blank', reach: { withinMeters: 2 }, difficulty: 4, page: 278 },
      { key: 'short', label: 'Short range', reach: { timesRange: 1 }, difficulty: 6, page: 278 },
      { key: 'long', label: 'Long range', reach: { timesRange: 2 }, difficulty: 8, page: 278 },
    ]);
  });
});
