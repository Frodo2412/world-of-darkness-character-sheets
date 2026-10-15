// What the Backgrounds tab shows for the character's Backgrounds. Computed on every draw, never stored.

import type { V20Character } from '../character';
import type { BackgroundRow, Person } from '../dossier/types';

/** The sheet's two modes, as the domain names them. */
export type DossierMode = 'play' | 'edit';

/** The dots a Background is drawn with; a stored rating above it is kept and shown as a number. */
export const BACKGROUND_DOTS = 5;

export interface BackgroundCard {
  /** The row's place in the stored list: what an edit addresses. */
  index: number;
  name: string;
  rating: number;
  /** The rating clamped to the dots drawn. */
  dots: number;
  summary: string;
  note: string;
  people: Person[];
  /** The row has no name: an add slot in edit mode, and never shown in play. */
  blank: boolean;
  /** The row holds details but no name, so play mode would hide it. */
  needsName: boolean;
}

const hasDetails = (row: BackgroundRow): boolean =>
  row.rating > 0 ||
  (row.summary ?? '').trim() !== '' ||
  (row.note ?? '').trim() !== '' ||
  (row.people ?? []).some((person) => person.name.trim() !== '' || person.role.trim() !== '');

/**
 * The character's Backgrounds as cards, in stored order. Play mode shows the named rows only; edit
 * mode shows every row, so an unnamed one is a slot to fill, flagged when it holds details that play
 * mode would hide.
 */
export function backgroundCards(character: V20Character, mode: DossierMode): BackgroundCard[] {
  return character.backgrounds
    .map((row, index): BackgroundCard => {
      const name = row.name.trim();
      return {
        index,
        name,
        rating: row.rating,
        dots: Math.min(BACKGROUND_DOTS, Math.max(0, row.rating)),
        summary: row.summary ?? '',
        note: row.note ?? '',
        people: (row.people ?? []).map((person) => ({ ...person })),
        blank: name === '',
        needsName: name === '' && hasDetails(row),
      };
    })
    .filter((card) => mode === 'edit' || !card.blank);
}

/** How many Backgrounds the character has named: what the section's count and the index show. */
export const namedBackgroundCount = (character: V20Character): number =>
  character.backgrounds.filter((row) => row.name.trim() !== '').length;
