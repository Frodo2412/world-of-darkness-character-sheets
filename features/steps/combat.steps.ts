import { expect, type Locator, type Page } from '@playwright/test';
import type { DataTable } from 'playwright-bdd';
import { Given, Then, When } from './fixtures';
import { escaped } from './support/text';
import {
  cellOf,
  combatPanel,
  expectListed,
  listedCounts,
  rowsOf,
  saveCombatCharacter,
  searchField,
  sectionControl,
  showCombat,
  tableRow,
  tablesControl,
} from './support/combat';

// The steps of the Combat scenarios. Each one that is not shared names the tab ("on the Combat
// tab"), so it never has the same words as a step of another tab.

// Arranging

Given(/^a character with (.+) on the Combat tab$/, async ({ page, memory }, words: string) => {
  await saveCombatCharacter(page, memory, words);
});

// Choosing

When(/^(Melee|Ranged) is chosen on the Combat tab$/, async ({ page, memory }, table: string) => {
  await showCombat(page, memory);
  await tablesControl(page).getByRole('button', { name: table, exact: true }).click();
});

When('the player chooses {string} on the Combat tab', async ({ page, memory }, label: string) => {
  await showCombat(page, memory);
  await sectionControl(page).getByRole('button', { name: label, exact: true }).click();
});

When('the player searches {string} on the Combat tab', async ({ page, memory }, query: string) => {
  await showCombat(page, memory);
  await searchField(page).fill(query);
});

When(/^the player presses "([^"]+)" for the (.+) on the Combat tab$/, async ({ page, memory }, button: string, weapon: string) => {
  await showCombat(page, memory);
  await combatPanel(page).getByRole('button', { name: `${button}: ${weapon}`, exact: true }).click();
});

// What the tables show

Then(/^(.+) shows "([^"]+)" with "([^"]+)" on the Combat tab$/, async ({ page }, name: string, dice: string, formula: string) => {
  const row = tableRow(page, name);
  await expect(cellOf(row, 'pool')).toHaveText(dice);
  await expect(cellOf(row, 'formula')).toHaveText(formula);
});

Then('these manoeuvres show {string} and the rulebook\'s values on the Combat tab', async ({ page }, dice: string, table: DataTable) => {
  for (const values of table.hashes()) {
    const row = tableRow(page, values.Manoeuvre);
    await expect(cellOf(row, 'pool'), values.Manoeuvre).toHaveText(dice);
    await expect(cellOf(row, 'accuracy'), values.Manoeuvre).toHaveText(values.Accuracy);
    await expect(cellOf(row, 'difficulty'), values.Manoeuvre).toHaveText(values.Difficulty);
    await expect(cellOf(row, 'damage'), values.Manoeuvre).toHaveText(values['Base damage']);
    await expect(cellOf(row, 'page'), values.Manoeuvre).toHaveText(values.Page);
  }
});

Then('every melee weapon shows {string} and its V20 page {string} on the Combat tab', async ({ page }, dice: string, reference: string) => {
  const rows = rowsOf(page, 'melee-weapons');
  await expect(rows).toHaveCount(6);
  await expect(rows.locator('[data-field="pool"]')).toHaveText(Array(6).fill(dice));
  await expect(rows.locator('[data-field="page"]')).toHaveText(Array(6).fill(reference));
});

Then('the melee weapons show the rulebook\'s damage, type and concealment on the Combat tab', async ({ page }, table: DataTable) => {
  for (const values of table.hashes()) {
    const row = tableRow(page, values.Weapon);
    await expect(cellOf(row, 'damage'), values.Weapon).toHaveText(values.Damage);
    await expect(cellOf(row, 'type'), values.Weapon).toHaveText(values.Type);
    await expect(cellOf(row, 'conceal'), values.Weapon).toHaveText(values.Concealment);
  }
});

Then(
  /^"([^"]+)" shows "([^"]+)", accuracy "([^"]+)", difficulty "([^"]+)" and damage "([^"]+)" on the Combat tab$/,
  async ({ page }, name: string, dice: string, accuracy: string, difficulty: string, damage: string) => {
    const row = tableRow(page, name);
    await expect(cellOf(row, 'pool')).toHaveText(dice);
    await expect(cellOf(row, 'accuracy')).toHaveText(accuracy);
    await expect(cellOf(row, 'difficulty')).toHaveText(difficulty);
    await expect(cellOf(row, 'damage')).toHaveText(String(damage));
  },
);

