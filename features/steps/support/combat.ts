import { expect, type Locator, type Page } from '@playwright/test';
import { escaped } from './text';
import { activePanel, openSheetTab, showTab, tabPanelOf } from './tabs';

// This file is the one place that knows the Combat tab's markup: the steps ask for tables, rows and the
// Weapon roll panel through the functions below.

const TAB = 'Combat';

export const combatPanel = (page: Page): Locator => tabPanelOf(page, 'combat');

export type CombatTable = 'melee-manoeuvres' | 'melee-weapons' | 'ranged-manoeuvres' | 'ranged-weapons';

/** The rows of one of the four tables. */
export const rowsOf = (page: Page, table: CombatTable): Locator => combatPanel(page).locator(`[data-table="${table}"] tbody tr`);

/** The row of a table whose name is `name`. */
export const rowNamed = (page: Page, table: CombatTable, name: string): Locator =>
  rowsOf(page, table).filter({ has: page.locator('.combat-name', { hasText: new RegExp(`^${escaped(name)}$`) }) });

/** The Weapon roll panel. */
export const rollPanel = (page: Page): Locator => combatPanel(page).locator('[data-roll]');

/** One of the panel's pickers: weapon, manoeuvre, target or range. */
export const picker = (page: Page, name: 'weapon' | 'manoeuvre' | 'target' | 'range'): Locator => rollPanel(page).locator(`[data-pick="${name}"]`);

export const attackDice = (page: Page): Locator => rollPanel(page).locator('[data-attack-dice]');
export const attackFormula = (page: Page): Locator => rollPanel(page).locator('[data-attack-formula]');
export const attackAccuracy = (page: Page): Locator => rollPanel(page).locator('[data-attack-accuracy]');
export const attackDifficulty = (page: Page): Locator => rollPanel(page).locator('[data-attack-difficulty]');
export const damageDice = (page: Page): Locator => rollPanel(page).locator('[data-damage-dice]');

/** The number a text such as "4 dice" or "1 die" holds. */
export const numberIn = async (locator: Locator): Promise<number> => Number(((await locator.textContent()) ?? '').match(/-?\d+/)?.[0]);

/** Shows the Combat tab as a player does when a sheet is open, or by its address when none is. */
export async function showCombat(page: Page, id: string): Promise<void> {
  if (/\/sheet\//.test(page.url())) await showTab(page, TAB);
  else await openSheetTab(page, id, TAB);
  await expect(activePanel(page)).toBeVisible();
  await expect(combatPanel(page)).toBeVisible();
}
