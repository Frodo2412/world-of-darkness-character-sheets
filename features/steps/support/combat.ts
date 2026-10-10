import { expect, type Locator, type Page } from '@playwright/test';
import type { V20Character } from '../../../src/domain/v20/character';
import { saveCharacters } from './seed';
import { disciplineCharacter } from './disciplines';
import { openSheetTab, showTab, tabPanelOf } from './tabs';
import { escaped } from './text';

// What the Combat scenarios know about the tab: how to arrange a character from the words of a
// scenario, and where the tab's parts are.

/**
 * A character made from the words of a scenario: "Dexterity 3, Brawl 1 and a Hurt wound (1 die off
 * every pool)", "Protean 1" or "the health track fully marked Incapacitated". The words are the
 * Disciplines tab's, which already say attributes, abilities, Disciplines and wounds.
 */
export const combatCharacter = (words: string): V20Character => disciplineCharacter(words);

/** Saves a character made from the words, as the scenario's character. */
export async function saveCombatCharacter(page: Page, memory: { saved: V20Character[] }, words: string): Promise<void> {
  memory.saved = [combatCharacter(words)];
  await saveCharacters(page, memory.saved);
}

/** The tab's panel. */
export const combatPanel = (page: Page): Locator => tabPanelOf(page, 'combat');

/** Shows the Combat tab: opens the sheet on it, or chooses it in the bar when the sheet is already open. */
export async function showCombat(page: Page, memory: { saved: V20Character[] }): Promise<void> {
  if (new URL(page.url()).pathname.startsWith('/sheet/')) await showTab(page, 'Combat');
  else await openSheetTab(page, memory.saved[0].id, 'Combat');
  await expect(combatPanel(page)).toBeVisible();
}

/** The row of a manoeuvre or a weapon in the tables, found by the name in its first cell. */
export const tableRow = (page: Page, name: string): Locator =>
  combatPanel(page)
    .locator('tbody tr')
    .filter({ has: page.locator('[data-field="name"]', { hasText: new RegExp(`^${escaped(name)}$`) }) });

/** One cell of a row, by the field the markup names it. */
export const cellOf = (row: Locator, field: string): Locator => row.locator(`[data-field="${field}"]`);
