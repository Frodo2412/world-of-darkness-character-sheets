// The starting Blood Pool on Finishing touches: the field, its hint and tag, the Finish gate,
// and records saved before the field was required.

import { expect } from '@playwright/test';
import { bloodPool, completeBuild, creation, generation } from '../../src/domain/v20/creation/testing/play';
import { Given, Then, When } from './fixtures';
import {
  buildWith,
  expectFinishDoesNothing,
  expectFinishExplains,
  finishButton,
  finishOpenBuild,
  openPlayed,
  openPlayedFrom,
  openStep,
  openStored,
  outstandingItems,
  reloadBuilder,
  startBuild,
  storeRawBuild,
} from './support/builder';
import {
  bloodPoolField,
  bloodPoolMessage,
  expectBloodPoolReads,
  expectRefused,
  expectTagged,
  preChangeRecord,
  recordBloodPool,
  unrecordedBloodPool,
} from './support/bloodpool';
import { violationsOnPage } from './support/accessibility';
import { escaped } from './support/text';
import { SHEET_ADDRESS } from './support/pages';
import { bloodTotal } from './support/sheet';
import { currentStored, storedRecords } from './support/storage';

const rangeMessage = (max: number | string): string => `The Blood Pool must be a whole number from 0 to ${max}.`;

// Given

Given('I am building a character at 13th generation', async ({ page }) => {
  await startBuild(page);
});

Given('I have recorded a starting Blood Pool of {int}', async ({ page }, value: number) => {
  await recordBloodPool(page, String(value));
});

Given(
  /^a build at base (\d+)th generation with (\d+) dots? of the Generation Background$/,
  async ({ page, memory }, base: string, dots: string) => {
    memory.build = await openPlayed(page, generation(Number(base)), creation('background:Generation', Number(dots)));
  },
);

Given('a clan is chosen and every creation dot is placed', async ({ page, memory }) => {
  memory.build = await openPlayedFrom(page, completeBuild('Brujah'), unrecordedBloodPool);
});

Given('a build saved before this change with a Blood Pool of {int}', async ({ page, memory }, value: number) => {
  memory.build = buildWith();
  await storeRawBuild(page, memory.build.id, preChangeRecord(memory.build, value));
});

Given(
  'a build saved before this change with a Blood Pool of {int} and everything else placed',
  async ({ page, memory }, value: number) => {
    memory.build = { ...completeBuild('Brujah'), id: buildWith().id };
    await storeRawBuild(page, memory.build.id, preChangeRecord(memory.build, value));
  },
);

Given('a stored new-shape build whose Blood Pool is {string}', async ({ page, memory }, entry: string) => {
  memory.build = buildWith();
  await storeRawBuild(page, memory.build.id, { ...memory.build, bloodPool: entry });
  memory.stored = await storedRecords(page);
});

Given('a finishable build with a recorded Blood Pool of {int}', async ({ page, memory }, value: number) => {
  memory.build = await openPlayedFrom(page, completeBuild('Brujah'), bloodPool(value));
});

// When

When('I open Finishing touches', async ({ page }) => {
  await openStep(page, 'Finishing touches');
});

When('I/they record a starting Blood Pool of {int}', async ({ page }, value: number) => {
  await recordBloodPool(page, String(value));
});

When('I record a starting Blood Pool of {string}', async ({ page }, entry: string) => {
  await recordBloodPool(page, entry);
});

// The whitespace table writes its entries with their own quotes, so the step reads them doubled.
When(/^I record a starting Blood Pool of "{2}(.*)"{2}$/, async ({ page }, entry: string) => {
  await recordBloodPool(page, entry);
});

When('I clear the Blood Pool field', async ({ page }) => {
  await recordBloodPool(page, '');
});

When('I reload the builder', async ({ page }) => {
  await reloadBuilder(page);
});

When('I open it in the builder', async ({ page, memory }) => {
  await openStored(page, memory.build!.id);
});

