import type { Locator, Page } from '@playwright/test';
import { SHEET_ADDRESS, createCharacter } from './pages';
import { expectRatingValue, ratingLabelled } from './sheet';

/** What a scenario calls a rating, where that differs from its label on the sheet. */
const RATING_LABELS: Record<string, string> = {
  'permanent Willpower': 'Permanent Willpower',
  Willpower: 'Permanent Willpower',
  Humanity: 'Humanity / Path',
};

/** A rating by its scenario name, whichever mode the sheet is in. */
export const rating = (page: Page, name: string): Locator =>
  ratingLabelled(page, RATING_LABELS[name] ?? name);

export const mark = (control: Locator, position: number): Locator =>
  control.locator('.rating-mark').nth(position - 1);

export const expectRating = expectRatingValue;

/** Sets a rating the way a player would, by activating one of its marks. */
export async function setRating(control: Locator, value: number): Promise<void> {
  if ((await control.getAttribute('aria-valuenow')) === String(value)) return;
  if (value === 0) {
    await mark(control, 1).click();
    if ((await control.getAttribute('aria-valuenow')) !== '0') await mark(control, 1).click();
  } else {
    await mark(control, value).click();
  }
  await expectRating(control, value);
}

/** A scenario that starts by stating a value has no sheet open yet: open a new one. */
export async function ensureOnSheet(page: Page): Promise<boolean> {
  if (SHEET_ADDRESS.test(page.url())) return false;
  await createCharacter(page);
  return true;
}
