import type { RatingControl } from '../../components/controls/rating-control';
import type { SheetMode } from './mode';

export interface RatingView {
  ref: string;
  /** What the rating is called: the slider's name, and the start of a read-only rating's. */
  label: string;
  value: number;
  storedMax: number;
  mode: SheetMode;
}

// Until the live resources are rebuilt, temporary Willpower and Blood Pool stay
// editable in play mode.
const LIVE_IN_PLAY: readonly string[] = ['willpower.temporary', 'bloodPool.current'];

// An attribute or ability drawn read-only has room for five dots when its rating
// fits in five, else all ten.
const hasPlayScale = (ref: string): boolean => /^(attributes|abilities|customAbilities)\./.test(ref);

// Leave a matching attribute alone so a redraw does not restart what it drives.
function setAttr(element: Element, name: string, value: string): void {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

/** Draws a rating for the mode: a slider to edit, an image with a text alternative to play. */
export function drawRating(rating: RatingControl, { ref, label, value, storedMax, mode }: RatingView): void {
  if (LIVE_IN_PLAY.includes(ref)) {
    rating.value = value;
    return;
  }
  const readonly = mode === 'play';
  setAttr(rating, 'max', String(readonly && hasPlayScale(ref) && value <= 5 ? 5 : storedMax));
  setAttr(rating, 'name', label);
  rating.value = value;
  rating.toggleAttribute('readonly', readonly);
  if (!readonly) setAttr(rating, 'aria-label', label);
}
