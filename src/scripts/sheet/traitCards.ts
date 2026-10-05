import type { RatingControl } from '../../components/controls/rating-control';
import { namedRow, traitValue, type V20Character } from '../../domain/v20/character';
import { namedRows } from '../../domain/v20/identity';
import { RATING_RANGE, type NamedRowRef, type TraitRef } from '../../domain/v20/traits';
import { show } from './draw';
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
}

/**
 * Draws the number beside each trait's dots, and the play row of each named custom
 * ability. The dots themselves are drawn with the rest of the ratings.
 */
export function drawTraitCards(root: ParentNode, character: V20Character): void {
  for (const row of root.querySelectorAll<HTMLElement>('[data-trait-key]')) {
    const key = row.dataset.traitKey!;
    if (isCustomAbility(key)) {
      drawCustomAbility(row, key, character);
    } else {
      show(row, 'trait.number', String(traitValue(character, key as TraitRef)));
    }
  }
}
