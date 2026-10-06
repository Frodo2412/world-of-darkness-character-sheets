import type { RatingControl } from '../../components/controls/rating-control';
import { setAttr } from './draw';
import type { SheetMode } from './mode';

export interface RatingView {
  ref: string;
  /** What the rating is called: the slider's name, and the start of a read-only rating's. */
  label: string;
  value: number;
  storedMax: number;
  mode: SheetMode;
}

/** The dots the frame draws: an attribute or ability drawn read-only has room for this many when its rating fits, else all ten. */
export const PLAY_SCALE_DOTS = 5;

const hasPlayScale = (ref: string): boolean => /^(attributes|abilities|customAbilities)\./.test(ref);

/** Draws a rating for the mode: a slider to edit, an image with a text alternative to play. */
export function drawRating(rating: RatingControl, { ref, label, value, storedMax, mode }: RatingView): void {
  const readonly = mode === 'play';
  setAttr(rating, 'max', String(readonly && hasPlayScale(ref) && value <= PLAY_SCALE_DOTS ? PLAY_SCALE_DOTS : storedMax));
  setAttr(rating, 'name', label);
  rating.value = value;
  rating.toggleAttribute('readonly', readonly);
  if (!readonly) setAttr(rating, 'aria-label', label);
}
