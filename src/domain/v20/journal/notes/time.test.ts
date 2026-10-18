import { describe, expect, test } from 'vitest';
import { clockTime, noteTime, savedStatus } from './time';

const at = (month: number, day: number, hour = 0, minute = 0): number => new Date(2026, month - 1, day, hour, minute).getTime();

describe('note times', () => {
  test('the clock is two digits each, local time', () => {
    expect(clockTime(at(3, 14, 23, 42))).toBe('23:42');
    expect(clockTime(at(3, 14, 0, 5))).toBe('00:05');
  });

  test('a note from today shows the clock', () => {
    expect(noteTime(at(3, 14, 9, 30), at(3, 14, 23, 59))).toBe('09:30');
  });

  test('a note from another day shows the date', () => {
    expect(noteTime(at(3, 14, 23, 42), at(3, 15, 0, 1))).toBe('14 Mar');
    expect(noteTime(at(12, 1, 8, 0), at(12, 31, 8, 0))).toBe('1 Dec');
  });

  test('the saved status names the time', () => {
    expect(savedStatus(at(3, 14, 23, 42))).toBe('All changes saved · 23:42');
  });
});
