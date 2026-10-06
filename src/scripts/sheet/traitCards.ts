import type { RatingControl } from '../../components/controls/rating-control';
import { namedRow, traitValue, type V20Character } from '../../domain/v20/character';
import { namedRows } from '../../domain/v20/identity';
import { RATING_RANGE, type NamedRowRef, type TraitRef } from '../../domain/v20/traits';
import { show } from './draw';
import type { SheetMode } from './mode';
import { drawRating } from './ratingDraw';

const isCustomAbility = (key: string): key is NamedRowRef => key.startsWith('customAbilities.');

// A custom ability's play row is shown only once the player has named it.
function drawCustomAbility(row: HTMLElement, key: NamedRowRef, character: V20Character): void {
  const [named] = namedRows([namedRow(character, key)!]);
  row.hidden = named === undefined;
  if (named === undefined) return;

  show(row, 'trait.name', named.name);
  show(row, 'trait.number', String(named.rating));
  // Always read-only: the write-in row beside it is what edits this rating.
  drawRating(row.querySelector<RatingControl>('dot-rating')!, {
    ref: key,
    label: named.name,
    value: named.rating,
    storedMax: RATING_RANGE.max,
    mode: 'play',
  });
  describeValue(row, named.rating);
}

// The value the name button is described by, on the scale its dots drew: "4 of 5", "6 of 10".
function describeValue(row: HTMLElement, value: number): void {
  show(row, 'trait.value', `${value} of ${row.querySelector<RatingControl>('dot-rating')!.max}`);
}

/**
 * While the name button is live, it carries the name and, as its description, the
 * value: the dots are then not read out a second time. Editing exposes the slider.
 */
function drawSelectable(row: HTMLElement, mode: SheetMode): void {
  const dots = row.querySelector('dot-rating');
  if (row.querySelector('.trait-select') === null || dots === null) return;
  if (mode === 'play') dots.setAttribute('aria-hidden', 'true');
  else dots.removeAttribute('aria-hidden');
}

/**
 * Draws the number beside each trait's dots, and the play row of each named custom
 * ability. The dots themselves are drawn with the rest of the ratings.
 */
export function drawTraitCards(root: ParentNode, character: V20Character, mode: SheetMode): void {
  for (const row of root.querySelectorAll<HTMLElement>('[data-trait-key]')) {
    const key = row.dataset.traitKey!;
    if (isCustomAbility(key)) {
      drawCustomAbility(row, key, character);
    } else {
      const value = traitValue(character, key as TraitRef);
      show(row, 'trait.number', String(value));
      describeValue(row, value);
    }
    drawSelectable(row, mode);
  }
}
