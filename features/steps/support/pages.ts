import { expect, type Locator, type Page } from '@playwright/test';

export const SHEET_ADDRESS = /\/sheet\/\?id=.+/;

export const sheetAddress = (id: string): string => `/sheet/?id=${encodeURIComponent(id)}`;

export const rosterEntries = (page: Page): Locator =>
  page.getByRole('list', { name: 'Characters' }).getByRole('listitem');

export async function openRoster(page: Page): Promise<void> {
  await page.goto('/');
}

/** Creates a character from the roster and ends on its sheet. */
export async function createCharacter(page: Page): Promise<void> {
  await openRoster(page);
  await page.getByRole('button', { name: 'New V20 character' }).click();
  await expect(page).toHaveURL(SHEET_ADDRESS);
}

export const sheetField = (page: Page, label: string): Locator =>
  page.getByLabel(label, { exact: true });

export const deleteConfirmation = (page: Page): Locator =>
  page.getByRole('dialog', { name: /^Delete (character|build)\?$/ });

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Opens the roster and starts deleting the character or build in progress named `name`. */
export async function startDeleting(page: Page, name: string): Promise<void> {
  await openRoster(page);
  await page.getByRole('button', { name: new RegExp(`^Delete (build )?${escaped(name)}$`) }).click();
  await expect(deleteConfirmation(page)).toBeVisible();
}

export async function confirmDelete(page: Page): Promise<void> {
  await deleteConfirmation(page).getByRole('button', { name: 'Delete' }).click();
  await expect(deleteConfirmation(page)).toBeHidden();
}

export const buildEntries = (page: Page): Locator =>
  page.getByRole('list', { name: 'Builds in progress' }).getByRole('listitem');
