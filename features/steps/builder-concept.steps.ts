// The Character concept screen: the free-text details of the character, kept as they are typed.

import { expect } from '@playwright/test';
import type { DataTable } from 'playwright-bdd';
import { Given, Then, When } from './fixtures';
import { buildWith, openSavedBuild, openStep } from './support/builder';
import { builderField, CONCEPT_LABELS, enterConceptField, openConceptScreen } from './support/concept';

// Given

Given('a build named {string}', async ({ page }, name: string) => {
  await openSavedBuild(page, buildWith({ concept: { name } }));
});

Given('a build named {string} of clan {string}', async ({ page }, name: string, clan: string) => {
  await openSavedBuild(page, buildWith({ concept: { name }, clan }));
});

// When

When('they enter the concept details', async ({ page, memory }, table: DataTable) => {
  for (const { field, text } of table.hashes()) {
    await enterConceptField(page, field, text);
    memory.entered.set(field, text);
  }
});

When('they clear the Name', async ({ page }) => {
  await enterConceptField(page, 'Name', '');
});

When('they open the {string} step', async ({ page }, title: string) => {
  await openStep(page, title);
});

// Then

Then('the concept step shows every detail they entered', async ({ page, memory }) => {
  await openConceptScreen(page);
  expect(memory.entered.size).toBe(CONCEPT_LABELS.length);
  for (const [field, text] of memory.entered) {
    await expect(builderField(page, field)).toHaveValue(text);
  }
});

Then('the Name is empty', async ({ page }) => {
  await openConceptScreen(page);
  await expect(builderField(page, 'Name')).toHaveValue('');
});

Then('the page title is {string}', async ({ page }, title: string) => {
  await expect(page).toHaveTitle(title);
});
