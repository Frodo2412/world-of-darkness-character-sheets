import { expect, type Locator, type Page } from '@playwright/test';
import type { V20Character } from '../../../src/domain/v20/character';
import { keyFor } from '../../../src/storage/characterStore';
import { watchAnnouncements } from './announcements';
import { arrangeTraits } from './arrange';
import { withLedger } from './journal-experience';
import { escaped } from './text';
import { activePanel, openSheetTab, showTab, tabPanelOf } from './tabs';

// This file is the one place that knows the Level up tab's markup: the steps ask for the figures, the
// rows, the review and its buttons through the functions below.

const TAB = 'Level up';

export const levelUpPanel = (page: Page): Locator => tabPanelOf(page, 'levelup');

/** One of the four figures, by its label. */
export const figureValue = (page: Page, label: string): Locator =>
  levelUpPanel(page)
    .locator('.levelup-card-figure')
    .filter({ has: page.locator('.levelup-figure-label', { hasText: new RegExp(`^${escaped(label)}$`) }) })
    .locator('[data-value]');

/** What a scenario calls a trait where the tab shows more: "Willpower" is the permanent rating. */
const SHOWN_AS: Readonly<Record<string, string>> = { Willpower: 'Willpower (perm.)' };

/** The row of a trait, by the name it shows. */
export const rowNamed = (page: Page, label: string): Locator =>
  levelUpPanel(page)
    .locator('li.levelup-row')
    .filter({ has: page.locator('.levelup-row-name', { hasText: new RegExp(`^${escaped(SHOWN_AS[label] ?? label)}$`) }) });

/** The "+" or "−" button of a row. */
export const stepOf = (row: Locator): Locator => row.locator('.levelup-step');

/** The line of the review for a trait. */
export const reviewLine = (page: Page, label: string): Locator =>
  levelUpPanel(page)
    .locator('[data-lines] > li')
    .filter({ has: page.locator('.levelup-line-name', { hasText: new RegExp(`^${escaped(label)}$`) }) });

export const reviewLines = (page: Page): Locator => levelUpPanel(page).locator('[data-lines] > li');

/** A summary figure of the review ("After confirmation"). */
export const summaryValue = (page: Page, label: string): Locator =>
  levelUpPanel(page)
    .locator('[data-summary] .levelup-pair')
    .filter({ has: page.locator('dt', { hasText: new RegExp(`^${escaped(label)}$`) }) })
    .locator('dd');

export const confirmButton = (page: Page): Locator => levelUpPanel(page).getByRole('button', { name: /^Confirm & apply/ });

/** Shows the Level up tab afresh by its address, and watches what is announced. */
export async function showLevelUp(page: Page, id: string): Promise<void> {
  await openSheetTab(page, id, TAB);
  await expect(levelUpPanel(page)).toBeVisible();
  await watchAnnouncements(page);
}

/** Shows the Level up tab the way a player does when the sheet is open. */
export async function switchToLevelUp(page: Page): Promise<void> {
  await showTab(page, TAB);
  await expect(activePanel(page)).toBeVisible();
  await expect(levelUpPanel(page)).toBeVisible();
}

/** Chooses the next dot of a trait the way a player does. */
export async function selectTrait(page: Page, label: string): Promise<void> {
  await stepOf(rowNamed(page, label)).click();
  await expect(reviewLine(page, label)).toBeVisible();
}

/** The character as a Toreador with these traits and this much experience in "Session 12" (none when `xp` is 0). */
export function toreador(character: V20Character, traits: string, xp: number, session = 'Session 12'): V20Character {
  character.header.clan = 'Toreador';
  if (traits !== '') arrangeTraits(character, traits);
  return withLedger(character, { sessions: [session], awards: xp > 0 ? [{ session, amount: xp }] : [] });
}

/** Counts every write the page makes to a character's stored record, from the moment it is called until the page is closed. Call it before the page is opened. */
export async function watchWrites(page: Page, id: string): Promise<void> {
  await page.addInitScript((key) => {
    const writes: string[] = [];
    (window as unknown as { characterWrites: string[] }).characterWrites = writes;
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name: string, value: string) {
      if (name === key) writes.push(name);
      return original.call(this, name, value);
    };
  }, keyFor(id));
}

/** How many times the page has written the character since it was opened. */
export const writesSoFar = (page: Page): Promise<number> => page.evaluate(() => (window as unknown as { characterWrites: string[] }).characterWrites.length);
