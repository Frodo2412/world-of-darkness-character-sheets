import { expect } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import { ensureOnSheet } from './support/ratings';
import { expectDamage, healthBox, healthCard, markDamage } from './support/sheet';

const HEALTH_LEVELS = ['Bruised', 'Hurt', 'Injured', 'Wounded', 'Mauled', 'Crippled', 'Incapacitated'];

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
  'the health track shows Bruised 0, Hurt \u22121, Injured \u22121, Wounded \u22122, Mauled \u22122, Crippled \u22125 and Incapacitated \u2014 in that order',
  async ({ page }) => {
    const levels = healthCard(page).locator('.health-levels > li');
    await expect(levels.locator('.health-label')).toHaveText(HEALTH_LEVELS);
    await expect(levels.locator('.health-penalty')).toHaveText(['0', '\u22121', '\u22121', '\u22122', '\u22122', '\u22125', '\u2014']);
    await expect(healthCard(page).getByRole('button')).toHaveCount(7);
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
