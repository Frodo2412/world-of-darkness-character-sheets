// The builder's shell chrome: the top bar, the identity bar, the "Your character" panel and the autosave
// status. This file is the one place that knows their markup; the steps ask for them through these.

import { expect, type Locator, type Page } from '@playwright/test';
import { PANEL_ROWS } from '../../../src/domain/v20/creation/shellView';
import { builderHeading } from './builder';

/** The title in the top bar, with the chronicle before it when one is set: the builder's one h1. */
export const topBarTitle = (page: Page): Locator => builderHeading(page);

export const identityName = (page: Page): Locator => page.locator('[data-identity-name]');
export const identityInitials = (page: Page): Locator => page.locator('[data-identity-initials]');
export const identitySubtitle = (page: Page): Locator => page.locator('[data-identity-subtitle]');
export const identityNatureDemeanor = (page: Page): Locator => page.locator('[data-identity-natdem]');

export const characterPanel = (page: Page): Locator => page.locator('[data-character-panel]');

/** The value of the "Your character" row labelled `label` ("Freebie points", "Concept"). */
export function panelValue(page: Page, label: string): Locator {
  const row = PANEL_ROWS.find((entry) => entry.label === label);
  if (row === undefined) throw new Error(`There is no "Your character" row called "${label}"`);
  return characterPanel(page).locator(`[data-panel-row="${row.key}"] [data-panel-value]`);
}

export const autosaveStatus = (page: Page): Locator => page.locator('[data-autosave-status]');

/** The alert the top bar raises when a save is refused. */
export const autosaveAlert = (page: Page): Locator => page.locator('[data-autosave-alert]');

export const topBarButton = (page: Page, name: string): Locator =>
  page.getByRole('button', { name, exact: true });

/** The page's clock is the test's from now on, so "90 seconds pass" is a step. Safe to ask for twice. */
export async function takeClock(page: Page, taken: { value: boolean }): Promise<void> {
  if (taken.value) return;
  await page.clock.install();
  taken.value = true;
}

/** The shell's parts are on the page: all three regions and the status the top bar holds. */
export async function expectShellRegions(page: Page): Promise<void> {
  await expect(topBarTitle(page)).toBeVisible();
  await expect(identityName(page)).toBeVisible();
  await expect(characterPanel(page)).toBeVisible();
}
