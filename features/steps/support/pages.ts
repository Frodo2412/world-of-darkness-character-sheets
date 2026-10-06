import { expect, type Locator, type Page } from '@playwright/test';
import { buildKeyFor } from '../../../src/storage/buildStore';
import { keyFor } from '../../../src/storage/characterStore';
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

/** The row under the list: "Showing X of Y characters". */
export const summaryRow = (page: Page): Locator => page.locator('[data-slot="library-summary"]');

/** Follows "Open sheet" on an entry. */
export const openSheetOf = (entry: Locator): Promise<void> => entryAction(entry, 'Open sheet').click();

export async function openRoster(page: Page): Promise<void> {
  await page.goto('/');
}

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
