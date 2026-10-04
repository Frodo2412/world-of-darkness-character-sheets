import { expect } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import { sheetField } from './support/pages';
import { ensureOnSheet, expectRating, mark, rating, setRating } from './support/ratings';

const TRACKER = /((?:temporary )?Willpower|Blood Pool)/.source;

Given(
  new RegExp(`^(?:the )?${TRACKER} shows (\\d+) boxes marked$`),
  async ({ page, memory }, name: string, marked: string) => {
    const arranging = await ensureOnSheet(page);
    if (arranging) await setRating(rating(page, name), Number(marked));
    await expectRating(rating(page, name), Number(marked));
    memory.rating = name;
  },
);

When(
  new RegExp(`^the player activates the (\\d+)(?:st|nd|rd|th) ${TRACKER} box( twice)?$`),
  async ({ page, memory }, position: string, name: string, twice: string | undefined) => {
    memory.rating = name;
    await mark(rating(page, name), Number(position)).click();
    if (twice) await mark(rating(page, name), Number(position)).click();
  },
);

When(
  /^the player activates the (\d+)(?:st|nd|rd|th) box again$/,
  async ({ page, memory }, position: string) => {
    await mark(rating(page, memory.rating), Number(position)).click();
  },
);

When(
  'the player enters {string} as Blood Per Turn and reloads the sheet',
  async ({ page }, text: string) => {
    await ensureOnSheet(page);
    await sheetField(page, 'Blood Per Turn').fill(text);
    await page.reload();
  },
);

Then('{int} boxes are marked', async ({ page, memory }, marked: number) => {
  await expectRating(rating(page, memory.rating), marked);
});

Then(
  '{int} temporary boxes are marked and permanent Willpower still shows {int} dots',
  async ({ page }, marked: number, dots: number) => {
    await expectRating(rating(page, 'temporary Willpower'), marked);
    await expectRating(rating(page, 'permanent Willpower'), dots);
  },
);

Then(
  /^(\d+) boxes are marked and there is no (\d+)(?:st|nd|rd|th) box$/,
  async ({ page, memory }, marked: string, beyond: string) => {
    const tracker = rating(page, memory.rating);
    await expectRating(tracker, Number(marked));
    await expect(tracker.locator('.rating-mark')).toHaveCount(Number(beyond) - 1);
  },
);

Then('Blood Per Turn shows {string}', async ({ page }, text: string) => {
  await expect(sheetField(page, 'Blood Per Turn')).toHaveValue(text);
});
