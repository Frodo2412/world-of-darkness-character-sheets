// What the Backgrounds tab draws for the character's havens: one card per haven shown.

import type { V20Character } from '../character';
import type { Haven, HavenKind } from '../dossier/types';
import { cardList, type CardList, type ListMode } from './sections';

export interface HavenCard {
  /** The haven's place in the stored list: how an edit finds it again. */
  index: number;
  /** The name as the card shows it, trimmed; empty for an unnamed haven (edit mode only). */
  name: string;
  /** The name as stored, for the field the player types it in. */
  nameText: string;
  kind: HavenKind;
  description: string;
  location: string;
  access: string;
  security: string;
}

/** The haven cards for the mode: only the named havens in play, every haven in edit. */
export function havenCards(character: V20Character, mode: ListMode): CardList<HavenCard> {
  return cardList(character.havens, mode, (index, haven: Haven) => ({
    index,
    name: haven.name.trim(),
    nameText: haven.name,
    kind: haven.kind,
    description: haven.description,
    location: haven.location,
    access: haven.access,
    security: haven.security,
  }));
}
