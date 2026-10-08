// The accessibility gate every builder step's scenarios end with: no WCAG 2.1
// AA violations, unique non-empty names for every control, no sideways scroll
// at 375 px.

import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';
import { Then, When } from './fixtures';
import { openFreebieSections, openStep, shownStep } from './support/builder';
import { openRoster } from './support/pages';
import { putRosterInState } from './support/library-states';

const PHONE = { width: 375, height: 800 };

const CONTROL_ROLES = 'textbox|combobox|slider|button|link|checkbox|radio|spinbutton';
const CONTROL_LINE = new RegExp(`^\\s*- (?:${CONTROL_ROLES})\\b`);
const CONTROL_NAME = new RegExp(`^\\s*- (${CONTROL_ROLES}) "([^"]+)"`);

/** Accessibility rule ids the page breaks, with the elements that break them. */
async function wcagViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.help} — ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
  );
}

When(/^the "?([^"]+?)"? step is checked$/, async ({ page, memory }, step: string) => {
  const heading = page.getByRole('heading', { name: step, level: 2, exact: false });
  if (!(await heading.isVisible())) {
    await page
      .getByRole('navigation', { name: 'Build steps' })
      .getByRole('link', { name: new RegExp(`^${step}`, 'i') })
      .click();
  }
  await expect(heading).toBeVisible();
  memory.violations = await wcagViolations(page);
});

When('the finishing touches step is checked with every section open', async ({ page, memory }) => {
  await openStep(page, 'Finishing touches');
  await openFreebieSections(page);
  memory.violations = await wcagViolations(page);
});

/** Whether two boxes overlap. */
const overlaps = (a: Box, b: Box): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

type Box = { x: number; y: number; width: number; height: number };

/**
 * Tabs through the shown step at phone width and checks every stop is clear
 * of the freebie bar and of any group heading stuck to the top.
 */
async function focusStopsClearOfStickyParts(page: Page, includeHeadings: boolean): Promise<void> {
  await page.setViewportSize(PHONE);
  const controls = shownStep(page).locator('a, button, input, select, summary, [role="slider"]').filter({ visible: true });
  const total = await controls.count();
  expect(total).toBeGreaterThan(0);
  // Every control is visited when there are few; on long steps, a spread of them.
  const stride = Math.max(1, Math.floor(total / 25));
  for (let index = 0; index < total; index += stride) {
    const control = controls.nth(index);
    await control.focus();
    const box = (await control.boundingBox())!;
    const covering: Box[] = await page.evaluate((withHeadings) => {
      const stuck = [...document.querySelectorAll<HTMLElement>('[data-freebie-bar]')];
      if (withHeadings) {
        for (const heading of document.querySelectorAll<HTMLElement>('.builder-group h3')) {
          const top = heading.getBoundingClientRect().top;
          if (heading.offsetParent && Math.abs(top - parseFloat(getComputedStyle(heading).top)) < 1) stuck.push(heading);
        }
      }
      return stuck
        .filter((element) => !element.hidden)
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        });
    }, includeHeadings);
    const heading = await control.evaluate((element) => element.closest('h3') !== null);
    if (heading) continue;
    expect(covering.filter((cover) => overlaps(cover, box))).toEqual([]);
  }
}

Then('at 375 pixels wide no focused control is covered by the freebie bar or a group readout', async ({ page }) => {
  await focusStopsClearOfStickyParts(page, true);
});

Then('the freebie points remaining bar does not cover the focused control', async ({ page }) => {
  await focusStopsClearOfStickyParts(page, false);
});

When('the roster is checked', async ({ page, memory }) => {
  await openRoster(page);
  await putRosterInState(page, memory.libraryState);
  memory.violations = await wcagViolations(page);
});

Then('no WCAG 2.1 AA violations are reported', async ({ memory }) => {
  expect(memory.violations).toEqual([]);
});

Then('every control has a unique, non-empty accessible name', async ({ page }) => {
  // The accessibility tree as assistive technology receives it, one node per line.
  const tree = await page.locator('main').ariaSnapshot();
  const lines = tree.split('\n').filter((line) => CONTROL_LINE.test(line));
  const named = lines.map((line) => CONTROL_NAME.exec(line));

  expect(lines.length).toBeGreaterThan(0);
  expect(lines.filter((_, index) => !named[index]?.[2].trim())).toEqual([]);
  // A role is announced with its name, so the "Concept" step link and the
  // "Concept" text field are told apart; two links of one name are not.
  const identities = named.map((match) => `${match![1]} "${match![2]}"`);
  expect(identities.filter((identity, index) => identities.indexOf(identity) !== index)).toEqual([]);
});

Then('at 375 pixels wide the page does not scroll horizontally', async ({ page }) => {
  await page.setViewportSize(PHONE);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});
