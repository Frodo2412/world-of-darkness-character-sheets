import type { Locator, Page } from '@playwright/test';
import { sheetAddress } from './pages';

/** The key a tab's name goes by in the sheet's address: "Level up" is `level-up`; the Character sheet has none. */
export const tabKeyOf = (name: string): string | undefined =>
  name === 'Character sheet' ? undefined : name.toLowerCase().replace(/\s+/g, '-');

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
