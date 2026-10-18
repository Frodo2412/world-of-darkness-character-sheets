import { expect, type Locator, type Page } from '@playwright/test';
import { escaped } from './text';
import { tabPanelOf } from './tabs';

// This file is the one place that knows the Backgrounds tab's markup: the steps ask for sections, cards
// and fields through the functions below.

export const backgroundsPanel = (page: Page): Locator => tabPanelOf(page, 'backgrounds');

export type Section = 'backgrounds' | 'havens' | 'merits' | 'flaws' | 'otherTraits';

/** The entries of a section, as the page draws them. */
export const entriesOf = (page: Page, section: Section): Locator => backgroundsPanel(page).locator(`[data-list="${section}"] > li`);

/** The section's heading count: "2 entries · 3 points". */
export const headingCount = (page: Page, section: Section): Locator => backgroundsPanel(page).locator(`[data-count="${section}"]`);

/** A section's empty state. */
export const emptyState = (page: Page, section: Section): Locator => backgroundsPanel(page).locator(`[data-empty="${section}"]`);

/** The entry of a section whose name is `name` (read-only view). */
export const entryNamed = (page: Page, section: Section, name: string): Locator =>
  entriesOf(page, section).filter({ has: page.locator('.bg-view h4', { hasText: new RegExp(`^${escaped(name)}$`) }) });

/** The section index's entry for a section: "Merits · 2". */
export const indexItem = (page: Page, section: Section): Locator => backgroundsPanel(page).locator(`[data-index-item="${section}"]`);

/** A named field of an entry in edit mode, by the name assistive technology gives it: "Merit 2 points". */
export const fieldNamed = (page: Page, name: string): Locator => backgroundsPanel(page).getByLabel(name, { exact: true });

/** The add control of a section: "Add merit". */
export const addButton = (page: Page, name: string): Locator => backgroundsPanel(page).getByRole('button', { name, exact: true });

/** Waits for the Backgrounds tab to be the one showing. */
export async function expectBackgroundsShown(page: Page): Promise<void> {
  await expect(backgroundsPanel(page)).toBeVisible();
}
