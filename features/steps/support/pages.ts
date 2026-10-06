import { expect, type Locator, type Page } from '@playwright/test';

export const SHEET_ADDRESS = /\/sheet\/\?id=.+/;

export const sheetAddress = (id: string): string => `/sheet/?id=${encodeURIComponent(id)}`;

/** Every entry of the library list: characters, builds and records that could not be read. */
export const rosterEntries = (page: Page): Locator =>
  page.getByRole('list', { name: 'Characters' }).getByRole('listitem');

/** The entries of characters: the ones that offer "Open sheet", which a build or an unreadable record does not. */
export const characterEntries = (page: Page): Locator =>
  rosterEntries(page).filter({ has: page.getByRole('link', { name: /^Open sheet for / }) });

/** The entry whose name (a level 3 heading) is `name`. */
export const entryNamed = (page: Page, name: string): Locator =>
  rosterEntries(page).filter({ has: page.getByRole('heading', { level: 3, name, exact: true }) });

/** The part of an entry the page marks as `slot`; the entry's markup is known only here. */
export const entrySlot = (entry: Locator, slot: string): Locator =>
  entry.locator(`[data-slot="${slot}"]`);

/** What an entry's action is called to assistive technology: its text and whom it is for. */
export const actionName = (label: string, entryName: string): string => `${label} for ${entryName}`;

/** The link `label` ("Open sheet", "Edit character", "Continue") of one entry. */
export const entryAction = (entry: Locator, label: string): Locator =>
  entry.getByRole('link', { name: new RegExp(`^${label} for `) });

/** The row under the list: "Showing X of Y characters". */
export const summaryRow = (page: Page): Locator => page.locator('.library-summary');

/** Follows "Open sheet" on an entry. */
export const openSheetOf = (entry: Locator): Promise<void> => entryAction(entry, 'Open sheet').click();

export async function openRoster(page: Page): Promise<void> {
  await page.goto('/');
}

/** Creates a character from the roster and ends on its sheet. */
export async function createCharacter(page: Page): Promise<void> {
  await openRoster(page);
  await page.getByRole('button', { name: 'New V20 character' }).click();
  await expect(page).toHaveURL(SHEET_ADDRESS);
}

/** How far the page reaches beyond the screen's width; 0 when it does not scroll sideways. */
export const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

export const sheetField = (page: Page, label: string): Locator =>
  page.getByLabel(label, { exact: true });

/** The entries marked "In progress". */
export const buildEntries = (page: Page): Locator =>
  rosterEntries(page).filter({ hasText: 'In progress' });
