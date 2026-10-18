import type { V20Character } from '../../domain/v20/character';
import { namedBackgroundCount } from '../../domain/v20/backgrounds/cards';
import { pointTotal } from '../../domain/v20/backgrounds/points';
import { countLabel, pointsTotalLabel } from '../../domain/v20/labels';
import { setText } from '../../scripts/dossier/dom';

/** How many entries each section holds: the figures the index, the headings and the empty states share. */
export interface Counts {
  backgrounds: number;
  havens: number;
  merits: number;
  flaws: number;
  otherTraits: number;
}

export function countsOf(character: V20Character): Counts {
  return {
    backgrounds: namedBackgroundCount(character),
    havens: character.havens.length,
    merits: character.merits.length,
    flaws: character.flaws.length,
    otherTraits: character.otherTraits.length,
  };
}

const INDEX_NAMES: Record<keyof Counts, string> = {
  backgrounds: 'Expanded backgrounds',
  havens: 'Havens',
  merits: 'Merits',
  flaws: 'Flaws',
  otherTraits: 'Other Traits',
};

/** The words beside each section's heading: "2 entries · 3 points". */
export function headingCounts(character: V20Character): Record<keyof Counts, string> {
  const counts = countsOf(character);
  const entries = (n: number): string => countLabel(n, 'entry', 'entries');
  return {
    backgrounds: entries(counts.backgrounds),
    havens: countLabel(counts.havens, 'location', 'locations'),
    merits: `${entries(counts.merits)} · ${pointsTotalLabel(pointTotal(character.merits))}`,
    flaws: `${entries(counts.flaws)} · ${pointsTotalLabel(pointTotal(character.flaws))}`,
    otherTraits: entries(counts.otherTraits),
  };
}

/** Draws the section index and each heading's count. */
export function drawIndex(root: ParentNode, character: V20Character): void {
  const counts = countsOf(character);
  const headings = headingCounts(character);
  for (const key of Object.keys(counts) as (keyof Counts)[]) {
    setText(root.querySelector(`[data-index-item="${key}"]`)!, `${INDEX_NAMES[key]} · ${counts[key]}`);
    setText(root.querySelector(`[data-count="${key}"]`)!, headings[key]);
  }
}
