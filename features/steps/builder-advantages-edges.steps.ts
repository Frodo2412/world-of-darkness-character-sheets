// The Advantages screen's edges: a written-in Discipline named with quotes and a backslash, a Sabbat
// Background named in its row, and the six Backgrounds when freebie points buy a seventh.

import { expect } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import { addDiscipline, backgroundRow, disciplineNames, pressBackgroundChip } from './support/advantages';
import { groupBox, groupNotice, rateTrait } from './support/ranked';

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

When('I write in the Disciplines {string} and {string}', async ({ page }, first: string, second: string) => {
  await addDiscipline(page, first);
  await addDiscipline(page, second);
});

When(/^I give it (\d+) creation dots$/, async ({ page }, dots: string) => {
  await rateTrait(page, WRITTEN_IN, Number(dots));
});

// Then

Then('that Discipline is listed', async ({ page }) => {
  expect(await disciplineNames(page)).toEqual([WRITTEN_IN]);
});

Then('the Disciplines are listed as {string} and {string}', async ({ page }, first: string, second: string) => {
  expect(await disciplineNames(page)).toEqual([first, second]);
});

Then('each of those Disciplines has a rating row named for it and described by its own reasons', async ({ page }) => {
  const group = await groupBox(page, 'Disciplines');
  const listed = await disciplineNames(page);
  expect(listed.length, 'Disciplines listed').toBeGreaterThan(0);
  for (const name of listed) {
    // The row is a group named by its own label, so the name finds one row and not the look-alike.
    const row = group.getByRole('group', { name, exact: true });
    await expect(row).toHaveCount(1);
    for (const button of [`Increase ${name}`, `Decrease ${name}`]) {
      const described = await row.getByRole('button', { name: button, exact: true }).getAttribute('aria-describedby');
      // Each description names a reason inside this row (and the group's shared notice), never a look-alike row's.
      const reasons = described!.split(/\s+/).filter((id) => id.endsWith('-limit') || id.endsWith('-minimum'));
      expect(reasons).toHaveLength(1);
      await expect(row.locator(`[id="${reasons[0]}"]`)).toHaveCount(1);
      await expect(page.locator(`[id="${reasons[0]}"]`)).toHaveCount(1);
    }
  }
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
