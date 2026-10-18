import { describe, expect, test } from 'vitest';
import { AWARD_MESSAGES, awardAnnouncement, figure, signedFigure, validateAward } from './validate';

const refused = { ok: false, message: 'Enter a whole number of XP, other than 0.' };

describe('validateAward', () => {
  test.each([
    ['3', 3],
    ['  4 ', 4],
    ['+5', 5],
    ['-2', -2],
    ['−2', -2],
    ['007', 7],
    ['12', 12],
  ])('%j is %i', (text, amount) => {
    expect(validateAward(text)).toEqual({ ok: true, amount });
  });

  test.each(['', '   ', '0', '+0', '-0', '−0', '000', 'abc', '2.5', '2,5', '1e3', '3 points', '--3', '- 3', '0x10', '٣', 'NaN', 'Infinity'])(
    '%j is refused with the stated message',
    (text) => {
      expect(validateAward(text)).toEqual(refused);
    },
  );

  test('a number too large to count exactly is refused', () => {
    expect(validateAward('99999999999999999999')).toEqual(refused);
  });

  test('the message is the exact wording the page and the plan use', () => {
    expect(AWARD_MESSAGES.invalid).toBe('Enter a whole number of XP, other than 0.');
  });
});

describe('what the player is told', () => {
  test('a positive award', () => {
    expect(awardAnnouncement(3, 8)).toBe('3 XP awarded. Available 8.');
  });

  test('a correction', () => {
    expect(awardAnnouncement(-2, 6)).toBe('2 XP taken back. Available 6.');
  });

  test('available below zero uses a true minus sign', () => {
    expect(awardAnnouncement(1, -2)).toBe('1 XP awarded. Available −2.');
  });

  test('figures', () => {
    expect(figure(-2)).toBe('−2');
    expect(figure(0)).toBe('0');
    expect(signedFigure(3)).toBe('+3');
    expect(signedFigure(-3)).toBe('−3');
  });
});
