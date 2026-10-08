// How a character's identity reads on the play view: wording only, no rules.

import type { V20Character } from './character';
import { generationNumber } from './generations';
import { withoutAccents } from './text';

/** "1st", "2nd", "3rd", "4th", "11th", "21st": English ordinal suffixes. */
export function ordinal(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

/** "10th generation" when a number is readable, else the text as typed; empty when blank. */
export function generationLabel(text: string): string {
  const number = generationNumber(text);
  return number === undefined ? text.trim() : `${ordinal(number)} generation`;
}

/** The first letters of the first and last words, without accents: "Éloïse Voss" is "EV". */
export function monogram(name: string): string {
  const words = withoutAccents(name).split(/\s+/).filter(Boolean);
  const ends = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return ends
    .map((word) => word.match(/[\p{L}\p{N}]/u)?.[0] ?? '')
    .join('')
    .toUpperCase();
}

const SUMMARY_SEPARATOR = ' · ';
const TEMPERAMENT_SEPARATOR = ' / ';

const joinNonBlank = (parts: readonly string[], separator: string): string =>
  parts.map((part) => part.trim()).filter((part) => part !== '').join(separator);

/** Clan, generation and concept on one line, leaving out whichever is blank. */
export function identitySummary(character: V20Character): string {
  const { clan, generation, concept } = character.header;
  return joinNonBlank([clan, generationLabel(generation), concept], SUMMARY_SEPARATOR);
}

/** A build's clan and concept on one line; a build has no generation yet. */
export function buildSummary(clan: string, concept: string): string {
  return joinNonBlank([clan, concept], SUMMARY_SEPARATOR);
}

/** Nature and Demeanor on one line, leaving out whichever is blank. */
export function temperament(character: V20Character): string {
  const { nature, demeanor } = character.header;
  return temperamentOf(nature, demeanor);
}

/** Nature and Demeanor on one line from plain text, for a build as well as a character. */
export function temperamentOf(nature: string, demeanor: string): string {
  return joinNonBlank([nature, demeanor], TEMPERAMENT_SEPARATOR);
}

/** "1 die", "0 dice", "7 dice". */
export function diceLabel(count: number): string {
  return `${count} ${count === 1 ? 'die' : 'dice'}`;
}
