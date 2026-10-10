// What the Backgrounds tab draws for the character's other traits: one card per trait shown.

import type { V20Character } from '../character';
import type { OtherTrait } from '../dossier/types';
import { dotsOf } from './cards';
import { cardList, type CardList, type ListMode } from './sections';

export interface OtherTraitCard {
  /** The trait's place in the stored list: how an edit finds it again. */
  index: number;
  /** The name as the card shows it, trimmed; empty for an unnamed trait (edit mode only). */
  name: string;
  /** The name as stored, for the field the player types it in. */
  nameText: string;
  /** The rating as stored; absent for a trait that has none. */
  rating?: number;
  /** The rating as dots, at most five; absent with the rating. */
  dots?: number;
  /** What sort of trait it is, as the player wrote it ("Skill"). */
  kind: string;
  note: string;
}

/** The other-trait cards for the mode: only the named traits in play, every trait in edit. */
export function otherTraitCards(character: V20Character, mode: ListMode): CardList<OtherTraitCard> {
  return cardList(character.otherTraits, mode, (index, trait: OtherTrait) => ({
    index,
    name: trait.name.trim(),
    nameText: trait.name,
    ...(trait.rating === undefined ? {} : { rating: trait.rating, dots: dotsOf(trait.rating) }),
    kind: trait.kind,
    note: trait.note,
  }));
}
