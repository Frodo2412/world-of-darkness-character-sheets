// What the Backgrounds tab draws for the character's background rows: one card per row shown.
// Computed on every draw, never stored.

import { namedRows, type V20Character } from '../character';
import type { BackgroundRow, Person } from '../dossier/types';
import { cardList, type CardList, type ListMode } from './sections';

/** The dots a background is drawn with: the frame has five. A rating above it still reads in full as text. */
export const BACKGROUND_DOTS = 5;

/** A rating as dots: from none to the five the frame has. */
export const dotsOf = (rating: number): number => Math.min(Math.max(rating, 0), BACKGROUND_DOTS);

export interface BackgroundCard {
  /** The row's place in the stored backgrounds: how an edit finds it again. */
  index: number;
  /** The name as the card shows it, trimmed; empty for an unnamed row (edit mode only). */
  name: string;
  /** The name as stored, for the field the player types it in. */
  nameText: string;
  /** The rating as stored. */
  rating: number;
  /** The rating as dots, at most five. */
  dots: number;
  summary: string;
  note: string;
  /** In the order stored. */
  people: Person[];
  /** The row holds details but no name, so play mode will not show it. */
  needsName: boolean;
}

function cardOf(index: number, row: BackgroundRow): BackgroundCard {
  const { summary = '', note = '', people = [] } = row;
  const name = namedRows([row])[0]?.name ?? '';
  const hasDetails = row.rating !== 0 || summary !== '' || note !== '' || people.length > 0;
  return {
    index,
    name,
    nameText: row.name,
    rating: row.rating,
    dots: dotsOf(row.rating),
    summary,
    note,
    people,
    needsName: name === '' && hasDetails,
  };
}

/** The background cards for the mode: only the named rows in play, every row in edit. */
export function backgroundCards(character: V20Character, mode: ListMode): CardList<BackgroundCard> {
  return cardList(character.backgrounds, mode, cardOf);
}
