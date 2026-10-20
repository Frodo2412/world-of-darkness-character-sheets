// The Nature & Demeanor screen: the two Archetype fields and the Archetypes they suggest.

import type { Page } from '@playwright/test';
import { openStep } from './builder';
import { builderField } from './concept';

export const NATURE_LABELS = ['Nature', 'Demeanor'];

export async function openNatureScreen(page: Page): Promise<void> {
  await openStep(page, 'Nature & Demeanor');
}

/** Types into Nature or Demeanor, opening the screen first. */
export async function enterNatureField(page: Page, label: string, text: string): Promise<void> {
  await openNatureScreen(page);
  await builderField(page, label).fill(text);
}

/** The Archetypes offered for Nature or Demeanor. */
export async function suggestionsFor(page: Page, label: string): Promise<string[]> {
  const list = await builderField(page, label).getAttribute('list');
  return page
    .locator(`datalist#${list} option`)
    .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
}
