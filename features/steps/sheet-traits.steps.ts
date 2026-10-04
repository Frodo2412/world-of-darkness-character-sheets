import { expect, type Page } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import { ensureOnSheet, expectRating, mark, rating, setRating } from './support/ratings';

/** A write-in row: its name field and its rating, which is announced with that name. */
const namedRowOf = (page: Page, label: string) => ({
  name: page.getByLabel(`${label} name`, { exact: true }),
  rating: page.getByRole('slider', { name: new RegExp(`^${label}(: |$)`) }),
});

// "<Trait> shows <n> dots" both arranges and checks: as a scenario's opening
// step there is no sheet yet, so it opens one and puts the rating there.
Given(
  /^((?:permanent )?[A-Z][A-Za-z-]*(?: [A-Z][A-Za-z-]*)?) shows (\d+) dots?$/,
  async ({ page }, name: string, dots: string) => {
    const arranging = await ensureOnSheet(page);
    if (arranging) await setRating(rating(page, name), Number(dots));
    await expectRating(rating(page, name), Number(dots));
  },
);

Given(
  /^keyboard focus is on the ([A-Z][A-Za-z-]*) rating showing (\d+) dots?$/,
  async ({ page, memory }, name: string, dots: string) => {
    await ensureOnSheet(page);
    await setRating(rating(page, name), Number(dots));
    await rating(page, name).focus();
    memory.rating = name;
  },
);

When(
  /^the player activates the (\d+)(?:st|nd|rd|th) ([A-Z][A-Za-z-]*(?: [A-Z][A-Za-z-]*)?) dot$/,
  async ({ page }, position: string, name: string) => {
    await mark(rating(page, name), Number(position)).click();
  },
);

When('the player presses the increase key twice', async ({ page }) => {
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
});

Then(
  'the rating reports its name and the value {int} to assistive technology',
  async ({ page, memory }, value: number) => {
    const control = page.getByRole('slider', { name: memory.rating, exact: true });
    await expect(control).toBeFocused();
    await expect(control).toHaveAttribute('aria-valuenow', String(value));
    await expect(control).toHaveAttribute('aria-valuemin', '0');
    await expect(control).toHaveAttribute('aria-valuemax', '10');
  },
);

When(
  'they name the blank Talent {string} and give it {int} dots',
  async ({ page }, name: string, dots: number) => {
    const row = namedRowOf(page, 'Custom talent');
    await row.name.fill(name);
    await setRating(row.rating, dots);
  },
);

Then(
  'the Talents list shows {string} with {int} dots',
  async ({ page }, name: string, dots: number) => {
    const talents = page.getByRole('group', { name: 'Talents' });
    await expect(talents.getByLabel('Custom talent name', { exact: true })).toHaveValue(name);
    await expectRating(talents.getByRole('slider', { name: `Custom talent: ${name}` }), dots);
  },
);