Then(
  /^"([^"]+)" shows accuracy "([^"]+)", difficulty "([^"]+)" and damage "([^"]+)" on the Combat tab$/,
  async ({ page }, name: string, accuracy: string, difficulty: string, damage: string) => {
    const row = tableRow(page, name);
    await expect(cellOf(row, 'accuracy')).toHaveText(accuracy);
    await expect(cellOf(row, 'difficulty')).toHaveText(difficulty);
    await expect(cellOf(row, 'damage')).toHaveText(String(damage));
  },
);

Then(
  /^"([^"]+)" shows damage (\d+), range (\d+), rate (\d+), clip (\d+), concealment "([^"]+)" and "([^"]+)" on the Combat tab$/,
  async ({ page }, name: string, damage: number, range: number, rate: number, clip: number, conceal: string, reference: string) => {
    const row = tableRow(page, name);
    await expect(cellOf(row, 'damage')).toHaveText(String(damage));
    await expect(cellOf(row, 'range')).toHaveText(String(range));
    await expect(cellOf(row, 'rate')).toHaveText(String(rate));
    await expect(cellOf(row, 'clip')).toHaveText(String(clip));
    await expect(cellOf(row, 'conceal')).toHaveText(conceal);
    await expect(cellOf(row, 'page')).toHaveText(reference);
  },
);

Then('{string} shows {string} on the Combat tab', async ({ page }, name: string, dice: string) => {
  await expect(cellOf(tableRow(page, name), 'pool')).toHaveText(dice);
});

Then('{string} shows clip {string} on the Combat tab', async ({ page }, name: string, clip: string) => {
  await expect(cellOf(tableRow(page, name), 'clip')).toHaveText(clip);
});

// What the section control and the search leave listed

Then('{string} is chosen on the Combat tab', async ({ page }, label: string) => {
  await expect(sectionControl(page).getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(sectionControl(page).locator('[aria-pressed="true"]')).toHaveCount(1);
});

Then(/^"([^"]+)" is chosen and (.+) are listed on the Combat tab$/, async ({ page }, label: string, words: string) => {
  await expect(sectionControl(page).getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expectListed(page, listedCounts(words));
});

Then(/^only (.+) are listed and the (Melee|Ranged) sub-tab is selected on the Combat tab$/, async ({ page }, words: string, table: string) => {
  await expectListed(page, listedCounts(words));
  await expect(tablesControl(page).getByRole('button', { name: table, exact: true })).toHaveAttribute('aria-pressed', 'true');
});

Then('only the one melee weapon {word} is listed on the Combat tab', async ({ page }, name: string) => {
  await expectListed(page, { ...listedCounts(''), 'melee-weapons': 1 });
  await expect(rowsOf(page, 'melee-weapons').locator('[data-field="name"]')).toHaveText([name]);
});

Then('only the two ranged weapons are listed on the Combat tab', async ({ page }) => {
  await expectListed(page, listedCounts('two ranged weapons'));
});

Then('the ranged weapons table lists exactly {string} and {string} on the Combat tab', async ({ page }, first: string, second: string) => {
  await expect(rowsOf(page, 'ranged-weapons').locator('[data-field="name"]')).toHaveText([first, second]);
});

Then('{string} is shown on the Combat tab', async ({ page }, text: string) => {
  await expect(combatPanel(page).getByText(text, { exact: true })).toBeVisible();
});

// The weapon chosen for the roll

/** The buttons called "<name>: <weapon>" that say they are pressed. */
const pressedButtons = (page: Page, name: string): Locator =>
  combatPanel(page).getByRole('button', { name: new RegExp(`^${escaped(name)}: `), pressed: true });

Then('{string} is pressed for the {word} alone on the Combat tab', async ({ page }, button: string, weapon: string) => {
  await expect(pressedButtons(page, button)).toHaveCount(1);
  await expect(pressedButtons(page, button)).toHaveAccessibleName(`${button}: ${weapon}`);
});

Then('{string} is pressed for no weapon on the Combat tab', async ({ page }, button: string) => {
  await expect(pressedButtons(page, button)).toHaveCount(0);
});
