import { setText } from './dom';

/** The parts every section of the tab has: its list of cards, the empty state, and the count in its heading. */
export interface SectionParts {
  list: HTMLElement;
  empty: HTMLElement;
  count: HTMLElement;
}

/** The parts of the section called `key`, which the panel's markup names. */
export function sectionOf(root: ParentNode, key: string): SectionParts {
  const one = <T extends HTMLElement>(selector: string): T => root.querySelector<T>(selector)!;
  return {
    list: one(`[data-list="${key}"]`),
    empty: one(`[data-empty="${key}"]`),
    count: one(`[data-section="${key}"] .dossier-heading-count`),
  };
}

/** The heading's count text, and the empty state shown only when no row is. */
export function drawFrame(section: SectionParts, shown: number, countText: string): void {
  setText(section.count, countText);
  section.empty.hidden = shown > 0;
}
