// The accessibility gate every builder step's scenarios end with: no WCAG 2.1
// AA violations, unique non-empty names for every control, no sideways scroll
// at 375 px.

import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';
import { Then, When } from './fixtures';
import { openRoster } from './support/pages';

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

When(/^the (.+) step is checked$/, async ({ page, memory }, step: string) => {
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

When('the roster is checked', async ({ page, memory }) => {
  await openRoster(page);
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
