import { expect, type Locator, type Page } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import {
  createAction,
  creatorCard,
  entrySlot,
  horizontalOverflow,
  openRoster,
  rosterEntries,
  rosterList,
  tab,
  tabAccessibleName,
  tabStrip,
  tabs,
} from './support/pages';
import { characterWith, inChronicles, saveCharacters, saveFullLibrary } from './support/seed';

const SCREEN_HEIGHT = 900;

const EIGHT_MORE_CHRONICLES = [
  'The Ninth Gate',
  'Blood and Marble',
  'Cold Harbour',
  'Dust of Ages',
  'Embers of Prague',
  'Fallen Crown',
  'Gilded Cage',
  'Hollow Court',
];

Given('a full library', async ({ page }) => {
  await saveFullLibrary(page);
});

Given('a full library and characters in eight more chronicles', async ({ page }) => {
  await saveFullLibrary(
    page,
    inChronicles(EIGHT_MORE_CHRONICLES).map((chronicle, index) => ({ name: `Extra ${index + 1}`, ...chronicle })),
  );
});

const SIXTY_LETTERS = 'Abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefgh'.slice(0, 60);
const LONG_NAME = SIXTY_LETTERS;
const LONG_CHRONICLE = SIXTY_LETTERS.split('').reverse().join('');

Given('a saved character whose name and chronicle are each 60 letters with no space', async ({ page }) => {
  await saveCharacters(page, [characterWith({ name: LONG_NAME, chronicle: LONG_CHRONICLE })]);
});

When('the roster is shown {int} pixels wide', async ({ page }, width: number) => {
  await page.setViewportSize({ width, height: SCREEN_HEIGHT });
  await openRoster(page);
  await expect(rosterEntries(page).first()).toBeVisible();
});

const box = async (locator: Locator) => {
  const found = await locator.boundingBox();
  if (found === null) throw new Error('the element is not drawn');
  return found;
};

Then('the Character creator card is to the right of the list', async ({ page }) => {
  const card = await box(creatorCard(page));
  const list = await box(rosterList(page));
  expect(card.x).toBeGreaterThanOrEqual(list.x + list.width);
});

Then('the Character creator card is above the list', async ({ page }) => {
  const card = await box(creatorCard(page));
  const list = await box(rosterList(page));
  expect(card.y + card.height).toBeLessThanOrEqual(list.y);
});

Then('its creation stages and both create actions are visible', async ({ page }) => {
  const stages = creatorCard(page).getByRole('listitem');
  await expect(stages).toHaveCount(3);
  for (const stage of await stages.all()) await expect(stage).toBeVisible();
  await expect(createAction(page, 'Start character creator')).toBeVisible();
  await expect(createAction(page, 'Start with a blank sheet')).toBeVisible();
});

Then('its creation stages are not shown', async ({ page }) => {
  await expect(creatorCard(page).getByRole('listitem')).toHaveCount(0);
});

Then('both create actions are visible', async ({ page }) => {
  await expect(createAction(page, 'Start character creator')).toBeVisible();
  await expect(createAction(page, 'Start with a blank sheet')).toBeVisible();
});

Then('the page does not scroll horizontally', async ({ page }) => {
  await expect.poll(() => horizontalOverflow(page)).toBe(0);
});

Then('the page content is no wider than {int} pixels', async ({ page }, limit: number) => {
  const main = await box(page.locator('main'));
  const header = await box(page.locator('header'));
  expect(Math.round(main.width)).toBe(limit);
  expect(header.width).toBeLessThanOrEqual(limit);
});

/**
 * Whether `element` lies within the screen's width and within the list card, which clips what
 * overflows it, and shows all of its own content.
 */
async function fitsTheScreen(page: Page, element: Locator): Promise<boolean> {
  const screen = page.viewportSize()!.width;
  return element.evaluate((node, width) => {
    const rect = node.getBoundingClientRect();
    const card = node.closest('.library')?.getBoundingClientRect();
    const within = card === undefined || (rect.left >= card.left && rect.right <= card.right);
    return within && rect.left >= 0 && rect.right <= width && node.scrollWidth <= node.clientWidth + 1;
  }, screen);
}

Then("every entry's name and actions lie within the screen's width and are not cut off", async ({ page }) => {
  let measured = 0;
  for (const entry of await rosterEntries(page).all()) {
    expect(await fitsTheScreen(page, entry.getByRole('heading', { level: 3 }))).toBe(true);
    for (const action of await entry.getByRole('link').all()) {
      expect(await fitsTheScreen(page, action)).toBe(true);
      measured += 1;
    }
  }
  // Some of the entries have actions, so something was measured.
  expect(measured).toBeGreaterThan(0);
});

Then("every character's and build's summary line lies within the screen's width", async ({ page }) => {
  let measured = 0;
  for (const entry of await rosterEntries(page).all()) {
    const summary = entrySlot(entry, 'summary');
    if (await summary.isVisible()) {
      expect(await fitsTheScreen(page, summary)).toBe(true);
      measured += 1;
    }
  }
  expect(measured).toBeGreaterThan(0);
});

Then("the entry's whole name and whole chronicle can be read, wrapped onto more lines if need be", async ({ page }) => {
  const entry = rosterEntries(page).first();
  for (const [part, text] of [
    [entry.getByRole('heading', { level: 3 }), LONG_NAME],
    [entrySlot(entry, 'chronicle'), LONG_CHRONICLE],
  ] as const) {
    await expect(part).toHaveText(text);
    expect(await fitsTheScreen(page, part)).toBe(true);
  }
});

Then("the chronicle's tab has its full name as its accessible name", async ({ page }) => {
  await expect(tab(page, `${LONG_CHRONICLE} · 1`)).toHaveAccessibleName(tabAccessibleName(`${LONG_CHRONICLE} · 1`));
});

Then('pressing End on the tabs brings the last tab fully into view', async ({ page }) => {
  await tabs(page).first().focus();
  await page.keyboard.press('End');
  const last = tabs(page).last();
  await expect(last).toBeFocused();
  const strip = await box(tabStrip(page));
  const found = await box(last);
  expect(found.x).toBeGreaterThanOrEqual(strip.x - 1);
  expect(found.x + found.width).toBeLessThanOrEqual(strip.x + strip.width + 1);
});
