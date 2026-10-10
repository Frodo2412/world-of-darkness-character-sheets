// What the Backgrounds tab draws for the character's Merits and Flaws: a card per entry shown, and what
// the entries shown are worth together. A Flaw has the shape of a Merit; its points are what it is worth.

import type { V20Character } from '../character';
import type { Flaw, Merit, MeritCategory } from '../dossier/types';
import { cardList, type CardList, type ListMode } from './sections';

/** What a list of entries is worth together: the sum of their points. */
export const pointTotal = (entries: readonly { points: number }[]): number =>
  entries.reduce((total, { points }) => total + points, 0);

export interface PointCard {
  /** The entry's place in the stored list: how an edit finds it again. */
  index: number;
  /** The name as the card shows it, trimmed; empty for an unnamed entry (edit mode only). */
  name: string;
  /** The name as stored, for the field the player types it in. */
  nameText: string;
  category: MeritCategory;
  points: number;
  note: string;
}

/** The entries shown and what they are worth: the heading's count and its point total cover the same ones. */
export interface PointList extends CardList<PointCard> {
  total: number;
}

function pointCards(entries: readonly (Merit | Flaw)[], mode: ListMode): PointList {
  const list = cardList(entries, mode, (index, entry): PointCard => ({
    index,
    name: entry.name.trim(),
    nameText: entry.name,
    category: entry.category,
    points: entry.points,
    note: entry.note,
  }));
  return { ...list, total: pointTotal(list.cards) };
}

/** The Merit cards for the mode: only the named Merits in play, every Merit in edit. */
export const meritCards = (character: V20Character, mode: ListMode): PointList => pointCards(character.merits, mode);

/** The Flaw cards for the mode: only the named Flaws in play, every Flaw in edit. */
export const flawCards = (character: V20Character, mode: ListMode): PointList => pointCards(character.flaws, mode);
