import { expect } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import { doneButton } from './support/sheet';
import { tabPanelOf } from './support/tabs';
import {
  disciplineItem,
  disciplinesPanel,
  editors,
  namesIn,
  powerRow,
  powerRows,
  saveDisciplineCharacter,
  showDisciplines,
} from './support/disciplines';

// The steps of the Disciplines scenarios. Each one that is not shared names the tab ("on the
// Disciplines tab"), so it never has the same words as a step of another tab.

// Arranging

Given(/^a character with (.+) on the Disciplines tab$/, async ({ page, memory }, words: string) => {
  await saveDisciplineCharacter(page, memory, words);
});

// Opening

When('the Disciplines tab is chosen from the tab bar on the Disciplines tab', async ({ page, memory }) => {
  await showDisciplines(page, memory);
});

When('{word} is selected on the Disciplines tab', async ({ page, memory }, name: string) => {
  await showDisciplines(page, memory);
  await disciplineItem(page, name).getByRole('button').click();
});

When('the player follows its link on the Disciplines tab', async ({ page }) => {
  await disciplinesPanel(page).getByRole('link', { name: 'Character sheet', exact: true }).click();
});

// What the list shows

Then('{word} shows {string} and {string} on the Disciplines tab', async ({ page }, name: string, rating: string, unlocked: string) => {
  const item = disciplineItem(page, name);
  await expect(item.getByText(rating, { exact: true })).toBeVisible();
  await expect(item.getByText(unlocked, { exact: true })).toBeVisible();
});

Then('{word} shows {string} on the Disciplines tab', async ({ page }, name: string, text: string) => {
  await expect(disciplineItem(page, name).getByText(text, { exact: true })).toBeVisible();
});

Then(
  /^(\w+) shows "([^"]+)" although the catalogue lists no \w+ powers on the Disciplines tab$/,
  async ({ page }, name: string, text: string) => {
    await expect(disciplineItem(page, name).getByText(text, { exact: true })).toBeVisible();
    await disciplineItem(page, name).getByRole('button').click();
    await expect(powerRows(page)).toHaveCount(0);
  },
);

Then('{string} shows its name and {string} and no powers on the Disciplines tab', async ({ page }, name: string, rating: string) => {
  const item = disciplineItem(page, name);
  await expect(item.getByText(rating, { exact: true })).toBeVisible();
  await item.getByRole('button').click();
  await expect(powerRows(page)).toHaveCount(0);
});

Then('{word} is not listed on the Disciplines tab', async ({ page }, name: string) => {
  await expect(disciplineItem(page, name)).toHaveCount(0);
});

Then('the {string} control reads {string} on the Disciplines tab', async ({ page }, control: string, text: string) => {
  const group = disciplinesPanel(page).getByRole('group', { name: 'Disciplines shown' });
  await expect(group.getByRole('button', { name: text, exact: true })).toBeVisible();
  expect(text.startsWith(control)).toBe(true);
});

Then('{string} is shown with an {string} button on the Disciplines tab', async ({ page }, message: string, button: string) => {
  const empty = disciplinesPanel(page).locator('.dossier-empty');
  await expect(empty.getByText(message, { exact: true })).toBeVisible();
  await expect(empty.getByRole('button', { name: button, exact: true })).toBeVisible();
});

// What the powers show

Then(/^the powers are listed (.+) on the Disciplines tab$/, async ({ page }, names: string) => {
  const headings = powerRows(page).getByRole('heading');
  await expect(headings).toHaveText(namesIn(names));
});

Then(/^(.+) (?:is|are) Known on the Disciplines tab$/, async ({ page }, names: string) => {
  for (const name of namesIn(names)) {
    await expect(powerRow(page, name)).toHaveAttribute('data-state', 'known');
    await expect(powerRow(page, name).getByText('Known', { exact: true })).toBeVisible();
  }
});

Then(/^(.+) is Locked with "([^"]+)" on the Disciplines tab$/, async ({ page }, name: string, requirement: string) => {
  await expect(powerRow(page, name)).toHaveAttribute('data-state', 'locked');
  await expect(powerRow(page, name).getByText('Locked', { exact: true })).toBeVisible();
  await expect(powerRow(page, name).getByText(requirement, { exact: true })).toBeVisible();
});

// Read-only

// The shared "the Character sheet tab is shown" also needs play mode (it looks for the Edit button), and this scenario is in edit mode.
Then('the Character sheet tab is shown on the Disciplines tab', async ({ page }) => {
  await expect(tabPanelOf(page, 'sheet')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Attributes', exact: true })).toBeVisible();
});

Then('the sheet is still in edit mode on the Disciplines tab', async ({ page }) => {
  await expect(doneButton(page)).toBeVisible();
});

Then('nothing on the Disciplines tab can be edited', async ({ page }) => {
  await expect(disciplinesPanel(page)).toBeVisible();
  await expect(editors(page)).toHaveCount(0);
});

Then('the tab says {string} on the Disciplines tab', async ({ page }, text: string) => {
  await expect(disciplinesPanel(page).getByText(text, { exact: true })).toBeVisible();
});
