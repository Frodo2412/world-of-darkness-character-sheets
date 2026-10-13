import { expect, type Locator, type Page } from '@playwright/test';
import { sheetAddress } from './pages';

const CHARACTER_SHEET = 'Character sheet';

/** The key a tab's name goes by in the sheet's address: "Level up" is `level-up`; the Character sheet has none. */
export const tabKeyOf = (name: string): string | undefined =>
  name === CHARACTER_SHEET ? undefined : name.toLowerCase().replace(/\s+/g, '-');

/** The address of a character's sheet on the tab called `name`, or on the tab named by the address itself, however odd. */
export function tabAddress(id: string, tab: string | undefined): string {
  return tab === undefined ? sheetAddress(id) : `${sheetAddress(id)}&tab=${encodeURIComponent(tab)}`;
}

/** Opens the sheet of the saved character `id` on the tab `key` (the Character sheet when absent). */
export async function openSheetAt(page: Page, id: string, key: string | undefined): Promise<void> {
  await page.goto(tabAddress(id, key));
}

/** The panel of the tab with key `key`: the one place that knows how panels are marked. */
export const tabPanelOf = (page: Page, key: string): Locator => page.locator(`[data-tab-panel="${key}"]`);

/** Opens the sheet of the saved character `id` on the tab called `name` ("Level up", "Character sheet"). */
export const openSheetTab = (page: Page, id: string, name: string): Promise<void> =>
  openSheetAt(page, id, tabKeyOf(name));

/** The name of the tab that is showing: the selected one in the bar, or the Character sheet while there is no bar. */
export async function activeTab(page: Page): Promise<string> {
  const selected = page.getByRole('tab', { selected: true });
  return (await selected.count()) === 0 ? CHARACTER_SHEET : ((await selected.textContent()) ?? '').trim();
}

/** Switches to the tab called `name` the way a player does, by choosing it in the bar; nothing when it is showing. */
export async function showTab(page: Page, name: string): Promise<void> {
  if ((await activeTab(page)) === name) return;
  await page.getByRole('tab', { name, exact: true }).click();
  await expect(page.getByRole('tab', { name, exact: true, selected: true })).toBeVisible();
}

/** The panel that is showing. */
export const activePanel = (page: Page): Locator => page.locator('[data-tab-panel]:not([hidden])');

/**
 * Stops the page's clock at `at`, from now on: `Date.now()` and `new Date()` read it, so what a tab
 * stamps on a record (a session's start, an award's time) is known. Timers still run. Call it before
 * the page is opened.
 */
export async function fixClock(page: Page, at: string | number | Date): Promise<void> {
  await page.clock.setFixedTime(at);
}
