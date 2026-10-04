import { expect, type Page } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import { openRoster, rosterEntries, sheetAddress } from './support/pages';
import { characterWith, saveCharacters } from './support/seed';

/** Details for the characters the scenarios name, so "unchanged" has something to check. */
const DETAILS: Record<string, { clan: string; player: string }> = {
  Lucita: { clan: 'Lasombra', player: 'Ana' },
  Fatima: { clan: 'Assamite', player: 'Ben' },
};

const confirmation = (page: Page) => page.getByRole('dialog', { name: 'Delete character?' });

async function startDeleting(page: Page, name: string): Promise<void> {
  await openRoster(page);
  await page.getByRole('button', { name: `Delete ${name}`, exact: true }).click();
  await expect(confirmation(page)).toBeVisible();
}

async function confirm(page: Page): Promise<void> {
  await confirmation(page).getByRole('button', { name: 'Delete' }).click();
  await expect(confirmation(page)).toBeHidden();
}

Given(
  'saved characters {string} and {string}',
  async ({ page, memory }, first: string, second: string) => {
    memory.saved = [first, second].map((name) => characterWith({ name, ...DETAILS[name] }));
    await saveCharacters(page, memory.saved);
  },
);

Given('a saved character {string}', async ({ page, memory }, name: string) => {
  memory.saved = [characterWith({ name, ...DETAILS[name] })];
  await saveCharacters(page, memory.saved);
});

Given('{string} is the only saved character', async ({ page, memory }, name: string) => {
  memory.saved = [characterWith({ name, ...DETAILS[name] })];
  await saveCharacters(page, memory.saved);
});

When('the player deletes {string} and confirms', async ({ page }, name: string) => {
  await startDeleting(page, name);
  await confirm(page);
});

When('the player starts deleting {string} and cancels', async ({ page }, name: string) => {
  await startDeleting(page, name);
  await expect(confirmation(page).getByRole('button', { name: 'Cancel' })).toBeFocused();
  await confirmation(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(confirmation(page)).toBeHidden();
});

When('the player starts deleting it', async ({ page, memory }) => {
  await startDeleting(page, memory.saved[0].header.name);
});

When('the player deletes it and confirms', async ({ page, memory }) => {
  await startDeleting(page, memory.saved[0].header.name);
  await confirm(page);
});

Then('the roster lists only {string}', async ({ page }, name: string) => {
  await expect(rosterEntries(page)).toHaveCount(1);
  await expect(rosterEntries(page).getByRole('link', { name })).toBeVisible();

  // Still so after a reload: the character is gone from storage, not just from view.
  await page.reload();
  await expect(rosterEntries(page)).toHaveCount(1);
  await expect(rosterEntries(page).getByRole('link', { name })).toBeVisible();
});

Then(
  "opening Lucita's former sheet address shows {string}",
  async ({ page, memory }, message: string) => {
    await page.goto(sheetAddress(memory.saved[0].id));
    await expect(page.getByRole('heading', { name: new RegExp(message, 'i') })).toBeVisible();
  },
);

Then(
  'the roster still lists both characters with their details unchanged',
  async ({ page, memory }) => {
    await page.reload();
    await expect(rosterEntries(page)).toHaveCount(2);
    for (const { header } of memory.saved) {
      const entry = rosterEntries(page).filter({ hasText: header.name });
      await expect(entry).toContainText(header.clan);
      await expect(entry).toContainText(header.player);
    }
  },
);

Then('the confirmation asks about {string} by name', async ({ page }, name: string) => {
  await expect(confirmation(page)).toContainText(name);
});

Then('the roster shows the empty state', async ({ page }) => {
  await expect(page.getByText('No characters yet')).toBeVisible();
  await expect(rosterEntries(page)).toHaveCount(0);
});
