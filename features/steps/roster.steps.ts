import { expect } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import { SHEET_ADDRESS, createCharacter, openRoster, rosterEntries } from './support/pages';
import { characterWith, saveCharacters } from './support/seed';


Given('a player with no saved characters', async () => {
  // Every scenario starts in a fresh browser with empty storage.
});

Given('a player who has created a character', async ({ page }) => {
  await createCharacter(page);
});

Given('a player who has created two characters', async ({ page }) => {
  await createCharacter(page);
  await createCharacter(page);
});

Given(
  'a saved character named {string} of clan {string} played by {string}',
  async ({ page }, name: string, clan: string, player: string) => {
    await saveCharacters(page, [characterWith({ name, clan, player })]);
  },
);

When('they open the roster', async ({ page }) => {
  await openRoster(page);
});

When('the player opens the roster', async ({ page }) => {
  await openRoster(page);
});

When('they create a V20 character', async ({ page }) => {
  await createCharacter(page);
});

When('they reload the roster', async ({ page }) => {
  await openRoster(page);
  await page.reload();
});

Then('they see a message that there are no characters yet', async ({ page }) => {
  await expect(page.getByText('No characters yet')).toBeVisible();
});

Then('they see a way to create a V20 character', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'New V20 character' })).toBeVisible();
});

Then('the sheet for a new blank character is shown', async ({ page }) => {
  await expect(page).toHaveURL(SHEET_ADDRESS);
  await expect(page.getByRole('heading', { name: 'Character sheet' })).toBeVisible();
});

Then('the roster lists one character shown as {string}', async ({ page }, name: string) => {
  await openRoster(page);
  await expect(rosterEntries(page)).toHaveCount(1);
  await expect(rosterEntries(page).getByRole('link', { name })).toBeVisible();
});

Then('two separate characters are listed', async ({ page }) => {
  await expect(rosterEntries(page)).toHaveCount(2);
});

Then('opening each one shows a different sheet address', async ({ page }) => {
  const addresses: string[] = [];
  for (const position of [0, 1]) {
    await openRoster(page);
    await rosterEntries(page).nth(position).getByRole('link').click();
    await expect(page).toHaveURL(SHEET_ADDRESS);
    addresses.push(page.url());
  }
  expect(addresses[0]).not.toBe(addresses[1]);
});

Then(
  'the entry shows {string}, {string} and {string}',
  async ({ page }, name: string, clan: string, player: string) => {
    const entry = rosterEntries(page).filter({ hasText: name });
    await expect(entry).toHaveCount(1);
    await expect(entry).toContainText(clan);
    await expect(entry).toContainText(player);
  },
);

Then('the character is still listed', async ({ page }) => {
  await expect(rosterEntries(page)).toHaveCount(1);
});
