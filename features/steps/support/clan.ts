// The Clan screen: the radiogroup of clans, the search, the question a switch that would remove dots asks,
// and its notice. This file is the one place that knows their markup.

import { expect, type Locator, type Page } from '@playwright/test';
import { CLAN_NAMES } from '../../../src/domain/v20/creation/rules';
import { openStep } from './builder';

/** The clans, as the radiogroup they are; it is only found while the Clan screen is shown. */
export const clanList = (page: Page): Locator => page.locator('#builder').getByRole('radiogroup', { name: 'Clans', exact: true });

/** One clan's radio. */
export const clanRadio = (page: Page, clan: string): Locator => clanList(page).getByRole('radio', { name: clan, exact: true });

/** The clans the search lists. */
export const listedClans = (page: Page): Locator => clanList(page).getByRole('radio');

export const clanSearch = (page: Page): Locator => page.locator('#builder').getByRole('searchbox', { name: 'Search clans', exact: true });

/** The keys that go to the search, written at the field's right edge. */
export const clanSearchHint = (page: Page): Locator => page.locator('[data-clan-search-hint]');

/** The status the search's result count is written into. */
export const clanResults = (page: Page): Locator => page.locator('[data-clan-results]');

/** The "All Clans · 14" heading over the list and the "Selected · 0/1" count beside it. */
export const clanHeading = (page: Page): Locator => page.locator('[data-clan-heading]');
export const clanSelectedCount = (page: Page): Locator => page.locator('[data-clan-selected]');

/** The detail of the chosen clan, and the note for a player who is not sure. */
export const clanDetailPanel = (page: Page): Locator => page.locator('[data-clan-detail]');
export const clanHelp = (page: Page): Locator => page.locator('.clan-help');

/** The question asked before a switch that would remove dots. */
export const clanPanel = (page: Page): Locator => page.locator('[data-clan-change]');

/** The status region the question is written into: part of the page whether or not a question is open. */
export const clanQuestionStatus = (page: Page): Locator => page.locator('#clan-change-text');

/** The polite slot beside the question, where what a clan change did is said. */
export const clanNotice = (page: Page): Locator => page.locator('#clan-choice-notice');

/** The names a step text can give a clan: alternatives for a regular expression. */
export const CLAN_PATTERN = CLAN_NAMES.join('|');

export async function openClanScreen(page: Page): Promise<void> {
  await openStep(page, 'Clan');
}

/** Presses a clan's radio on the Clan screen. A switch that would remove dots is left waiting for an answer. */
export async function chooseClan(page: Page, clan: string): Promise<void> {
  await openClanScreen(page);
  await clanRadio(page, clan).click();
}

/** The clan is the chosen one: it reads Selected, in text and to assistive technology. */
export async function expectClanChosen(page: Page, clan: string): Promise<void> {
  await openClanScreen(page);
  await expect(clanRadio(page, clan)).toHaveAttribute('aria-checked', 'true');
  await expect(clanRadio(page, clan).locator('[data-clan-card-state]')).toContainText('Selected');
}

/** The name of the clan card that has keyboard focus, or '' when focus is elsewhere. */
export const focusedClan = (page: Page): Promise<string> =>
  page.evaluate(() => document.activeElement?.getAttribute('data-clan-card') ?? '');
