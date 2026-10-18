// What the Award XP field accepts, and what the player is told about an award. One object holds every
// message so the page and the tests say the same words.

import { MINUS_SIGN } from '../../text';

export const AWARD_MESSAGES = {
  /** Shown beside the field for an empty, zero, fractional or non-numeric entry. */
  invalid: 'Enter a whole number of XP, other than 0.',
  /** Said once an award is stored: "3 XP awarded. Available 8." */
  awarded: (amount: number, available: number): string => `${amount} XP awarded. Available ${figure(available)}.`,
  /** Said when a negative award takes points back: "2 XP taken back. Available 6." */
  takenBack: (amount: number, available: number): string => `${Math.abs(amount)} XP taken back. Available ${figure(available)}.`,
} as const;

/** A figure as the page writes it: a true minus sign for a negative one. */
export const figure = (n: number): string => (n < 0 ? `${MINUS_SIGN}${Math.abs(n)}` : String(n));

/** An amount with its sign always shown: "+3", "−2". */
export const signedFigure = (n: number): string => (n < 0 ? figure(n) : `+${n}`);

export type AwardEntry = { ok: true; amount: number } | { ok: false; message: string };

/** A whole number of points, negative allowed, written with a plain or true minus sign or a plus sign. */
const WHOLE = /^[+\-−]?\d+$/;

/** Reads what was typed in the amount field. Zero is not an award, and neither is anything that is not a whole number. */
export function validateAward(text: string): AwardEntry {
  const typed = text.trim();
  if (!WHOLE.test(typed)) return { ok: false, message: AWARD_MESSAGES.invalid };
  const amount = Number(typed.replace(MINUS_SIGN, '-'));
  return Number.isSafeInteger(amount) && amount !== 0 ? { ok: true, amount } : { ok: false, message: AWARD_MESSAGES.invalid };
}

/** What is announced after an award of `amount` leaves `available` to spend. */
export const awardAnnouncement = (amount: number, available: number): string =>
  amount < 0 ? AWARD_MESSAGES.takenBack(amount, available) : AWARD_MESSAGES.awarded(amount, available);
