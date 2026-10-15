// What Level up can raise: a trait of the character, named the way the sheet names its ratings.

import { namedRow, setNamedRow, setTrait, traitValue, type V20Character } from '../character';
import { ABILITY_GROUPS, ATTRIBUTE_GROUPS, VIRTUES, VIRTUE_RANGE, RATING_RANGE, type AbilityKey, type AttributeKey, type VirtueKey } from '../traits';

export type SubjectKind = 'attribute' | 'ability' | 'discipline' | 'virtue' | 'humanity' | 'willpower';

export type Subject =
  | `attributes.${AttributeKey}`
  | `abilities.${AbilityKey}`
  | `virtues.${VirtueKey}`
  | 'humanity.rating'
  | 'willpower.permanent'
  | `disciplines.${number}`;

export function subjectKind(subject: Subject): SubjectKind {
  if (subject.startsWith('attributes.')) return 'attribute';
  if (subject.startsWith('abilities.')) return 'ability';
  if (subject.startsWith('disciplines.')) return 'discipline';
  if (subject.startsWith('virtues.')) return 'virtue';
  return subject === 'humanity.rating' ? 'humanity' : 'willpower';
}

/** The highest a rating goes by the standard rules: five dots, or ten for Humanity / Path and Willpower. */
export const MOST_BY_KIND: Readonly<Record<SubjectKind, number>> = {
  attribute: 5,
  ability: 5,
  discipline: 5,
  virtue: VIRTUE_RANGE.max,
  humanity: RATING_RANGE.max,
  willpower: RATING_RANGE.max,
};

export const subjectMaximum = (subject: Subject): number => MOST_BY_KIND[subjectKind(subject)];

const LABELS = new Map<string, string>([
  ...ATTRIBUTE_GROUPS.flatMap((group) => group.traits.map((trait): [string, string] => [`attributes.${trait.key}`, trait.label])),
  ...ABILITY_GROUPS.flatMap((group) => group.traits.map((trait): [string, string] => [`abilities.${trait.key}`, trait.label])),
  // The sheet pairs two names for each of the first two virtues; Level up uses the first.
  ...VIRTUES.map((virtue): [string, string] => [`virtues.${virtue.key}`, virtue.label.split('/')[0]]),
  ['humanity.rating', 'Humanity'],
  ['willpower.permanent', 'Willpower (perm.)'],
]);

/** What the trait is called on Level up. A Discipline is called by the name the player gave it. */
export function subjectLabel(character: V20Character, subject: Subject): string {
  if (subject.startsWith('disciplines.')) return namedRow(character, subject as `disciplines.${number}`)?.name.trim() ?? '';
  return LABELS.get(subject) ?? subject;
}

/** The rating now, or undefined for a Discipline row that is not there. */
export function subjectRating(character: V20Character, subject: Subject): number | undefined {
  if (subject.startsWith('disciplines.')) return namedRow(character, subject as `disciplines.${number}`)?.rating;
  return traitValue(character, subject as Parameters<typeof traitValue>[1]);
}

/** The character with the rating set. */
export function setSubjectRating(character: V20Character, subject: Subject, rating: number): V20Character {
  if (subject.startsWith('disciplines.')) return setNamedRow(character, subject as `disciplines.${number}`, { rating });
  return setTrait(character, subject as Parameters<typeof setTrait>[1], rating);
}
