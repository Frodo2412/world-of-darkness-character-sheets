import type { RatingControl } from '../../components/controls/rating-control';
import { BACKGROUND_DOTS } from '../../domain/v20/backgrounds/cards';
import { drawRating } from '../../scripts/sheet/ratingDraw';
import { field, setText } from '../../scripts/dossier/dom';

/** What a rated entry's dots show. */
export interface DotsView {
  /** Names the dots to assistive technology, with the rating: "Allies 2 of 5". */
  name: string;
  /** The rating as stored. */
  rating: number;
  /** The rating as dots, at most five. */
  dots: number;
}

/**
 * Draws the entry's read-only dots (`data-field="dots"`) and, beside them, the stored rating when it
 * is more than the dots can show (`data-field="overflow"`).
 */
export function drawDots(item: HTMLElement, ref: string, { name, rating, dots }: DotsView): void {
  drawRating(field(item, 'dots') as RatingControl, { ref, label: name, value: dots, storedMax: BACKGROUND_DOTS, mode: 'play' });
  const overflow = field(item, 'overflow');
  setText(overflow, rating > BACKGROUND_DOTS ? `Rating ${rating}` : '');
  overflow.hidden = overflow.textContent === '';
}
