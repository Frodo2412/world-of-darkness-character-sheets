import { expect, type Page } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import { createCharacter, openRoster } from './support/pages';
import { startBuild } from './support/builder';
import { withholdStorage } from './support/storage';

/** Every address a page asked for while a scenario opened it, in order. */
const requestsByPage = new WeakMap<Page, string[]>();

/** Starts noting the requests `page` makes; call before the page is opened. */
function watchRequests(page: Page): void {
  const requested: string[] = [];
  requestsByPage.set(page, requested);
  page.on('request', (request) => requested.push(request.url()));
}

/** Opens `which` the way a player gets there, so the whole journey is observed. */
async function open(page: Page, which: string): Promise<void> {
  watchRequests(page);
  switch (which) {
    case 'roster':
      await openRoster(page);
      break;
    case 'builder':
      await startBuild(page);
      break;
    case 'sheet':
      await createCharacter(page);
      break;
  }
}

When(/^a player opens the (roster|builder|sheet)$/, async ({ page }, which: string) => {
  await open(page, which);
});

/** The page title: the first level-one heading the page is showing. */
const pageTitle = (page: Page) => page.getByRole('heading', { level: 1 }).first();

Then('the Cormorant Garamond and Inter typefaces have finished loading', async ({ page }) => {
  await expect(pageTitle(page)).toBeVisible();
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    const loadedFamilies = new Set<string>();
    for (const face of document.fonts) {
      if (face.status === 'loaded') loadedFamilies.add(face.family.replace(/["']/g, ''));
    }
    return [...loadedFamilies];
  });
  expect(loaded).toEqual(expect.arrayContaining(['Cormorant Garamond', 'Inter']));
});

Then('the page title heading is drawn in Cormorant Garamond', async ({ page }) => {
  const title = pageTitle(page);
  const family = await title.evaluate((heading) => getComputedStyle(heading).fontFamily);
  expect(family).toMatch(/^["']?Cormorant Garamond["']?,/);
  // Naming the family is not enough: the face for this heading's weight must be loaded.
  const drawn = await title.evaluate((heading) => {
    const { fontWeight, fontSize, fontFamily } = getComputedStyle(heading);
    return document.fonts.check(`${fontWeight} ${fontSize} ${fontFamily}`, heading.textContent ?? '');
  });
  expect(drawn).toBe(true);
});

Then("every request the page made went to the app's own address", async ({ page, baseURL }) => {
  const requested = requestsByPage.get(page) ?? [];
  expect(requested.length).toBeGreaterThan(0);
  const elsewhere = requested.filter((url) => {
    const { protocol, origin } = new URL(url);
    return protocol !== 'data:' && protocol !== 'blob:' && origin !== new URL(baseURL!).origin;
  });
  expect(elsewhere).toEqual([]);
});

const applicationBar = (page: Page) => page.getByRole('banner');

const applicationTitle = (page: Page) =>
  applicationBar(page).getByRole('link', { name: 'Vampire: The Masquerade' });

Then(
  'the application bar shows the title {string} and the ruleset {string}',
  async ({ page }, title: string, ruleset: string) => {
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(applicationTitle(page)).toHaveText(title);
    await expect(applicationBar(page).getByText(ruleset, { exact: true })).toBeVisible();
  },
);

When('they activate the application title', async ({ page }) => {
  await applicationTitle(page).click();
});

Then('they are on the roster', async ({ page }) => {
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Characters' })).toBeVisible();
});

Then('the application title is visible', async ({ page }) => {
  await expect(applicationTitle(page)).toBeInViewport({ ratio: 1 });
});

Given('the browser does not allow the app to store data', async ({ page }) => {
  await withholdStorage(page);
});

Then('the application bar is shown above the storage message', async ({ page }) => {
  const message = page.getByRole('alert').filter({ hasText: 'cannot be saved in this browser' });
  await expect(message).toBeVisible();
  const bar = (await applicationBar(page).boundingBox())!;
  const below = (await message.boundingBox())!;
  expect(bar.y + bar.height).toBeLessThanOrEqual(below.y);
});
