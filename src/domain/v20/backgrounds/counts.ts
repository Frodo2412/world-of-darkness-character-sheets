// How many rows each section of the Backgrounds tab shows: the numbers of its section index.

import type { V20Character } from '../character';
import { backgroundCards } from './cards';
import { havenCards } from './havens';
import { otherTraitCards } from './others';
import { flawCards, meritCards } from './points';
import type { ListMode } from './sections';

export const SECTION_KEYS = ['backgrounds', 'havens', 'merits', 'flaws', 'otherTraits'] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

/** The rows each section shows in the mode: the named ones in play, all of them (blank ones too) in edit. */
export function sectionCounts(character: V20Character, mode: ListMode): Record<SectionKey, number> {
  return {
    backgrounds: backgroundCards(character, mode).count,
    havens: havenCards(character, mode).count,
    merits: meritCards(character, mode).count,
    flaws: flawCards(character, mode).count,
    otherTraits: otherTraitCards(character, mode).count,
  };
}
