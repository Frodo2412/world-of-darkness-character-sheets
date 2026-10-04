import { expect, type Page } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import { openRoster, rosterEntries, sheetAddress, sheetField } from './support/pages';
import { characterWith, saveCharacters } from './support/seed';
import { overwriteRecord, storedText } from './support/storage';

const NOT_JSON = '{"id": "broken", "header": {"name": "Fat';

const unreadableEntries = (page: Page) =>
  rosterEntries(page).filter({ hasText: 'Unreadable character' });

Given("Fatima's saved data has become unreadable", async ({ page, memory }) => {
  const fatima = memory.saved.find((character) => character.header.name === 'Fatima')!;
  memory.damaged = { id: fatima.id, ...(await overwriteRecord(page, fatima.id, NOT_JSON)) };
});

Given('a saved character whose data has become unreadable', async ({ page, memory }) => {
  const character = characterWith({ name: 'Fatima' });
  await saveCharacters(page, [character]);
  memory.damaged = { id: character.id, ...(await overwriteRecord(page, character.id, NOT_JSON)) };
});

Given('a saved record that is readable but is not a V20 character', async ({ page, memory }) => {
  const character = characterWith({});
  await saveCharacters(page, [character]);
  const record = await overwriteRecord(page, character.id, JSON.stringify({ hello: 'world' }));
  memory.damaged = { id: character.id, ...record };
});

Given('the roster reports an unreadable character', async ({ page, memory }) => {
  const character = characterWith({});
  await saveCharacters(page, [character]);
  memory.damaged = { id: character.id, ...(await overwriteRecord(page, character.id, NOT_JSON)) };
  await openRoster(page);
  await expect(unreadableEntries(page)).toHaveCount(1);
});

When('the player opens the roster and then reloads it', async ({ page }) => {
  await openRoster(page);
  await page.reload();
});

When('the player opens its sheet address', async ({ page, memory }) => {
  await page.goto(sheetAddress(memory.damaged!.id));
});

When('the player deletes that entry and confirms', async ({ page }) => {
  await unreadableEntries(page).getByRole('button', { name: /^Delete unreadable character/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete character?' });
  await dialog.getByRole('button', { name: 'Delete' }).click();
  await expect(dialog).toBeHidden();
});

Then('{string} is listed and can be opened', async ({ page }, name: string) => {
  await rosterEntries(page).getByRole('link', { name }).click();
  await expect(sheetField(page, 'Name')).toHaveValue(name);
});

Then('one entry is reported as an unreadable character', async ({ page }) => {
  await openRoster(page);
  await expect(unreadableEntries(page)).toHaveCount(1);
  await expect(rosterEntries(page)).toHaveCount(2);
});

Then('the unreadable entry is still reported', async ({ page }) => {
  await expect(unreadableEntries(page)).toHaveCount(1);
});

Then('its saved data is unchanged', async ({ page, memory }) => {
  expect(await storedText(page, memory.damaged!.key)).toBe(memory.damaged!.text);
});

Then('that entry is reported as an unreadable character', async ({ page }) => {
  await expect(unreadableEntries(page)).toHaveCount(1);
});

Then('creating a new character still works', async ({ page }) => {
  await page.getByRole('button', { name: 'New V20 character' }).click();
  await expect(sheetField(page, 'Name')).toBeEditable();

  await openRoster(page);
  await expect(rosterEntries(page)).toHaveCount(2);
  await expect(unreadableEntries(page)).toHaveCount(1);
});

Then(
  'they see that the character could not be read, with a link to the roster',
  async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Character could not be read' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Character sheet' })).toBeHidden();
    await expect(page.getByRole('link', { name: 'Go to your characters' })).toBeVisible();
  },
);

Then('it is no longer reported', async ({ page, memory }) => {
  await expect(unreadableEntries(page)).toHaveCount(0);
  await expect(page.getByText('No characters yet')).toBeVisible();
  expect(await storedText(page, memory.damaged!.key)).toBeNull();
});
