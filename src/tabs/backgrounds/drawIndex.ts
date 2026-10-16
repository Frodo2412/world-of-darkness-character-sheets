import { SECTION_KEYS, type SectionKey } from '../../domain/v20/backgrounds/counts';
import { setText } from '../../scripts/dossier/dom';

/** What each section is called in the index, which is not always what its heading says. */
export const INDEX_LABELS: Record<SectionKey, string> = {
  backgrounds: 'Expanded backgrounds',
  havens: 'Havens',
  merits: 'Merits',
  flaws: 'Flaws',
  otherTraits: 'Other Traits',
};

/** An index entry as it reads: "Havens · 2". */
export const indexText = (key: SectionKey, count: number): string => `${INDEX_LABELS[key]} · ${count}`;

/** Writes each section's count into its entry of the index. */
export function drawIndex(index: HTMLElement, counts: Record<SectionKey, number>): void {
  for (const key of SECTION_KEYS) {
    setText(index.querySelector(`[data-index="${key}"]`)!, indexText(key, counts[key]));
  }
}
