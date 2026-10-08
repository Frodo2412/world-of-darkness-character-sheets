import { expect, type Page } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import {
  BUILD_KEY_PREFIX,
  baseGeneration,
  builderAddress,
  enterExtraFreebies,
  extraFreebies,
  openBuildId,
  openStep,
  readout,
  setBaseGeneration,
  startBuild,
} from './support/builder';
import { buildEntries, characterEntries, createAction, openRoster, rosterList } from './support/pages';
import { saveDamagedBuild } from './support/seed';
import {
  acceptWrites,
  refuseWrites,
  storedKeys,
  storedText,
  withholdStorage,
} from './support/storage';

const EXTRA_FREEBIES_REFUSAL = 'Extra freebie points must be a whole number from 0 to 999';

const notSaved = (page: Page) =>
  page.getByRole('alert').filter({ hasText: 'Changes are not being saved' });

async function expectRefused(page: Page): Promise<void> {
  await expect(extraFreebies(page)).toHaveAccessibleDescription(
    new RegExp(EXTRA_FREEBIES_REFUSAL),
  );
}

async function expectNoFieldMessage(page: Page): Promise<void> {
  await expect(extraFreebies(page)).not.toHaveAccessibleDescription(
    new RegExp(EXTRA_FREEBIES_REFUSAL),
  );
  await expect(extraFreebies(page)).not.toHaveAttribute('aria-invalid', 'true');
}

async function setExtraFreebiesTo(page: Page, value: number): Promise<void> {
  await enterExtraFreebies(page, String(value));
  await expect(readout(page, 'Freebie budget')).toHaveText(String(15 + value));
}

// Given

Given('a player who has started building a character', async ({ page }) => {
  await startBuild(page);
});

Given('a player with the builder open on a build', async ({ page }) => {
  await startBuild(page);
});

Given(
  'a player who has set the extra freebie points to {int}',
  async ({ page }, value: number) => {
    await startBuild(page);
    await setExtraFreebiesTo(page, value);
  },
);

Given(
  'a player who has set the base generation to {string} and the extra freebie points to {int}',
  async ({ page }, generation: string, value: number) => {
    await startBuild(page);
    await setBaseGeneration(page, generation);
    await setExtraFreebiesTo(page, value);
  },
);

Given(
  'a player whose extra freebie points entry {string} was rejected',
  async ({ page }, entry: string) => {
    await startBuild(page);
    await enterExtraFreebies(page, entry);
    await expectRefused(page);
  },
);

Given('a saved build whose data has been damaged', async ({ page, memory }) => {
  memory.damaged = await saveDamagedBuild(page);
});

Given('the browser has started refusing to store data', async ({ page }) => {
  await refuseWrites(page);
});

Given('a player whose last change could not be saved', async ({ page }) => {
  await startBuild(page);
  await refuseWrites(page);
  await setBaseGeneration(page, '10th');
  await expect(notSaved(page)).toBeVisible();
});

Given('the browser accepts stored data again', async ({ page }) => {
  await acceptWrites(page);
});

// The record is removed from this page's own storage, so no storage event
// reaches it: the builder learns of the deletion only when it next saves.
Given('the same build has been removed in another tab', async ({ page }) => {
  const key = BUILD_KEY_PREFIX + openBuildId(page);
  await page.evaluate((k) => window.localStorage.removeItem(k), key);
});

Given('a browser that does not allow stored data', async ({ page }) => {
  await withholdStorage(page);
});

// When

When('they start building a character', async ({ page }) => {
  await startBuild(page);
});

When('they set the base generation to {string}', async ({ page }, generation: string) => {
  await setBaseGeneration(page, generation);
});

When('they set the extra freebie points to {int}', async ({ page }, value: number) => {
  await enterExtraFreebies(page, String(value));
});

When('they enter {string} as the extra freebie points', async ({ page }, entry: string) => {
  await enterExtraFreebies(page, entry);
});

When(
  'their entry {string} as the extra freebie points is rejected',
  async ({ page }, entry: string) => {
    await enterExtraFreebies(page, entry);
    await expectRefused(page);
  },
);

When('they clear the extra freebie points and leave the field', async ({ page }) => {
  await enterExtraFreebies(page, '');
});

When(
  'they type {string} then {string} in place of the extra freebie points without leaving the field',
  async ({ page }, first: string, second: string) => {
    const field = extraFreebies(page);
    await field.selectText();
    await field.pressSequentially(first);
    await field.pressSequentially(second);
  },
);

When('they look at the base generation choices', async ({ page }) => {
  await expect(baseGeneration(page)).toBeVisible();
});

When('they reload the builder', async ({ page }) => {
  await page.reload();
});

When(
  /^they open the builder address (of a build that does not exist|with no build id)$/,
  async ({ page }, address: string) => {
    await page.goto(address === 'with no build id' ? '/build/' : builderAddress('no-such-build'));
  },
);

When('the player opens that build', async ({ page, memory }) => {
  await page.goto(builderAddress(memory.damaged!.id));
});

// Then

Then('the builder is shown on its settings step', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Settings', level: 2 })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Build steps' }).getByRole('link', { name: 'Settings' }),
  ).toHaveAttribute('aria-current', 'step');
});

