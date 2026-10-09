import type { TabKey } from './descriptor';

const panelOf = (sheet: ParentNode, key: TabKey): HTMLElement =>
  sheet.querySelector<HTMLElement>(`[data-tab-panel="${key}"]`)!;

/** Reveals the panel of `key` and hides the rest. */
export function showPanel(sheet: ParentNode, key: TabKey): void {
  for (const panel of sheet.querySelectorAll<HTMLElement>('[data-tab-panel]')) {
    panel.hidden = panel.dataset.tabPanel !== key;
  }
}

/**
 * Moves focus to the panel's heading (the element its markup marks `data-panel-heading`), or to the
 * panel itself, and scrolls the panel to the top of the screen.
 */
export function focusPanel(sheet: ParentNode, key: TabKey): void {
  const panel = panelOf(sheet, key);
  const heading = panel.querySelector<HTMLElement>('[data-panel-heading]');
  if (heading !== null && !heading.hasAttribute('tabindex')) heading.tabIndex = -1;
  (heading ?? panel).focus({ preventScroll: true });
  panel.scrollIntoView({ block: 'start' });
}
