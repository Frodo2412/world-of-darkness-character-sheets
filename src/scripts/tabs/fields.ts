import type { RatingChange, RatingControl } from '../../components/controls/rating-control';
import {
  namedRow,
  setNamedRow,
  setSpecialty,
  setText,
  setTrait,
  specialtyText,
  textValue,
  traitValue,
  type V20Character,
} from '../../domain/v20/character';
import {
  RATING_RANGE,
  rangeOf,
  type NamedRowRef,
  type SpecialtyRef,
  type TextRef,
  type TraitRef,
} from '../../domain/v20/traits';
import { lookupAll } from '../sheet/draw';
import type { SheetMode } from '../sheet/mode';
import { drawRating } from '../sheet/ratingDraw';
import type { Apply } from './context';
import { showText } from './showText';

// The editable fields of the character record: text, ratings, write-in rows and specialties.
// Each function works on the fields under `root`, so the shell can take its own parts of the page
// (identity, resources) and a tab its panel with the same code.

const textFieldOf = (input: HTMLInputElement): TextRef => input.dataset.text as TextRef;

const traitOf = (rating: RatingControl): TraitRef => rating.dataset.trait as TraitRef;

function drawTextInputs(root: ParentNode, character: V20Character): void {
  for (const input of lookupAll<HTMLInputElement>(root, '[data-text]')) {
    showText(input, textValue(character, textFieldOf(input)));
  }
}

function drawTraitRatings(root: ParentNode, character: V20Character, mode: SheetMode): void {
  for (const rating of lookupAll<RatingControl>(root, '[data-trait]')) {
    const ref = traitOf(rating);
    drawRating(rating, {
      ref,
      label: rating.dataset.label ?? '',
      value: traitValue(character, ref),
      storedMax: rangeOf(ref).max,
      mode,
    });
  }
}

function drawRowNames(root: ParentNode, character: V20Character): void {
  for (const input of lookupAll<HTMLInputElement>(root, '[data-row-name]')) {
    showText(input, namedRow(character, input.dataset.rowName as NamedRowRef)?.name ?? '');
  }
}

function drawSpecialties(root: ParentNode, character: V20Character): void {
  for (const input of lookupAll<HTMLInputElement>(root, '[data-specialty]')) {
    showText(input, specialtyText(character, input.dataset.specialty as SpecialtyRef));
  }
}

function drawRowRatings(root: ParentNode, character: V20Character, mode: SheetMode): void {
  for (const rating of lookupAll<RatingControl>(root, '[data-row-rating]')) {
    const ref = rating.dataset.rowRating as NamedRowRef;
    const row = namedRow(character, ref);
    if (row === undefined) continue;
    // A write-in rating is announced with the name the player gave it.
    const label = rating.dataset.label!;
    const name = row.name.trim();
    drawRating(rating, {
      ref,
      label: name ? `${label}: ${name}` : label,
      value: row.rating,
      storedMax: RATING_RANGE.max,
      mode,
    });
  }
}

/** Draws every field under `root` from the character. */
export function drawFields(root: ParentNode, character: V20Character, mode: SheetMode): void {
  drawTextInputs(root, character);
  drawTraitRatings(root, character, mode);
  drawRowNames(root, character);
  drawSpecialties(root, character);
  drawRowRatings(root, character, mode);
}

/** Sends every edit to a field under `root` through `apply`. */
export function bindFields(root: ParentNode, apply: Apply): void {
  for (const input of lookupAll<HTMLInputElement>(root, '[data-text]')) {
    input.addEventListener('input', () => {
      apply((current) => setText(current, textFieldOf(input), input.value));
    });
  }
  for (const rating of lookupAll<RatingControl>(root, '[data-trait]')) {
    rating.addEventListener('change', (event) => {
      const { value } = (event as CustomEvent<RatingChange>).detail;
      apply((current) => setTrait(current, traitOf(rating), value));
    });
  }
  for (const input of lookupAll<HTMLInputElement>(root, '[data-row-name]')) {
    input.addEventListener('input', () => {
      const row = input.dataset.rowName as NamedRowRef;
      apply((current) => setNamedRow(current, row, { name: input.value }));
    });
  }
  for (const input of lookupAll<HTMLInputElement>(root, '[data-specialty]')) {
    input.addEventListener('input', () => {
      apply((current) => setSpecialty(current, input.dataset.specialty as SpecialtyRef, input.value));
    });
  }
  for (const rating of lookupAll<RatingControl>(root, '[data-row-rating]')) {
    rating.addEventListener('change', (event) => {
      const row = rating.dataset.rowRating as NamedRowRef;
      const { value } = (event as CustomEvent<RatingChange>).detail;
      apply((current) => setNamedRow(current, row, { rating: value }));
    });
  }
}
