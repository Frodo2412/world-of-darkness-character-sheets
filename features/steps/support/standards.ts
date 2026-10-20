// The standards every builder screen is held to: no WCAG 2.1 AA violations at a desktop and a phone
// width, exactly one h1, no sideways scroll at 375 px and 320 px. Plain checks, no step text: the
// generic screen-standards steps are written over these once, and the shell's scenarios use them now.

import { expect, type Page } from '@playwright/test';
import { violationsOnPage } from './accessibility';
import { horizontalOverflow } from './pages';

export const DESKTOP = { width: 1512, height: 900 };
export const PHONE = { width: 375, height: 800 };
export const NARROW_PHONE = { width: 320, height: 800 };

/** The page as it is, scanned at `width` pixels wide. */
export async function expectNoViolationsAt(page: Page, width: number): Promise<void> {
  await page.setViewportSize({ width, height: width >= DESKTOP.width ? DESKTOP.height : PHONE.height });
  expect(await violationsOnPage(page), `WCAG violations at ${width} px`).toEqual([]);
}

/** The page does not scroll sideways at `width` pixels wide. */
export async function expectNoSidewaysScrollAt(page: Page, width: number): Promise<void> {
  await page.setViewportSize({ width, height: PHONE.height });
  expect(await horizontalOverflow(page), `sideways scroll at ${width} px`).toBe(0);
}

/** The page shows exactly one level 1 heading. */
export async function expectOneH1(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
}
