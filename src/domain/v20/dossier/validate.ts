// Whether stored Backgrounds-tab data is usable as stored. A damaged field is
// reported by the store, never repaired.

import { BACKGROUND_ROWS } from '../traits';
import { isNumber, isText, listOf, objectOf, oneOf, optional, type Check } from '../shape';
import { HAVEN_KINDS, MERIT_CATEGORIES } from './types';

const person = objectOf({ name: isText, role: isText });

const backgroundRow = objectOf({
  name: isText,
  rating: isNumber,
  summary: optional(isText),
  note: optional(isText),
  people: optional(listOf(person)),
});

const pointedTrait = objectOf({
  name: isText,
  category: oneOf(MERIT_CATEGORIES),
  points: isNumber,
  note: isText,
});

/** The background rows: at least the six the sheet shows, and any number more. */
export const validBackgrounds: Check = (value) =>
  Array.isArray(value) && value.length >= BACKGROUND_ROWS && value.every(backgroundRow);

export const validMerits: Check = listOf(pointedTrait);
export const validFlaws: Check = listOf(pointedTrait);

export const validOtherTraits: Check = listOf(
  objectOf({ name: isText, rating: optional(isNumber), kind: isText, note: isText }),
);

export const validHavens: Check = listOf(
  objectOf({
    name: isText,
    kind: oneOf(HAVEN_KINDS),
    description: isText,
    location: isText,
    access: isText,
    security: isText,
  }),
);
