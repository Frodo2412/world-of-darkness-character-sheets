import type { RatingControl } from '../../components/controls/rating-control';
import { namedCustomAbility, specialtyOf, traitValue, type V20Character } from '../../domain/v20/character';
import type { PoolSelection } from '../../domain/v20/resources';
import { RATING_RANGE, type CustomAbilityRef, type SpecialtyRef, type TraitRef } from '../../domain/v20/traits';
import { lookup, lookupAll, setAttr, show } from './draw';
import type { SheetMode } from './mode';
import { PLAY_SCALE_DOTS, drawRating } from './ratingDraw';

const isCustomAbility = (key: string): key is CustomAbilityRef => key.startsWith('customAbilities.');

// A custom ability's play row is shown only once the player has named it.
function drawCustomAbility(row: HTMLElement, key: CustomAbilityRef, character: V20Character): void {
  const named = namedCustomAbility(character, key);
  const dots = lookup<RatingControl>(row, 'dot-rating');
  row.hidden = named === undefined;
  if (named === undefined) {
    // A stale ten-dot scale must not outlive the name that showed it.
    dots.setAttribute('max', String(PLAY_SCALE_DOTS));
    return;
  }

  show(row, 'trait.name', named.name);
  show(row, 'trait.number', String(named.rating));
  // Always read-only: the write-in row beside it is what edits this rating.
  drawRating(dots, {
    ref: key,
    label: named.name,
    value: named.rating,
    storedMax: RATING_RANGE.max,
    mode: 'play',
  });
  describeValue(row, named.rating);
}

const hasSpecialty = (key: string): key is SpecialtyRef => /^(attributes|abilities)\./.test(key);

// The value the name button is described by, on the scale its dots drew, and the specialty: "4 of 5, specialty Art history".
function describeValue(row: HTMLElement, value: number, specialty?: string): void {
  const rated = `${value} of ${lookup<RatingControl>(row, 'dot-rating').max}`;
  show(row, 'trait.value', specialty === undefined ? rated : `${rated}, specialty ${specialty}`);
}

/**
 * While the name button is live, it carries the name and, as its description, the
 * value: the dots are then not read out a second time. Editing exposes the slider.
 */
function drawSelectable(row: HTMLElement, mode: SheetMode): void {
  const [select] = lookupAll(row, '.trait-select');
  if (select === undefined) return;
  const dots = lookup(row, 'dot-rating');
  if (mode === 'play') dots.setAttribute('aria-hidden', 'true');
  else dots.removeAttribute('aria-hidden');
}

/** Which rows show as chosen for the dice pool: the row is filled, and its button is pressed. */
function drawSelected(row: HTMLElement, selection: PoolSelection): void {
  const key = row.dataset.traitKey;
  const selected = key === selection.attribute || key === selection.ability;
  row.classList.toggle('is-selected', selected);
  const [select] = lookupAll(row, '.trait-select');
  if (select !== undefined) setAttr(select, 'aria-pressed', String(selected));
}

/**
 * Draws the number beside each trait's dots, the play row of each named custom
 * ability and which rows are chosen for the dice pool. The dots themselves are
 * drawn with the rest of the ratings.
 */
export function drawTraitCards(
  root: ParentNode,
  character: V20Character,
  mode: SheetMode,
  selection: PoolSelection,
): void {
  for (const row of lookupAll(root, '[data-trait-key]')) {
    const key = row.dataset.traitKey!;
    if (isCustomAbility(key)) {
      drawCustomAbility(row, key, character);
    } else {
      const value = traitValue(character, key as TraitRef);
      const specialty = hasSpecialty(key) ? specialtyOf(character, key) : undefined;
      show(row, 'trait.number', String(value));
      describeValue(row, value, specialty);
      // The mark after the name is drawn by the stylesheet.
      row.classList.toggle('has-specialty', specialty !== undefined);
    }
    drawSelectable(row, mode);
    drawSelected(row, selection);
  }
}
