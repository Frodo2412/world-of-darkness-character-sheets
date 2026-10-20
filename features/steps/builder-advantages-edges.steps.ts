// The Advantages screen's edges: a written-in Discipline named with quotes and a backslash, a Sabbat
// Background named in its row, and the six Backgrounds when freebie points buy a seventh.

import { expect } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import { addDiscipline, backgroundRow, disciplineNames, pressBackgroundChip } from './support/advantages';
import { groupNotice, rateTrait } from './support/ranked';

/** A name no selector could be built from: both kinds of quote and a backslash. */
const WRITTEN_IN = 'Blood "Song" \\ \'Echo\'';

// Given

Given(/^the Background chips (.+) are chosen at 0 dots$/, async ({ page }, list: string) => {
  for (const name of list.split(/, | and /)) await pressBackgroundChip(page, name);
});

// When

When('I write in a Discipline whose name has quotes and a backslash', async ({ page }) => {
  await addDiscipline(page, WRITTEN_IN);
});

When(/^I give it (\d+) creation dots$/, async ({ page }, dots: string) => {
  await rateTrait(page, WRITTEN_IN, Number(dots));
});

// Then

Then('that Discipline is listed', async ({ page }) => {
  expect(await disciplineNames(page)).toEqual([WRITTEN_IN]);
});

Then('the Backgrounds notice reads {string}', async ({ page }, text: string) => {
  await expect(await groupNotice(page, 'Backgrounds')).toHaveText(text);
});

Then(/^the (\w+) row has a button "([^"]+)"$/, async ({ page }, name: string, button: string) => {
  await expect(backgroundRow(page, name).getByRole('button', { name: button, exact: true })).toBeVisible();
});

Then('the Backgrounds count reads {string}', async ({ page }, text: string) => {
  await expect(page.locator('[data-bg-selected]')).toHaveText(text);
});
