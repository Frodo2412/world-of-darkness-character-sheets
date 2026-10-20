// The Nature & Demeanor screen: two Archetype fields that suggest but never require.

import { expect } from '@playwright/test';
import type { DataTable } from 'playwright-bdd';
import { Then, When } from './fixtures';
import { builderField } from './support/concept';
import { enterNatureField, NATURE_LABELS, openNatureScreen, suggestionsFor } from './support/nature';

When('they open the Nature and Demeanor step', async ({ page }) => {
  await openNatureScreen(page);
});

When('they enter the Nature and Demeanor', async ({ page, memory }, table: DataTable) => {
  for (const { field, text } of table.hashes()) {
    await enterNatureField(page, field, text);
    memory.entered.set(field, text);
  }
});

Then('the Nature and Demeanor screen shows every detail they entered', async ({ page, memory }) => {
  await openNatureScreen(page);
  expect(memory.entered.size).toBe(NATURE_LABELS.length);
  for (const [field, text] of memory.entered) {
    await expect(builderField(page, field)).toHaveValue(text);
  }
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
    await openNatureScreen(page);
    await expect(builderField(page, field)).toHaveValue(text);
    await expect(builderField(page, field)).not.toHaveAttribute('aria-invalid', 'true');
  },
);
