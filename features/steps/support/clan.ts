// The Clan screen: the clan select, the question a switch that would remove dots asks, and its notice.

import type { Locator, Page } from '@playwright/test';
import { openStep } from './builder';

/** The Clan select; it is only found while the Clan screen is shown. */
export const clanSelect = (page: Page): Locator => page.locator('#builder').getByRole('combobox', { name: 'Clan', exact: true });

/** The question asked before a switch that would remove dots. */
export const clanPanel = (page: Page): Locator => page.locator('[data-clan-change]');

/** The status region the question is written into: part of the page whether or not a question is open. */
export const clanQuestionStatus = (page: Page): Locator => page.locator('#clan-change-text');

/** The polite slot under the select, where what a clan change did is said. */
export const clanNotice = (page: Page): Locator => page.locator('#clan-choice-notice');

/** The id the Clan select is found by when keyboard focus is read back. */
export const CLAN_SELECT_ID = 'clan-choice';

export async function openClanScreen(page: Page): Promise<void> {
  await openStep(page, 'Clan');
}

/** Chooses a clan on the Clan screen. A switch that would remove dots is left waiting for an answer. */
export async function chooseClan(page: Page, clan: string): Promise<void> {
  await openClanScreen(page);
  await clanSelect(page).selectOption({ label: clan });
}
