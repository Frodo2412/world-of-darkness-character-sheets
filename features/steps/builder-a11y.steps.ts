// The accessibility gate every builder step's scenarios end with: no WCAG 2.1
// AA violations, unique non-empty names for every control, no sideways scroll
// at 375 px.

import { expect, type Page } from '@playwright/test';
import { Then, When } from './fixtures';
import { violationsOnPage } from './support/accessibility';
import { openStep, shownStep, stepNav } from './support/builder';
import { openFreebieSections } from './support/ranked';
import { openRoster } from './support/pages';
import { putRosterInState } from './support/library-states';
import { PHONE, expectNoSidewaysScrollAt } from './support/standards';

When(/^the "?([^"]+?)"? step is checked$/, async ({ page, memory }, step: string) => {
  const heading = page.getByRole('heading', { name: step, level: 2, exact: false });
  if (!(await heading.isVisible())) {
    await stepNav(page).getByRole('link', { name: new RegExp(`^(Character )?${step}`, 'i') }).click();
  }
  await expect(heading).toBeVisible();
  memory.violations = await violationsOnPage(page);
});

When('the finishing touches step is checked with every section open', async ({ page, memory }) => {
  await openStep(page, 'Finishing touches');
  await openFreebieSections(page);
  memory.violations = await violationsOnPage(page);
});

/** Whether two boxes overlap. */
const overlaps = (a: Box, b: Box): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

type Box = { x: number; y: number; width: number; height: number };

/**
 * Tabs through the shown step at phone width and checks every stop is clear
 * of any group heading stuck to the top.
 */
async function focusStopsClearOfStickyParts(page: Page): Promise<void> {
  await page.setViewportSize(PHONE);
  const controls = shownStep(page).locator('a, button, input, select, summary').filter({ visible: true });
  const total = await controls.count();
  expect(total).toBeGreaterThan(0);
  // Every control is visited when there are few; on long steps, a spread of them.
  const stride = Math.max(1, Math.floor(total / 25));
  for (let index = 0; index < total; index += stride) {
    const control = controls.nth(index);
    await control.focus();
    const box = (await control.boundingBox())!;
    const covering: Box[] = await page.evaluate(() => {
      const stuck: HTMLElement[] = [];
      for (const heading of document.querySelectorAll<HTMLElement>('.builder-group h3')) {
        const top = heading.getBoundingClientRect().top;
        if (heading.offsetParent && Math.abs(top - parseFloat(getComputedStyle(heading).top)) < 1) stuck.push(heading);
      }
      return stuck.map((element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      });
    });
    const heading = await control.evaluate((element) => element.closest('h3') !== null);
    if (heading) continue;
    expect(covering.filter((cover) => overlaps(cover, box))).toEqual([]);
  }
}

Then('at 375 pixels wide no focused control is covered by a group readout', async ({ page }) => {
  await focusStopsClearOfStickyParts(page);
});

When('the roster is checked', async ({ page, memory }) => {
  await openRoster(page);
  await putRosterInState(page, memory.libraryState);
  memory.violations = await violationsOnPage(page);
});

Then('no WCAG 2.1 AA violations are reported', async ({ memory }) => {
  expect(memory.violations).toEqual([]);
});

Then('at 375 pixels wide the page does not scroll horizontally', async ({ page }) => {
  await expectNoSidewaysScrollAt(page, PHONE.width);
});
