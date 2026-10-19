import { expect, type Locator, type Page } from '@playwright/test';
import type { V20Build } from '../../../src/domain/v20/creation/build';
import type { Step } from '../../../src/domain/v20/creation/testing/play';
import { setBloodPool } from '../../../src/domain/v20/creation/updates';
import { announcements } from './announcements';
import { openStep } from './builder';

export const bloodPoolField = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Starting Blood Pool', exact: true });

/** The field with its state text, tag, hint and message. */
const bloodPoolBlock = (page: Page): Locator => page.locator('.builder-field:has(#blood-pool)');

/** The polite slot beside the field, where a refusal is stated. */
export const bloodPoolMessage = (page: Page): Locator => bloodPoolBlock(page).getByRole('status');

const bloodPoolTag = (page: Page, tag: string): Locator => bloodPoolBlock(page).getByText(tag, { exact: true });

const NOT_RECORDED = 'Not recorded';

/** A Step that clears the build's Blood Pool back to not recorded. */
export const unrecordedBloodPool: Step = (build) => setBloodPool(build, '');

/** Enters text the way a player finishes an entry: typed, then the field is left. */
export async function recordBloodPool(page: Page, text: string): Promise<void> {
  await openStep(page, 'Finishing touches');
  await bloodPoolField(page).fill(text);
  await bloodPoolField(page).blur();
}

/** What the field shows: "Not recorded" with an empty field, or the recorded number and no such text. */
export async function expectBloodPoolReads(page: Page, reading: string): Promise<void> {
  await openStep(page, 'Finishing touches');
  const state = bloodPoolBlock(page).getByText(NOT_RECORDED, { exact: true });
  if (reading === NOT_RECORDED) {
    await expect(bloodPoolField(page)).toHaveValue('');
    await expect(state).toBeVisible();
  } else {
    await expect(bloodPoolField(page)).toHaveValue(reading);
    await expect(state).toBeHidden();
  }
}

/** The tag is on the page while the Blood Pool is unrecorded, and gone from sight once it is recorded. */
export async function expectTagged(page: Page, tag: string, tagged: boolean): Promise<void> {
  const element = bloodPoolTag(page, tag);
  await expect(element).toHaveCount(1);
  if (tagged) await expect(element).toBeVisible();
  else await expect(element).toBeHidden();
}

/** The record as it was stored before the Blood Pool was recorded explicitly: no sample concept or drive. */
export function preChangeRecord(build: V20Build, bloodPool: number): Record<string, unknown> {
  const { conceptKind: _kind, drive: _drive, ...concept } = build.concept;
  return { ...build, concept, bloodPool };
}

export async function expectRefused(page: Page, message: string): Promise<void> {
  await expect(bloodPoolField(page)).toHaveAttribute('aria-invalid', 'true');
  await expect(bloodPoolField(page)).toHaveAccessibleDescription(new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  await expect(bloodPoolMessage(page)).toHaveText(message);
  expect(await announcements(page)).toContain(message);
}
