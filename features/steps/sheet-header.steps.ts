import { expect, type Page } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import {
  createCharacter,
  openRoster,
  rosterEntries,
  sheetAddress,
  sheetField,
} from './support/pages';
import { characterWith, saveCharacters } from './support/seed';
import { ensureEditing } from './support/sheet';

async function enter(
  page: Page,
  entered: Map<string, string>,
  label: string,
  text: string,
): Promise<void> {
  await sheetField(page, label).fill(text);
  entered.set(label, text);
}

Given("a player viewing a new character's sheet", async ({ page }) => {
  await createCharacter(page);
});

Given("a player viewing a character's sheet", async ({ page }) => {
  await createCharacter(page);
});

Given('two saved characters', async ({ page, memory }) => {
  memory.saved = [characterWith({}), characterWith({})];
  await saveCharacters(page, memory.saved);
});

When(
  'they enter {string} as {word} and {string} as {word}',
  async ({ page, memory }, first: string, firstLabel: string, second: string, secondLabel: string) => {
    await enter(page, memory.entered, firstLabel, first);
    await enter(page, memory.entered, secondLabel, second);
  },
);

When('they reload the sheet', async ({ page }) => {
  await page.reload();
});

When('the player names the first one {string}', async ({ page, memory }, name: string) => {
  await page.goto(sheetAddress(memory.saved[0].id));
  await ensureEditing(page);
  await enter(page, memory.entered, 'Name', name);
});

Then(
  '{word} shows {string} and {word} shows {string}',
  async ({ page }, firstLabel: string, first: string, secondLabel: string, second: string) => {
    await ensureEditing(page);
    await expect(sheetField(page, firstLabel)).toHaveValue(first);
    await expect(sheetField(page, secondLabel)).toHaveValue(second);
  },
);

Then('both entries are kept exactly as typed and nothing is flagged', async ({ page, memory }) => {
  expect(memory.entered.size).toBe(2);
  for (const [label, text] of memory.entered) {
    await expect(sheetField(page, label)).toHaveValue(text);
  }
  await expect(page.locator('[aria-invalid="true"], :invalid')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

Then("the second character's Name is still empty", async ({ page, memory }) => {
  await page.goto(sheetAddress(memory.saved[1].id));
  await ensureEditing(page);
  await expect(sheetField(page, 'Name')).toBeVisible();
  await expect(sheetField(page, 'Name')).toHaveValue('');
});

Given('no saved character has the id in the sheet address', async () => {
  // Storage starts empty, so no id matches.
});

When('the player opens that address', async ({ page }) => {
  await page.goto(sheetAddress('no-such-character'));
});

When('the player opens the sheet address with no character id', async ({ page }) => {
  await page.goto('/sheet/');
});

Then(
  'they see a "character not found" message with a link to the roster',
  async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Character not found' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Character sheet' })).toBeHidden();

    await page.getByRole('link', { name: 'Go to your characters' }).click();
    await expect(page.getByRole('heading', { name: 'Characters' })).toBeVisible();
  },
);

Then('the roster still lists no additional character', async ({ page }) => {
  await openRoster(page);
  await expect(page.getByText('No characters yet')).toBeVisible();
  await expect(rosterEntries(page)).toHaveCount(0);
});
