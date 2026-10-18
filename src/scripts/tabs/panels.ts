import type { TabKey } from './descriptor';

const panelOf = (sheet: ParentNode, key: TabKey): HTMLElement =>
  sheet.querySelector<HTMLElement>(`[data-tab-panel="${key}"]`)!;

/** Reveals the panel of `key` and hides the rest. */
export function showPanel(sheet: ParentNode, key: TabKey): void {
  for (const panel of sheet.querySelectorAll<HTMLElement>('[data-tab-panel]')) {
    panel.hidden = panel.dataset.tabPanel !== key;
  }
}

/** Hides the panel of `key`: a tab that could not be loaded has nothing to show or to type into. */
export function hidePanel(sheet: ParentNode, key: TabKey): void {
  panelOf(sheet, key).hidden = true;
}

/**
 * Scrolls the page to the top of the panel when the panel's heading (or the panel, when it marks none) is
 * out of the viewport, and otherwise leaves the page where it is: a tab chosen from the bar keeps the bar
 * and the resources in view, while one opened from far down the Character sheet is brought up.
 */
export function revealPanel(sheet: ParentNode, key: TabKey, viewportHeight: number = globalThis.innerHeight): void {
  const panel = panelOf(sheet, key);
  const target = panel.querySelector<HTMLElement>('[data-panel-heading]') ?? panel;
  const { top, bottom } = target.getBoundingClientRect();
  if (top < 0 || bottom > viewportHeight) panel.scrollIntoView({ block: 'start' });
}

/**
 * Moves focus to the panel's heading (the element its markup marks `data-panel-heading`), or to the
 * panel itself, and reveals the panel as `revealPanel` does.
 */
export function focusPanel(sheet: ParentNode, key: TabKey, viewportHeight: number = globalThis.innerHeight): void {
  const panel = panelOf(sheet, key);
  const heading = panel.querySelector<HTMLElement>('[data-panel-heading]');
  if (heading !== null && !heading.hasAttribute('tabindex')) heading.tabIndex = -1;
  (heading ?? panel).focus({ preventScroll: true });
  revealPanel(sheet, key, viewportHeight);
}
