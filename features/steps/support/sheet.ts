import { expect, type Locator, type Page } from '@playwright/test';
import type { V20Character } from '../../../src/domain/v20/character';
import { keyFor } from '../../../src/storage/characterStore';
import { watchAnnouncements } from './builder';
import { sheetAddress } from './pages';
import { saveCharacters } from './seed';
import { escaped } from './text';

export const sheetRoot = (page: Page): Locator => page.locator('#sheet');

export const editButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Edit character', exact: true });

export const doneButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Done editing', exact: true });

/** Waits for the sheet to be drawn: it shows one of the two mode buttons. */
async function sheetShown(page: Page): Promise<void> {
  await expect(editButton(page).or(doneButton(page))).toBeVisible();
}

export async function isEditing(page: Page): Promise<boolean> {
  await sheetShown(page);
  return doneButton(page).isVisible();
}

/** Saves `character`, opens its sheet by address and waits for it. */
export async function openSavedSheet(page: Page, character: V20Character): Promise<void> {
  await saveCharacters(page, [character]);
  await page.goto(sheetAddress(character.id));
  await sheetShown(page);
  await watchAnnouncements(page);
}

export async function enterEditMode(page: Page): Promise<void> {
  await editButton(page).click();
  await expect(doneButton(page)).toBeVisible();
}

/** For steps that set or read an editable value: a reload or a saved sheet opens in play mode. */
export async function ensureEditing(page: Page): Promise<void> {
  if (!(await isEditing(page))) await enterEditMode(page);
}

/**
 * A rating by its label, in either mode: a slider while editing, an image named
 * "<label> <value> of <max>" in play mode.
 */
export const ratingLabelled = (page: Page, label: string): Locator =>
  page
    .getByRole('slider', { name: label, exact: true })
    .or(page.getByRole('img', { name: new RegExp(`^${escaped(label)} \\d+ of \\d+$`) }));

/** Checks the dots drawn and, for a slider, the value it reports. */
export async function expectRatingValue(control: Locator, value: number): Promise<void> {
  await expect(control).toHaveAttribute('value', String(value));
  await expect(control.locator('.rating-mark.is-filled')).toHaveCount(value);
  if ((await control.getAttribute('role')) === 'slider') {
    await expect(control).toHaveAttribute('aria-valuenow', String(value));
  }
}

/** The identity card and, while editing, its fields: the region every identity check is made within. */
export const identityRegion = (page: Page): Locator =>
  page.getByRole('region', { name: 'Character', exact: true });

export const identityName = (page: Page): Locator => page.locator('[data-show="identity.name"]');
export const identitySummary = (page: Page): Locator => page.locator('[data-show="identity.summary"]');
export const identityMonogram = (page: Page): Locator => page.locator('[data-show="identity.monogram"]');
export const identityTemperament = (page: Page): Locator =>
  page.locator('[data-show="identity.temperament"]');

/** The record the app has stored for a character, as the browser holds it. */
export async function savedCharacter(page: Page, id: string): Promise<V20Character> {
  const text = await page.evaluate((key) => window.localStorage.getItem(key), keyFor(id));
  return JSON.parse(text!) as V20Character;
}

/** The id of the character whose sheet is open. */
export const openCharacterId = (page: Page): string =>
  new URL(page.url()).searchParams.get('id') ?? '';
