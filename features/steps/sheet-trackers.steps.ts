import { expect, type Page } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import { ensureOnSheet, rating, setRating } from './support/ratings';
import { bloodTotal, willpowerTotal } from './support/sheet';

const HEALTH_LEVELS = ['Bruised', 'Hurt', 'Injured', 'Wounded', 'Mauled', 'Crippled', 'Incapacitated'];
const DAMAGE_ORDER = ['empty', 'bashing', 'lethal', 'aggravated'];
const DAMAGE_GLYPHS: Record<string, string> = { empty: '', bashing: '/', lethal: 'X', aggravated: '*' };

/** A health box, found by the name it reports: "<level>, <damage>". */
const healthBox = (page: Page, level: string) =>
  page.getByRole('button', { name: new RegExp(`^${level}, `) });

async function expectDamage(page: Page, level: string, damage: string): Promise<void> {
  await expect(page.getByRole('button', { name: `${level}, ${damage}`, exact: true })).toBeVisible();
  // The glyph, not only the announced name: sighted players read the box.
  await expect(healthBox(page, level)).toHaveText(DAMAGE_GLYPHS[damage]);
}

async function markDamage(page: Page, level: string, damage: string): Promise<void> {
  for (let step = 0; step < DAMAGE_ORDER.indexOf(damage); step += 1) {
    await healthBox(page, level).click();
  }
  await expectDamage(page, level, damage);
}

Given(/^the ([A-Z][a-z]+) box is empty$/, async ({ page, memory }, level: string) => {
  await ensureOnSheet(page);
  await expectDamage(page, level, 'empty');
  memory.healthLevel = level;
});

Given('every health box is empty', async ({ page }) => {
  await ensureOnSheet(page);
  for (const level of HEALTH_LEVELS) await expectDamage(page, level, 'empty');
});

Given(
  /^the ([A-Z][a-z]+) box shows (bashing|lethal|aggravated) damage$/,
  async ({ page }, level: string, damage: string) => {
    await ensureOnSheet(page);
    await markDamage(page, level, damage);
  },
);

When(/^the player activates it(?: again)?$/, async ({ page, memory }) => {
  await healthBox(page, memory.healthLevel).click();
});

When(/^the player activates the ([A-Z][a-z]+) box twice$/, async ({ page }, level: string) => {
  await healthBox(page, level).click();
  await healthBox(page, level).click();
});

Then(
  'the health track shows Bruised, Hurt -1, Injured -1, Wounded -2, Mauled -2, Crippled -5 and Incapacitated in that order',
  async ({ page }) => {
    const levels = page.getByRole('region', { name: 'Health' }).locator('.health-level');
    await expect(levels).toHaveText([
      /^\s*Bruised\s*$/,
      /^\s*Hurt\s*-1\s*$/,
      /^\s*Injured\s*-1\s*$/,
      /^\s*Wounded\s*-2\s*$/,
      /^\s*Mauled\s*-2\s*$/,
      /^\s*Crippled\s*-5\s*$/,
      /^\s*Incapacitated\s*$/,
    ]);
    await expect(page.getByRole('region', { name: 'Health' }).getByRole('button')).toHaveCount(7);
  },
);

Then(/^it shows (bashing|lethal|aggravated) damage$/, async ({ page, memory }, damage: string) => {
  await expectDamage(page, memory.healthLevel, damage);
});

Then('it is empty', async ({ page, memory }) => {
  await expectDamage(page, memory.healthLevel, 'empty');
});

Then(
  /^([A-Z][a-z]+) shows (bashing|lethal|aggravated) damage and every other box is empty$/,
  async ({ page }, level: string, damage: string) => {
    await expectDamage(page, level, damage);
    for (const other of HEALTH_LEVELS.filter((name) => name !== level)) {
      await expectDamage(page, other, 'empty');
    }
  },
);

Then('assistive technology reports {string}', async ({ page }, name: string) => {
  await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
});

// The resources have no free-form entry any more: Willpower is raised to what the scenario
// needs and then regained, and blood is gained, one press at a time, as a player would.
Given(
  'the player marks {int} temporary Willpower, {int} Blood Pool and aggravated damage on Hurt',
  async ({ page }, willpower: number, blood: number) => {
    await ensureOnSheet(page);
    await setRating(rating(page, 'permanent Willpower'), willpower);
    for (let step = 0; step < willpower; step += 1) {
      await page.getByRole('button', { name: 'Regain one willpower', exact: true }).click();
    }
    for (let step = 0; step < blood; step += 1) {
      await page.getByRole('button', { name: 'Gain one blood', exact: true }).click();
    }
    await expect(willpowerTotal(page)).toHaveText(new RegExp(`^${willpower} / `));
    await expect(bloodTotal(page)).toHaveText(new RegExp(`^${blood} / `));
    await markDamage(page, 'Hurt', 'aggravated');
  },
);

Then('the same marks are shown', async ({ page }) => {
  await expect(willpowerTotal(page)).toHaveText(/^4 \/ /);
  await expect(bloodTotal(page)).toHaveText(/^12 \/ /);
  await expectDamage(page, 'Hurt', 'aggravated');
});
