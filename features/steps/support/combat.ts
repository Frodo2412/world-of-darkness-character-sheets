import { expect, type Locator, type Page } from '@playwright/test';
import type { V20Character } from '../../../src/domain/v20/character';
import { memoryFor, type ScenarioMemory } from '../fixtures';
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

/** The body rows of one of the tab's tables, by the name the markup gives it ("melee-weapons"). */
export const rowsOf = (page: Page, table: string): Locator => combatPanel(page).locator(`[data-table="${table}"] tbody tr`);

/** The control that chooses between the Melee and Ranged tables. */
export const tablesControl = (page: Page): Locator => combatPanel(page).getByRole('group', { name: 'Combat tables', exact: true });

/** The control that chooses what the tab lists: All, Close combat or Ranged combat. */
export const sectionControl = (page: Page): Locator => combatPanel(page).getByRole('group', { name: 'Section shown', exact: true });

/** The search field. */
export const searchField = (page: Page): Locator => combatPanel(page).getByRole('searchbox', { name: 'Search manoeuvres and weapons', exact: true });

const NUMBERS: Record<string, number> = { one: 1, two: 2, three: 3, five: 5, six: 6, eleven: 11, thirteen: 13 };

/** The table each kind of row a scenario names is listed in. */
const TABLES: Record<string, string> = {
  'close combat manoeuvres': 'melee-manoeuvres',
  'ranged manoeuvres': 'ranged-manoeuvres',
  'melee weapons': 'melee-weapons',
  'ranged weapons': 'ranged-weapons',
  'melee weapon': 'melee-weapons',
};

/** How many rows each table lists, by table, as words say it: "the thirteen close combat manoeuvres and the six melee weapons". */
export function listedCounts(words: string): Record<string, number> {
  const counts = Object.fromEntries(Object.values(TABLES).map((table) => [table, 0]));
  for (const [, count, kind] of words.matchAll(/(\w+) (close combat manoeuvres|ranged manoeuvres|melee weapons?|ranged weapons)/g)) {
    counts[TABLES[kind]] = NUMBERS[count];
  }
  return counts;
}

/** Checks the number of rows each of the four tables lists. */
export async function expectListed(page: Page, counts: Record<string, number>): Promise<void> {
  for (const [table, count] of Object.entries(counts)) await expect(rowsOf(page, table), table).toHaveCount(count);
}

/** What this tab's steps remember about the scenario. */
interface CombatMemory {
  /** Every stored record as the scenario left the tab after arranging it, to check later that using the tab changed nothing. */
  stored?: Record<string, string>;
}

export const combatMemory = (memory: ScenarioMemory): CombatMemory => memoryFor<CombatMemory>({ memory }, 'combat', () => ({}));

/** The Weapon roll panel. */
export const rollPanel = (page: Page): Locator => combatPanel(page).getByRole('region', { name: 'Weapon roll', exact: true });

/** One of the panel's pickers or entries, by its label. */
export const rollInput = (page: Page, label: string): Locator =>
  rollPanel(page)
    .getByRole('combobox', { name: label, exact: true })
    .or(rollPanel(page).getByRole('spinbutton', { name: label, exact: true }));

/** One of the panel's readings, by the field the markup names it. */
export const rollReading = (page: Page, field: string): Locator => rollPanel(page).locator(`[data-field="${field}"]`);

/** Chooses a weapon and a manoeuvre in the panel's pickers, opening the tab first when it is not showing. */
export async function selectInRoll(page: Page, memory: { saved: V20Character[] }, weapon: string, manoeuvre: string): Promise<void> {
  await showCombat(page, memory);
  await rollInput(page, 'Weapon').selectOption(weapon);
  await rollInput(page, 'Manoeuvre').selectOption(manoeuvre);
}

/** Types a number of extra successes and leaves the field, which commits the entry. */
export async function enterExtraSuccesses(page: Page, extra: number): Promise<void> {
  const entry = rollInput(page, 'Extra successes');
  await entry.fill(String(extra));
  await entry.blur();
}
