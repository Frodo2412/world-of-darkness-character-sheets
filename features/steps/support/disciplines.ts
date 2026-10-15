import { expect, type Locator, type Page } from '@playwright/test';
import { DISCIPLINE_CATALOGUE } from '../../../src/domain/v20/disciplines';
import { escaped } from './text';
import { activePanel, openSheetTab, showTab, tabPanelOf } from './tabs';

// This file is the one place that knows the Disciplines tab's markup: the steps ask for the list, the
// detail and the powers through the functions below.

const TAB = 'Disciplines';

export const disciplinesPanel = (page: Page): Locator => tabPanelOf(page, 'disciplines');

/** The list of Disciplines on the left. */
export const disciplineList = (page: Page): Locator => disciplinesPanel(page).getByRole('list', { name: 'Disciplines', exact: true });

/** The list item for one Discipline. */
export const disciplineItem = (page: Page, name: string): Locator =>
  disciplineList(page).getByRole('button', { name: new RegExp(`^${escaped(name)} \\d`) });

/** The chosen Discipline's card. */
export const disciplineDetail = (page: Page): Locator => disciplinesPanel(page).locator('[data-discipline-detail]');

/** A power's disclosure, found by its name. */
export const powerRow = (page: Page, name: string): Locator =>
  disciplinesPanel(page)
    .locator('details.discipline-power')
    .filter({ has: page.locator('summary .discipline-power-name', { hasText: new RegExp(`^${escaped(name)}$`) }) });

/** The summary line of a power: what the keyboard focuses and presses. */
export const powerSummary = (page: Page, name: string): Locator => powerRow(page, name).locator('summary');

/** The value the power's rules list under a label. */
export const ruleValue = (row: Locator, label: string): Locator =>
  row.locator('dt', { hasText: new RegExp(`^${escaped(label)}$`) }).locator('xpath=following-sibling::dd[1]');

/** The Discipline of the catalogue that holds a power. */
export function disciplineOfPower(power: string): string {
  const entry = DISCIPLINE_CATALOGUE.find((candidate) => candidate.powers.some((each) => each.name === power));
  if (entry === undefined) throw new Error(`no catalogued Discipline has a power called ${power}`);
  return entry.name;
}

/** Shows the Disciplines tab the way a player does: from the bar when the sheet is open, else by its address. */
export async function showDisciplines(page: Page, id: string): Promise<void> {
  if (/\/sheet\//.test(page.url())) await showTab(page, TAB);
  else await openSheetTab(page, id, TAB);
  await expect(activePanel(page)).toBeVisible();
  await expect(disciplinesPanel(page)).toBeVisible();
}

/** Chooses a Discipline in the list, whichever list is showing. */
export async function selectDiscipline(page: Page, name: string): Promise<void> {
  const item = disciplineItem(page, name);
  if ((await item.getAttribute('aria-current')) !== 'true') await item.click();
  await expect(item).toHaveAttribute('aria-current', 'true');
}

/** Opens a power's disclosure (choosing its Discipline first) and returns it. */
export async function expandPower(page: Page, name: string): Promise<Locator> {
  await selectDiscipline(page, disciplineOfPower(name));
  const row = powerRow(page, name);
  if (!(await row.evaluate((details) => (details as HTMLDetailsElement).open))) await powerSummary(page, name).click();
  await expect(row).toHaveJSProperty('open', true);
  return row;
}

/** The names of the powers the detail lists, in order. */
export const listedPowers = (page: Page): Promise<string[]> => disciplinesPanel(page).locator('details.discipline-power .discipline-power-name').allTextContents();
