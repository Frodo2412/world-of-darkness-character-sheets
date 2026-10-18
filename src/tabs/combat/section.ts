// Which part of the rulebook's combat tables the tab shows. The All / Close combat / Ranged combat
// filter and the Melee / Ranged sub-tabs are one piece of state: the filter narrows, the sub-tab says
// which section to browse while the filter leaves both open. Nothing here touches the page.

import type { CombatSection } from '../../domain/v20/combat/data/manoeuvres';

export type SectionFilter = 'all' | CombatSection;

export interface SectionView {
  filter: SectionFilter;
  /** The sub-tab: always one of the two, and the filter's own section when it narrows to one. */
  tab: CombatSection;
}

/** How the tab opens: no narrowing, browsing the melee tables. */
export const OPENING_VIEW: SectionView = { filter: 'all', tab: 'melee' };

/** Chooses a filter; narrowing to a section also selects its sub-tab. */
export function chooseFilter(view: SectionView, filter: SectionFilter): SectionView {
  return filter === 'all' ? { ...view, filter } : { filter, tab: filter };
}

/** Chooses a sub-tab; while the filter narrows to one section it follows. */
export function chooseTab(view: SectionView, tab: CombatSection): SectionView {
  return { filter: view.filter === 'all' ? 'all' : tab, tab };
}

/**
 * The sections whose tables are drawn. A narrowing filter shows its section; with none, the sub-tab's
 * section, or both while a search is looking across the whole book.
 */
export function shownSections(view: SectionView, searching: boolean): CombatSection[] {
  if (view.filter !== 'all') return [view.filter];
  return searching ? ['melee', 'ranged'] : [view.tab];
}
