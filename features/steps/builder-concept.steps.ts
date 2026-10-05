import { expect, type Page } from '@playwright/test';
import type { DataTable } from 'playwright-bdd';
import { Given, Then, When } from './fixtures';
import {
  buildWith,
  builderField,
  openSavedBuild,
  openStep,
  startBuild,
  stepHeading,
  stepNav,
} from './support/builder';

const clanSelect = (page: Page) => builderField(page, 'Clan');

async function suggestionsFor(page: Page, field: string): Promise<string[]> {
  const list = await builderField(page, field).getAttribute('list');
  return page
    .locator(`datalist#${list} option`)
    .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
}

// Given

Given('a build named {string}', async ({ page }, name: string) => {
  await openSavedBuild(page, buildWith({ concept: { name } }));
});

Given('a build named {string} of clan {string}', async ({ page }, name: string, clan: string) => {
  await openSavedBuild(page, buildWith({ concept: { name }, clan }));
});

Given('a player on the {string} step of a new build', async ({ page }, title: string) => {
  await startBuild(page);
  await openStep(page, title);
});

// When

When('they enter the concept details', async ({ page, memory }, table: DataTable) => {
  await openStep(page, 'Concept');
  for (const { field, text } of table.hashes()) {
    await builderField(page, field).fill(text);
    memory.entered.set(field, text);
  }
});

When('they clear the Name', async ({ page }) => {
  await openStep(page, 'Concept');
  await builderField(page, 'Name').fill('');
});

When('they look at the clan choices', async ({ page }) => {
  await openStep(page, 'Concept');
});

When('they open the {string} step', async ({ page }, title: string) => {
  await openStep(page, title);
});

When('they choose the clan {string}', async ({ page }, clan: string) => {
  await openStep(page, 'Concept');
  await clanSelect(page).selectOption({ label: clan });
});

When('they open the {string} step from the step navigation', async ({ page }, title: string) => {
  await stepNav(page).getByRole('link', { name: title, exact: true }).click();
});

When('they use Next', async ({ page }) => {
  await page.getByRole('button', { name: /^Next: / }).click();
});

When('they look at the step navigation', async ({ page }) => {
  await expect(stepNav(page)).toBeVisible();
});

When('they open the builder with a step address that does not exist', async ({ page }) => {
  const address = new URL(page.url());
  address.hash = 'no-such-step';
  await page.goto(address.toString());
  await page.reload();
});

// Then

Then('the concept step shows every detail they entered', async ({ page, memory }) => {
  await openStep(page, 'Concept');
  expect(memory.entered.size).toBe(7);
  for (const [field, text] of memory.entered) {
    await expect(builderField(page, field)).toHaveValue(text);
  }
});

Then('the Name is empty', async ({ page }) => {
  await openStep(page, 'Concept');
  await expect(builderField(page, 'Name')).toHaveValue('');
});

Then(
  'apart from the {string} placeholder the choices are exactly',
  async ({ page }, placeholder: string, table: DataTable) => {
    const options = clanSelect(page).getByRole('option');
    await expect(options.first()).toHaveText(placeholder);
    await expect(options).toHaveText([placeholder, ...table.raw().flat()]);
  },
);

Then('no clan is chosen', async ({ page }) => {
  await expect(clanSelect(page).locator('option:checked')).toHaveText('Choose a clan');
});

Then('the chosen clan is {string}', async ({ page }, clan: string) => {
  await openStep(page, 'Concept');
  await expect(clanSelect(page).locator('option:checked')).toHaveText(clan);
});

Then('the {string} placeholder can no longer be chosen', async ({ page }, placeholder: string) => {
  await expect(clanSelect(page).getByRole('option', { name: placeholder })).toBeDisabled();
});

Then(
  /^"([^"]+)" and "([^"]+)" are among the suggestions for (Nature|Demeanor)$/,
  async ({ page }, first: string, second: string, field: string) => {
    expect(await suggestionsFor(page, field)).toEqual(expect.arrayContaining([first, second]));
  },
);

Then(
  /^entering "([^"]+)" as the (Nature|Demeanor) is accepted$/,
  async ({ page }, text: string, field: string) => {
    await builderField(page, field).fill(text);
    await page.reload();
    await openStep(page, 'Concept');
    await expect(builderField(page, field)).toHaveValue(text);
    await expect(builderField(page, field)).not.toHaveAttribute('aria-invalid', 'true');
  },
);

Then('the {string} step is shown and marked as the current step', async ({ page }, title: string) => {
  await expect(stepHeading(page, title)).toBeVisible();
  await expect(stepNav(page).getByRole('link', { name: title, exact: true })).toHaveAttribute(
    'aria-current',
    'step',
  );
  await expect(page.locator('#builder [data-step]:visible')).toHaveCount(1);
});

Then('keyboard focus is on the {string} heading', async ({ page }, title: string) => {
  await expect(stepHeading(page, title)).toBeFocused();
});

Then('the {string} step is shown', async ({ page }, title: string) => {
  await expect(stepHeading(page, title)).toBeVisible();
  await expect(page.locator('#builder [data-step]:visible')).toHaveCount(1);
});

Then('using Previous shows the {string} step', async ({ page }, title: string) => {
  await page.getByRole('button', { name: /^Previous: / }).click();
  await expect(stepHeading(page, title)).toBeVisible();
});

Then('the Concept step is marked {string}', async ({ page }, status: string) => {
  const link = stepNav(page).getByRole('link', { name: 'Concept', exact: true });
  await expect(link).toHaveAccessibleDescription(status);
  const item = stepNav(page)
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: 'Concept', exact: true }) });
  await expect(item).toContainText(status);
});

Then('the page title is {string}', async ({ page }, title: string) => {
  await expect(page).toHaveTitle(title);
});