Then('the base generation is {string}', async ({ page }, generation: string) => {
  await expect(baseGeneration(page).locator('option:checked')).toHaveText(generation);
});

Then('reloading the builder shows the base generation {string}', async ({ page }, generation: string) => {
  await page.reload();
  await expect(baseGeneration(page).locator('option:checked')).toHaveText(generation);
});

Then('the extra freebie points are {int}', async ({ page }, value: number) => {
  await expect(extraFreebies(page)).toHaveValue(String(value));
});

// Captured numbers arrive as numbers, whatever the parameter's declared type.
Then(/^the freebie budget is (?:still )?(\d+)$/, async ({ page }, budget: number) => {
  await openStep(page, 'Settings');
  await expect(readout(page, 'Freebie budget')).toHaveText(String(budget));
});

Then('leaving the field sets the freebie budget to {int}', async ({ page }, budget: number) => {
  await extraFreebies(page).blur();
  await expect(readout(page, 'Freebie budget')).toHaveText(String(budget));
});

Then('the maximum trait rating is {int}', async ({ page }, value: number) => {
  await openStep(page, 'Settings');
  await expect(readout(page, 'Maximum trait rating')).toHaveText(String(value));
});

Then('the blood pool maximum is {int}', async ({ page }, value: number) => {
  await openStep(page, 'Settings');
  await expect(readout(page, 'Blood pool maximum')).toHaveText(String(value));
});

Then('the blood points per turn are {int}', async ({ page }, value: number) => {
  await openStep(page, 'Settings');
  await expect(readout(page, 'Blood points per turn')).toHaveText(String(value));
});

Then('the roster lists no characters', async ({ page }) => {
  await openRoster(page);
  // Anchor first: a page still loading shows no entry either.
  await expect(page.getByRole('heading', { level: 1, name: 'Characters' })).toBeVisible();
  // The page keeps the list or the empty message in the markup and shows one of them.
  await expect(rosterList(page).or(page.getByText('No characters yet')).filter({ visible: true })).toBeVisible();
  // A build in progress is an entry of its own, so the library is not empty; it holds no character.
  await expect(characterEntries(page)).toHaveCount(0);
});

Then('they see a way to build a character', async ({ page }) => {
  await expect(createAction(page, 'Start character creator')).toBeEnabled();
});

Then(
  'the choices run from {string} to {string} and nothing else',
  async ({ page }, first: string, last: string) => {
    const from = parseInt(first, 10);
    const to = parseInt(last, 10);
    const expected = Array.from({ length: to - from + 1 }, (_, index) => `${from + index}th`);
    await expect(baseGeneration(page).getByRole('option')).toHaveText(expected);
  },
);

Then(
  'they are told, beside the field, that extra freebie points must be a whole number from 0 to 999',
  async ({ page }) => {
    await expectRefused(page);
    await expect(page.getByRole('status').filter({ hasText: EXTRA_FREEBIES_REFUSAL })).toBeVisible();
  },
);

Then('the field is marked invalid and still shows {string}', async ({ page }, entry: string) => {
  await expect(extraFreebies(page)).toHaveAttribute('aria-invalid', 'true');
  await expect(extraFreebies(page)).toHaveValue(entry);
});

Then('no message is shown beside the field', async ({ page }) => {
  await expectNoFieldMessage(page);
});

Then('they see a "build not found" message with a link to the roster', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Build not found' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Build a character' })).toBeHidden();
  await expect(page.getByRole('link', { name: 'Go to your characters' })).toBeVisible();
});

Then('no build has been saved', async ({ page }) => {
  expect(await storedKeys(page, BUILD_KEY_PREFIX)).toEqual([]);
});

Then('they are told the build could not be read and has not been changed', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Build could not be read' })).toBeVisible();
  await expect(page.getByText('It has not been changed.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Build a character' })).toBeHidden();
});

Then(
  'they are offered a link to the roster to build a new one',
  async ({ page }) => {
    await expect(page.getByText(/You can build a new character/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Go to your characters' })).toBeVisible();
  },
);

Then('the damaged data is exactly as it was', async ({ page, memory }) => {
  expect(await storedText(page, memory.damaged!.key)).toBe(memory.damaged!.text);
});

Then(
  'they are told changes are not being saved and not to close or reload the page',
  async ({ page }) => {
    await expect(notSaved(page)).toBeVisible();
    await expect(notSaved(page)).toContainText('Do not close or reload this page');
  },
);

Then('they can still set the extra freebie points to {int}', async ({ page }, value: number) => {
  await setExtraFreebiesTo(page, value);
});

Then('the not-saved message is still shown', async ({ page }) => {
  await expect(notSaved(page)).toBeVisible();
});

Then('the not-saved message is gone', async ({ page }) => {
  await expect(notSaved(page)).toBeHidden();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

Then('the roster lists no builds in progress', async ({ page }) => {
  await openRoster(page);
  await expect(buildEntries(page)).toHaveCount(0);
  expect(await storedKeys(page, BUILD_KEY_PREFIX)).toEqual([]);
});

Then('the build action cannot be used', async ({ page }) => {
  await expect(createAction(page, 'Start character creator')).toBeDisabled();
});

Then('they are told characters cannot be saved in this browser', async ({ page }) => {
  await expect(page.getByRole('alert')).toContainText('cannot be saved in this browser');
});