When('I open it in the builder and record a starting Blood Pool of {int}', async ({ page, memory }, value: number) => {
  await openStored(page, memory.build!.id);
  await recordBloodPool(page, String(value));
});

When('I open it, then finish it', async ({ page, memory }) => {
  await openStored(page, memory.build!.id);
  await finishOpenBuild(page);
});

When('I finish the build', async ({ page }) => {
  await finishOpenBuild(page);
});

// Then

Then('the Blood Pool field reads {string}', async ({ page }, reading: string) => {
  await expectBloodPoolReads(page, reading);
});

Then('the Blood Pool field reads {int}', async ({ page }, value: number) => {
  await expectBloodPoolReads(page, String(value));
});

Then('the Blood Pool field reads {int} and is not tagged {string}', async ({ page }, value: number, tag: string) => {
  await expectBloodPoolReads(page, String(value));
  await expectTagged(page, tag, false);
});

Then('the Blood Pool field reads {string} and is tagged {string}', async ({ page }, reading: string, tag: string) => {
  await expectBloodPoolReads(page, reading);
  await expectTagged(page, tag, true);
});

Then('it is tagged {string}', async ({ page }, tag: string) => {
  await expectTagged(page, tag, true);
});

Then('the Blood Pool is no longer tagged {string}', async ({ page }, tag: string) => {
  await expectTagged(page, tag, false);
});

Then('the hint reads {string}', async ({ page }, hint: string) => {
  await expect(page.getByText(hint, { exact: true })).toBeVisible();
  await expect(bloodPoolField(page)).toHaveAccessibleDescription(new RegExp(escaped(hint)));
});

Then('after reloading the builder it still reads {int}', async ({ page }, value: number) => {
  await reloadBuilder(page);
  await expectBloodPoolReads(page, String(value));
});

Then('after reloading the builder the Blood Pool still reads {string}', async ({ page }, reading: string) => {
  await reloadBuilder(page);
  await expectBloodPoolReads(page, reading);
});

Then(
  'the field is marked invalid and the message {string} is announced politely',
  async ({ page }, message: string) => {
    await expectRefused(page, message);
  },
);

Then('the field still shows {string}', async ({ page }, entry: string) => {
  await expect(bloodPoolField(page)).toHaveValue(entry);
});

Then('I am told the Blood Pool must be a whole number from 0 to {int}', async ({ page }, max: number) => {
  await expectRefused(page, rangeMessage(max));
});

Then('I am told the build could not be read', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Build could not be read' })).toBeVisible();
});

Then('the stored record is unchanged', async ({ page, memory }) => {
  expect(await storedRecords(page)).toEqual(currentStored(memory));
});

Then('the outstanding list includes {string}', async ({ page }, item: string) => {
  await openStep(page, 'Review & resolve');
  await expect(outstandingItems(page).filter({ hasText: item })).toHaveCount(1);
});

Then('Finish is aria-disabled, still focusable, and explains {string}', async ({ page }, reason: string) => {
  await expectFinishExplains(page, reason);
});

Then('activating Finish does nothing', async ({ page }) => {
  await expectFinishDoesNothing(page);
});

Then(
  'the outstanding list is empty and Finish is enabled',
  async ({ page }) => {
    await openStep(page, 'Review & resolve');
    await expect(outstandingItems(page)).toHaveCount(0);
    await expect(finishButton(page)).toHaveAttribute('aria-disabled', 'false');
    await expect(finishButton(page)).toHaveText('Finish character');
  },
);

Then("the character's sheet shows a blood pool of {int}", async ({ page }, value: number) => {
  await expect(page).toHaveURL(SHEET_ADDRESS);
  await expect(bloodTotal(page)).toHaveText(new RegExp(`^${value} / `));
});

Then('axe reports no violations with the refusal shown', async ({ page }) => {
  expect(await violationsOnPage(page)).toEqual([]);
});

Then('the refusal is stated in text', async ({ page }) => {
  await expect(bloodPoolMessage(page)).toContainText(rangeMessage(10));
});
