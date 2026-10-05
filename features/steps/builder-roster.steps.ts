import { expect, type Page } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import { buildWith, saveBuilds } from './support/builder';
import {
  buildEntries,
  confirmDelete,
  deleteConfirmation,
  openRoster,
  rosterEntries,
  startDeleting,
} from './support/pages';
import { characterWith, saveCharacters } from './support/seed';
import { overwriteRecord } from './support/storage';

const buildsList = (page: Page) => page.getByRole('list', { name: 'Builds in progress' });

const entryFor = (page: Page, name: string) =>
  buildEntries(page).filter({ has: page.getByText(name, { exact: true }) });

async function accessibleNames(page: Page, pattern: RegExp): Promise<string[]> {
  return buildsList(page)
    .locator('a, button')
    .evaluateAll(
      (controls, source) =>
        controls
          .map((control) => control.getAttribute('aria-label') ?? control.textContent ?? '')
          .filter((name) => new RegExp(source).test(name)),
      pattern.source,
    );
}

// Given

Given('a saved character named {string}', async ({ page }, name: string) => {
  await saveCharacters(page, [characterWith({ name })]);
});

Given('a build in progress named {string}', async ({ page }, name: string) => {
  await saveBuilds(page, [buildWith({ concept: { name } })]);
});

Given(
  'a build in progress named {string} of clan {string}',
  async ({ page }, name: string, clan: string) => {
    await saveBuilds(page, [buildWith({ concept: { name }, clan })]);
  },
);

Given(
  'a build in progress named {string} with base generation {string}',
  async ({ page }, name: string, generation: string) => {
    const baseGeneration = parseInt(generation, 10);
    await saveBuilds(page, [buildWith({ concept: { name }, settings: { baseGeneration } })]);
  },
);

Given(
  'builds in progress named {string} and {string}',
  async ({ page }, first: string, second: string) => {
    await saveBuilds(page, [buildWith({ concept: { name: first } }), buildWith({ concept: { name: second } })]);
  },
);

Given('two builds in progress with no name', async ({ page }) => {
  await saveBuilds(page, [buildWith(), buildWith()]);
});

Given('a saved character, a build in progress and an unreadable build', async ({ page }) => {
  await saveCharacters(page, [characterWith({ name: 'Lucita', clan: 'Lasombra' })]);
  const damaged = buildWith();
  await saveBuilds(page, [buildWith({ concept: { name: 'Beckett' }, clan: 'Gangrel' }), damaged]);
  await overwriteRecord(page, damaged.id, 'not a build');
});

// When

When('the player continues {string} from the roster', async ({ page }, name: string) => {
  await openRoster(page);
  await page.getByRole('link', { name: `Continue ${name}`, exact: true }).click();
});

When(
  'the player asks to delete {string} and cancels',
  async ({ page, memory }, name: string) => {
    await startDeleting(page, name);
    memory.asked = (await deleteConfirmation(page).locator('p').textContent()) ?? '';
    await expect(deleteConfirmation(page).getByRole('button', { name: 'Cancel' })).toBeFocused();
    await deleteConfirmation(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(deleteConfirmation(page)).toBeHidden();
  },
);

When('the player deletes the unreadable build and confirms', async ({ page }) => {
  await startDeleting(page, 'unreadable build');
  await confirmDelete(page);
});

// Then

Then('the builds in progress list shows {string}', async ({ page }, name: string) => {
  await expect(entryFor(page, name)).toHaveCount(1);
  await expect(entryFor(page, name)).toContainText('In progress');
});

Then('the builds in progress list still shows {string}', async ({ page }, name: string) => {
  await openRoster(page);
  await expect(entryFor(page, name)).toHaveCount(1);
});

Then(
  'the builds in progress list shows {string} with clan {string}',
  async ({ page }, name: string, clan: string) => {
    await expect(entryFor(page, name)).toContainText(`Clan: ${clan}`);
  },
);

Then('the builds in progress list shows only {string}', async ({ page }, name: string) => {
  await expect(buildEntries(page)).toHaveCount(1);
  await expect(entryFor(page, name)).toHaveCount(1);

  // Still so after a reload: the build is gone from storage, not just from view.
  await page.reload();
  await expect(buildEntries(page)).toHaveCount(1);
  await expect(entryFor(page, name)).toHaveCount(1);
});

Then(
  'the builds in progress list shows {string} and one unreadable build',
  async ({ page }, name: string) => {
    await expect(buildEntries(page)).toHaveCount(2);
    await expect(entryFor(page, name)).toHaveCount(1);
    await expect(buildEntries(page).filter({ hasText: 'Unreadable build' })).toHaveCount(1);
  },
);

Then('the builds in progress list shows the text {string}', async ({ page }, text: string) => {
  await expect(buildEntries(page).locator('strong')).toHaveText(text);
});

Then('the characters list shows only {string}', async ({ page }, name: string) => {
  await expect(rosterEntries(page)).toHaveCount(1);
  await expect(rosterEntries(page).getByRole('link', { name, exact: true })).toBeVisible();
});

Then('they still see the message that there are no characters yet', async ({ page }) => {
  await expect(page.getByText('No characters yet')).toBeVisible();
  await expect(rosterEntries(page)).toHaveCount(0);
});

Then('no builds in progress list is shown', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Builds in progress' })).toBeHidden();
  await expect(buildsList(page)).toBeHidden();
});

Then('the builder is shown', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Build a character' })).toBeVisible();
});

Then('the continue controls have different accessible names', async ({ page }) => {
  const names = await accessibleNames(page, /^Continue/);
  expect(names).toHaveLength(2);
  expect(new Set(names).size).toBe(2);
});

Then('the delete controls have different accessible names', async ({ page }) => {
  const names = await accessibleNames(page, /^Delete/);
  expect(names).toHaveLength(2);
  expect(new Set(names).size).toBe(2);
});

Then('they were asked {string}', async ({ memory }, question: string) => {
  expect(memory.asked).toBe(question);
});
