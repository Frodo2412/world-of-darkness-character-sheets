// The Character concept screen: its free-text fields, found by their labels, and the sample concept chips.

import { expect, type Locator, type Page } from '@playwright/test';
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

/** What the screen asks where the sheet's own word is shorter; the scenarios say Name and Concept. */
const ASKED: Record<string, string> = { Name: 'Character name', Concept: 'Concept in your own words' };

/** A field of the Character concept screen, by the name a scenario gives it. */
export const conceptField = (page: Page, label: string): Locator => builderField(page, ASKED[label] ?? label);

/** Types into one of the concept fields, opening the screen first. */
export async function enterConceptField(page: Page, label: string, text: string): Promise<void> {
  await openConceptScreen(page);
  await conceptField(page, label).fill(text);
}

// The sample concepts

export const sampleGroup = (page: Page): Locator => page.getByRole('group', { name: 'Sample concepts', exact: true });

export const sampleChips = (page: Page): Locator => sampleGroup(page).getByRole('button');

export const sampleChip = (page: Page, name: string): Locator => sampleGroup(page).getByRole('button', { name, exact: true });

/** The check and "Selected" a chosen chip shows. */
const sampleState = (chip: Locator): Locator => chip.locator('[data-sample-state]');

/** The description shown beneath the chips once one is chosen. */
export const sampleLine = (page: Page): Locator => page.locator('[data-sample-line]');

/** Presses a sample concept chip, opening the screen first. */
export async function pressSampleConcept(page: Page, name: string): Promise<void> {
  await openConceptScreen(page);
  await sampleChip(page, name).click();
}

/** Chooses a sample concept unless it is already the chosen one. */
export async function chooseSampleConcept(page: Page, name: string): Promise<void> {
  await openConceptScreen(page);
  if ((await sampleChip(page, name).getAttribute('aria-pressed')) !== 'true') await sampleChip(page, name).click();
  await expect(sampleChip(page, name)).toHaveAttribute('aria-pressed', 'true');
}

/** The chip says `state` in text, and says it to assistive technology as well (pressed). */
export async function expectSampleReads(page: Page, name: string, state: string): Promise<void> {
  const chip = sampleChip(page, name);
  await expect(sampleState(chip)).toBeVisible();
  await expect(sampleState(chip)).toContainText(state);
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
}

/** The chip shows no state word and is not pressed. */
export async function expectSampleDoesNotRead(page: Page, name: string): Promise<void> {
  const chip = sampleChip(page, name);
  await expect(sampleState(chip)).toBeHidden();
  await expect(chip).toHaveAttribute('aria-pressed', 'false');
}
