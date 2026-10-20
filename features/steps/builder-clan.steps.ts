// The Clan screen: the thirteen clans and Caitiff, a choice that is kept and cannot be cleared.

import { expect } from '@playwright/test';
import type { DataTable } from 'playwright-bdd';
import { Then, When } from './fixtures';
import { chooseClan, clanQuestionStatus, clanSelect, openClanScreen } from './support/clan';

When('they look at the clan choices', async ({ page }) => {
  await openClanScreen(page);
});

When('they open the clan step', async ({ page }) => {
  await openClanScreen(page);
});

When('they choose the clan {string}', async ({ page }, clan: string) => {
  await chooseClan(page, clan);
});

Then(
  'apart from the {string} placeholder the choices are exactly',
  async ({ page }, placeholder: string, table: DataTable) => {
    const options = clanSelect(page).getByRole('option');
    await expect(options.first()).toHaveText(placeholder);
    await expect(options).toHaveText([placeholder, ...table.raw().flat()]);
  },
);

Then('no clan is chosen', async ({ page }) => {
  await expect(clanSelect(page).locator('option:checked')).toHaveText('Choose a clan');
});

Then('the chosen clan is {string}', async ({ page }, clan: string) => {
  await openClanScreen(page);
  await expect(clanSelect(page).locator('option:checked')).toHaveText(clan);
});

Then('the {string} placeholder can no longer be chosen', async ({ page }, placeholder: string) => {
  await expect(clanSelect(page).getByRole('option', { name: placeholder })).toBeDisabled();
});

Then("the clan question's status region is on the page and says nothing", async ({ page }) => {
  const status = clanQuestionStatus(page);
  await expect(status).toHaveAttribute('role', 'status');
  await expect(status).toBeEmpty();
  // A live region that starts out hidden is not reliably announced when it is shown with its text.
  expect(await status.evaluate((element) => element.closest('[hidden]') === null)).toBe(true);
});

Then("the clan question's status region says {string}", async ({ page }, text: string) => {
  await expect(clanQuestionStatus(page)).toContainText(text);
  await expect(clanQuestionStatus(page)).toBeVisible();
});
