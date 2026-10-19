import { expect, type Locator, type Page } from '@playwright/test';
import type { V20Build } from '../../../src/domain/v20/creation/build';
import { setBloodPool } from '../../../src/domain/v20/creation/updates';
import type { Step } from '../../../src/domain/v20/creation/testing/play';
import { ANNOUNCEMENT_WINDOW_MS, announcements, waitOnPageClock, watchAnnouncements } from './announcements';
import { BUILD_KEY_PREFIX, BUILDER_ADDRESS, activateFinish, builderAddress, finishDialog, openStep } from './builder';
import { storedKeys } from './storage';

export const bloodPoolField = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Starting Blood Pool', exact: true });

/** The field with its state text, tag, hint and message. */
const bloodPoolBlock = (page: Page): Locator => page.locator('.builder-field:has(#blood-pool)');

const bloodPoolTag = (page: Page, tag: string): Locator => bloodPoolBlock(page).getByText(tag, { exact: true });

const finishButton = (page: Page): Locator => page.getByRole('button', { name: 'Finish', exact: true });

export const outstandingItems = (page: Page): Locator => page.locator('[data-outstanding-list] li');

/** The Blood Pool field and the sheet's Blood Pool card share a wording; this tells the page they are on. */
export const onBuilder = (page: Page): boolean => BUILDER_ADDRESS.test(page.url());

/** A Step that clears the build's Blood Pool back to not recorded. */
export const unrecordedBloodPool: Step = (build) => setBloodPool(build, '');

/** Enters text the way a player finishes an entry: typed, then the field is left. */
export async function recordBloodPool(page: Page, text: string): Promise<void> {
  await openStep(page, 'Finishing touches');
  await bloodPoolField(page).fill(text);
  await bloodPoolField(page).blur();
}

/** What the field shows: "Not recorded" with an empty field, or the recorded number. */
export async function expectBloodPoolReads(page: Page, reading: string): Promise<void> {
  await openStep(page, 'Finishing touches');
  if (reading === 'Not recorded') {
    await expect(bloodPoolField(page)).toHaveValue('');
    await expect(bloodPoolBlock(page).getByText('Not recorded', { exact: true })).toBeVisible();
  } else {
    await expect(bloodPoolField(page)).toHaveValue(reading);
  }
}

export async function expectTagged(page: Page, tag: string, tagged: boolean): Promise<void> {
  await expect(bloodPoolTag(page, tag)).toBeVisible({ visible: tagged });
}

export async function reloadBuilder(page: Page): Promise<void> {
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Build a character' })).toBeVisible();
  await watchAnnouncements(page);
}

/** Opens a build already in storage, without saving anything first; one that cannot be read is opened too. */
export async function openStored(page: Page, id: string): Promise<void> {
  await page.goto(builderAddress(id));
  await expect(page.getByRole('heading', { name: /^Build (a character|could not be read)$/ })).toBeVisible();
  await watchAnnouncements(page);
}

/** The record as it was stored before the Blood Pool was recorded explicitly: no sample concept or drive. */
export function preChangeRecord(build: V20Build, bloodPool: number): Record<string, unknown> {
  const { conceptKind: _kind, drive: _drive, ...concept } = build.concept;
  return { ...build, concept, bloodPool };
}

/** Writes a record to storage exactly as given, for states the app's own store would not write. */
export async function storeRecord(page: Page, id: string, record: unknown): Promise<void> {
  await page.goto('/');
  await page.evaluate(([key, text]) => window.localStorage.setItem(key, text), [BUILD_KEY_PREFIX + id, JSON.stringify(record)]);
}

export async function expectRefused(page: Page, message: string): Promise<void> {
  await expect(bloodPoolField(page)).toHaveAttribute('aria-invalid', 'true');
  await expect(bloodPoolField(page)).toHaveAccessibleDescription(new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  await expect(bloodPoolBlock(page).getByRole('status')).toHaveText(message);
  expect(await announcements(page)).toContain(message);
}

export async function expectFinishExplains(page: Page, reason: string): Promise<void> {
  await openStep(page, 'Finishing touches');
  const finish = finishButton(page);
  await expect(finish).toHaveAttribute('aria-disabled', 'true');
  // aria-disabled, not the disabled attribute, so keyboard users can still reach it.
  expect(await finish.evaluate((button: HTMLButtonElement) => button.disabled)).toBe(false);
  await finish.focus();
  await expect(finish).toBeFocused();
  await expect(page.getByText(reason, { exact: true })).toBeVisible();
  await expect(finish).toHaveAccessibleDescription(new RegExp(reason));
}

/** Activates Finish from the keyboard while it is unavailable and checks that only the reason is said. */
export async function expectFinishDoesNothing(page: Page): Promise<void> {
  const finish = finishButton(page);
  const address = page.url();
  const stored = await storedKeys(page, BUILD_KEY_PREFIX);
  await finish.focus();
  await finish.press('Enter');
  await waitOnPageClock(page, ANNOUNCEMENT_WINDOW_MS);
  await expect(finishDialog(page)).toBeHidden();
  expect(page.url()).toBe(address);
  expect(await storedKeys(page, BUILD_KEY_PREFIX)).toEqual(stored);
  await expect(finish).toBeFocused();
  await expect(page.locator('[data-finish-notice]')).toContainText('left before this character can be finished');
}

/** Finishes the build open on Finishing touches, accepting the unspent-freebie question if it is asked. */
export async function finishOpenBuild(page: Page): Promise<void> {
  await activateFinish(page);
  if (await finishDialog(page).isVisible()) {
    await finishDialog(page).getByRole('button', { name: /^Finish with/ }).click();
  }
}
