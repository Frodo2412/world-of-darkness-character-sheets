// The Character concept screen: its free-text fields, found by their labels.

import type { Locator, Page } from '@playwright/test';
import { openStep } from './builder';

/** A builder field by its label; a step region of the same name is not a field. */
export const builderField = (page: Page, label: string): Locator =>
  page
    .locator('#builder')
    .getByLabel(label, { exact: true })
    .and(page.locator('input, select, textarea'));

export async function openConceptScreen(page: Page): Promise<void> {
  await openStep(page, 'Character concept');
}

/** The fields the Character concept screen holds; Nature and Demeanor have a screen of their own. */
export const CONCEPT_LABELS = ['Name', 'Player', 'Chronicle', 'Concept', 'Sire'];

/** Types into one of the concept fields, opening the screen first. */
export async function enterConceptField(page: Page, label: string, text: string): Promise<void> {
  await openConceptScreen(page);
  await builderField(page, label).fill(text);
}
