import { expect, type Page } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import { buildWith, saveBuilds } from './support/builder';
import {
  actionName,
  buildEntries,
  entryAction,
  entryNamed,
  openRoster,
  rosterEntries,
} from './support/pages';
import { characterWith, saveCharacters } from './support/seed';
import { overwriteRecord } from './support/storage';

/** The accessible name of each "Continue" action on the roster. */
const continueNames = (page: Page): Promise<string[]> =>
  entryAction(buildEntries(page), 'Continue').evaluateAll((links) =>
    links.map((link) => link.getAttribute('aria-label') ?? link.textContent ?? ''),
  );

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
  await page.getByRole('link', { name: actionName('Continue', name), exact: true }).click();
});

// Then

Then('the roster still lists {string} as in progress', async ({ page }, name: string) => {
  await openRoster(page);
  await expect(entryNamed(page, name)).toContainText('In progress');
});

Then('the roster lists the text {string}', async ({ page }, text: string) => {
  await expect(rosterEntries(page).getByRole('heading', { level: 3 })).toHaveText(text);
});

Then('the builder is shown', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Build a character' })).toBeVisible();
});

Then('the continue controls have different accessible names', async ({ page }) => {
  const names = await continueNames(page);
  expect(names).toHaveLength(2);
  expect(new Set(names).size).toBe(2);
});
