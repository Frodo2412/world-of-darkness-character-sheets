import { expect, type Locator, type Page } from '@playwright/test';
import type { V20Character } from '../../../src/domain/v20/character';
import { startSession } from '../../../src/domain/v20/journal/sessions';
import type { Stamp } from '../../../src/domain/v20/journal/stamp';
import { escaped } from './text';
import { activePanel, openSheetTab, showTab, tabPanelOf } from './tabs';

// This file is the one place that knows the Journal tab's markup: the steps ask for the sessions and
// the sections through the functions below. The notes, experience and record have their own files.

const TAB = 'Journal';

export const journalPanel = (page: Page): Locator => tabPanelOf(page, 'journal');

/** The application bar's label for the chronicle and session. */
export const appBarLabel = (page: Page): Locator => page.locator('[data-app-bar-label]');

/** The card that lists the sessions and starts a new one. */
export const sessionsCard = (page: Page): Locator => journalPanel(page).locator('[data-sessions]');

/** The row of the session called `title`. */
export const sessionRow = (page: Page, title: string): Locator =>
  sessionsCard(page)
    .locator('li.journal-session')
    .filter({ has: page.locator('.journal-session-name', { hasText: new RegExp(`^${escaped(title)}$`) }) });

/** The rows marked current. */
export const currentRows = (page: Page): Locator => sessionsCard(page).locator('li.journal-session').filter({ has: page.locator('.journal-session-mark') });

export const startTitleField = (page: Page): Locator => sessionsCard(page).getByLabel('Name for the new session', { exact: true });
export const startButton = (page: Page): Locator => sessionsCard(page).getByRole('button', { name: 'Start new session', exact: true });

/** The empty state above the sections. */
export const emptyState = (page: Page): Locator => journalPanel(page).locator('[data-journal-empty]');

/** The sub-navigation under the heading. */
export const subNavigation = (page: Page): Locator => journalPanel(page).getByRole('navigation', { name: 'Journal sections', exact: true });

/** Shows the Journal tab the way a player does: from the bar when the sheet is open, else by its address. */
export async function showJournal(page: Page, id: string): Promise<void> {
  if (/\/sheet\//.test(page.url())) await showTab(page, TAB);
  else await openSheetTab(page, id, TAB);
  await expect(activePanel(page)).toBeVisible();
  await expect(journalPanel(page)).toBeVisible();
}

/** Starts a session on the page: the title typed (when there is one) and Start pressed. */
export async function startSessionOnPage(page: Page, title: string): Promise<void> {
  if (title !== '') await startTitleField(page).fill(title);
  await startButton(page).click();
}

let madeSessions = 0;

/** Ids the page will never make, so a seeded session cannot be mistaken for one the player started; none repeats within a run. */
function seededStamp(): Stamp {
  return { newId: () => `seeded-session-${(madeSessions += 1)}`, now: () => 1_700_000_000_000 };
}

/** The character with these sessions started in this order, so the last is the current one. */
export function withSessions(character: V20Character, ...titles: string[]): V20Character {
  const stamp = seededStamp();
  character.journal = titles.reduce((journal, title) => startSession(journal, title, stamp), character.journal);
  return character;
}
