import { expect, type Locator, type Page } from '@playwright/test';
import { buildKeyFor } from '../../../src/storage/buildStore';
import { keyFor } from '../../../src/storage/characterStore';
import { watchWrites } from './announcements';
import { storedKeys } from './storage';
import { escaped } from './text';

export const SHEET_ADDRESS = /\/sheet\/\?id=.+/;

export const sheetAddress = (id: string): string => `/sheet/?id=${encodeURIComponent(id)}`;

// This file is the one place that knows the list's markup: the steps ask for entries and
// their parts through the functions below.

/** The library list. */
export const rosterList = (page: Page): Locator => page.getByRole('list', { name: 'Characters' });

/** Every entry of the library list: characters, builds and records that could not be read. */
export const rosterEntries = (page: Page): Locator => rosterList(page).getByRole('listitem');

/** The heading that names an entry (all of `scope`'s, or the one called `name`). */
export const entryHeading = (scope: Page | Locator, name?: string): Locator =>
  scope.getByRole('heading', name === undefined ? { level: 3 } : { level: 3, name, exact: true });

/** The entries of characters: the ones that offer "Open sheet", which a build or an unreadable record does not. */
export const characterEntries = (page: Page): Locator =>
  rosterEntries(page).filter({ has: page.getByRole('link', { name: /^Open sheet for / }) });

/** The entry whose name (a level 3 heading) is `name`. */
export const entryNamed = (page: Page, name: string): Locator =>
  rosterEntries(page).filter({ has: entryHeading(page, name) });

/** The entries reporting a record of `kind` that could not be read. */
export const unreadableEntries = (page: Page, kind: 'character' | 'build'): Locator =>
  rosterEntries(page).filter({ has: entryHeading(page, `Unreadable ${kind}`) });

/** Waits for the list to show every character and build the browser's storage holds. */
export async function expectStoredEntriesListed(page: Page): Promise<void> {
  const stored = await Promise.all([keyFor(''), buildKeyFor('')].map((prefix) => storedKeys(page, prefix)));
  await expect(rosterEntries(page)).toHaveCount(stored.flat().length);
}

/** The entry an earlier "the entry for …" step named; a step that says "it" needs one. */
export function currentEntry(memory: { entry?: Locator }): Locator {
  if (memory.entry === undefined) {
    throw new Error("no entry named yet: a 'the entry for …' step must come first");
  }
  return memory.entry;
}

/** The part of an entry the page marks as `slot`; the entry's markup is known only here. */
export const entrySlot = (entry: Locator, slot: string): Locator =>
  entry.locator(`[data-slot="${slot}"]`);

/** What an entry's action is called to assistive technology: its text and whom it is for. */
export const actionName = (label: string, entryName: string): string => `${label} for ${entryName}`;

/** The link `label` ("Open sheet", "Edit character", "Continue") of one entry. */
export const entryAction = (entry: Locator, label: string): Locator =>
  entry.getByRole('link', { name: new RegExp(`^${escaped(label)} for `) });

/** The row under the list: "Showing X of Y characters" on its left, the chronicle breakdown on its right. */
export const summaryRow = (page: Page): Locator => page.locator('[data-slot="library-summary"]');

/** The row's left side: "Showing X of Y characters". */
export const summaryCounts = (page: Page): Locator => entrySlot(summaryRow(page), 'library-counts');

/** The row's right side, which is not drawn when there is nothing to say. */
export const chronicleBreakdown = (page: Page): Locator => entrySlot(summaryRow(page), 'chronicle-breakdown');

/** The chronicle tab strip. */
export const tabStrip = (page: Page): Locator => page.getByRole('tablist', { name: 'Chronicles', exact: true });

/** Every tab of the strip, in order. */
export const tabs = (page: Page): Locator => tabStrip(page).getByRole('tab');

/** The selected tab. */
export const selectedTab = (page: Page): Locator => tabStrip(page).getByRole('tab', { selected: true });

/** The one panel the tabs control: the list card, while there are tabs. */
export const tabPanel = (page: Page): Locator => page.getByRole('tabpanel');

/**
 * The text a tab shows, "Name · 4": its name and count as drawn. The comma that is read to assistive
 * technology in their place is not shown, so the tab's text content is not what it shows.
 */
export const tabText = async (tab: Locator): Promise<string> =>
  `${await entrySlot(tab, 'tab-label').textContent()} · ${await entrySlot(tab, 'tab-count').textContent()}`;

/** The text each tab shows, in order. */
export const shownTabTexts = async (page: Page): Promise<string[]> =>
  Promise.all((await tabs(page).all()).map(tabText));

/** The tab that shows `text` ("Name · 4"). */
export function tab(page: Page, text: string): Locator {
  const split = text.lastIndexOf(' · ');
  const exactly = (shown: string): { hasText: RegExp } => ({ hasText: new RegExp(`^${escaped(shown)}$`) });
  return tabs(page)
    .filter({ has: page.locator('[data-slot="tab-label"]', exactly(text.slice(0, split))) })
    .filter({ has: page.locator('[data-slot="tab-count"]', exactly(text.slice(split + 3))) });
}

/** What a tab showing `text` is called to assistive technology: "Name, 4". */
export const tabAccessibleName = (text: string): string => {
  const split = text.lastIndexOf(' · ');
  return `${text.slice(0, split)}, ${text.slice(split + 3)}`;
};

/** Follows the link `label` for the character called `name`, wherever on the page it is. */
export const followAction = (page: Page, label: string, name: string): Promise<void> =>
  page.getByRole('link', { name: actionName(label, name), exact: true }).click();

/** Follows "Open sheet" on an entry. */
export const openSheetOf = (entry: Locator): Promise<void> => entryAction(entry, 'Open sheet').click();

/** The roster's path, as the address bar holds it. */
export const ROSTER_PATH = '/';

export async function openRoster(page: Page): Promise<void> {
  await page.goto(ROSTER_PATH);
}

/** Waits until the page is at the roster's path exactly, and not at some address that merely ends in a slash. */
export async function expectOnRoster(page: Page): Promise<void> {
  await expect.poll(() => new URL(page.url()).pathname).toBe(ROSTER_PATH);
}

/** The page's status message: shown only while there is something the player needs to be told. */
export const statusRegion = (page: Page): Locator => page.getByRole('alert');

/** Starts recording each time the status message is written to; see `writtenTexts`. */
export const watchStatusWrites = (page: Page): Promise<void> => watchWrites(page, '#status-message');

/** The Character creator card: the section labelled by its level 2 title. */
export const creatorCard = (page: Page): Locator =>
  page.getByRole('region', { name: 'A new story begins.', exact: true });

/** One of the card's two actions, "Start character creator" or "Start with a blank sheet". */
export const createAction = (page: Page, name: string): Locator =>
  creatorCard(page).getByRole('button', { name, exact: true });

/**
 * Every tab, search field, filter and sort control a player can browse the library with, by role and
 * name. A page with none of them is the page of an empty library or of a browser without storage.
 */
export const browsingControls = (page: Page): Locator =>
  page
    .getByRole('tab')
    .or(page.getByRole('searchbox'))
    .or(page.getByRole('textbox', { name: /search/i }))
    .or(page.getByRole('combobox', { name: /clan|sort/i }))
    .or(page.getByRole('group', { name: 'Status', exact: true }))
    .or(page.getByRole('radio'));

/** Creates a character from the roster and ends on its sheet. */
export async function createCharacter(page: Page): Promise<void> {
  await openRoster(page);
  await createAction(page, 'Start with a blank sheet').click();
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
