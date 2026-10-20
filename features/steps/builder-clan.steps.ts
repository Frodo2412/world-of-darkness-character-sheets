// The Clan screen: the thirteen clans and Caitiff, a choice that is kept and cannot be cleared.

import { expect } from '@playwright/test';
import type { DataTable } from 'playwright-bdd';
import { Then, When } from './fixtures';
import { chooseClan, clanSelect, openClanScreen } from './support/clan';

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
