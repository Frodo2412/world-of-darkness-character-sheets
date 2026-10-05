// How a character's identity reads on the play view: wording only, no rules.

import type { V20Character } from './character';

/** "1st", "2nd", "3rd", "4th", "11th", "21st": English ordinal suffixes. */
export function ordinal(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

/** The first whole number in what the player typed ("10", "10th", "3rd generation"), if any. */
export function generationNumber(text: string): number | undefined {
  const digits = text.match(/\d+/);
  return digits ? Number(digits[0]) : undefined;
}

/** "10th generation" when a number is readable, else the text as typed; empty when blank. */
export function generationLabel(text: string): string {
  const number = generationNumber(text);
  return number === undefined ? text.trim() : `${ordinal(number)} generation`;
}

/** The first letters of the first and last words, without accents: "Éloïse Voss" is "EV". */
export function monogram(name: string): string {
  // Recompose after stripping marks so scripts such as Hangul are not left decomposed.
  const words = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .normalize('NFC')
    .split(/\s+/)
    .filter(Boolean);
  const ends = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return ends
    .map((word) => word.match(/[\p{L}\p{N}]/u)?.[0] ?? '')
    .join('')
    .toUpperCase();
}

const joinNonBlank = (parts: readonly string[], separator: string): string =>
  parts.map((part) => part.trim()).filter((part) => part !== '').join(separator);

/** Clan, generation and concept on one line, leaving out whichever is blank. */
export function identitySummary(character: V20Character): string {
  const { clan, generation, concept } = character.header;
  return joinNonBlank([clan, generationLabel(generation), concept], ' · ');
}

/** Nature and Demeanor on one line, leaving out whichever is blank. */
export function temperament(character: V20Character): string {
  const { nature, demeanor } = character.header;
  return joinNonBlank([nature, demeanor], ' / ');
}
