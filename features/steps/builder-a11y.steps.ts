// The accessibility gate every builder step's scenarios end with: no WCAG 2.1
// AA violations, unique non-empty names for every control, no sideways scroll
// at 375 px.

import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';
import { Then, When } from './fixtures';

const PHONE = { width: 375, height: 800 };

const CONTROL_ROLES = 'textbox|combobox|slider|button|link|checkbox|radio|spinbutton';
const CONTROL_LINE = new RegExp(`^\\s*- (?:${CONTROL_ROLES})\\b`);
const CONTROL_NAME = new RegExp(`^\\s*- (?:${CONTROL_ROLES}) "([^"]+)"`);

When(/^the (.+) step is checked$/, async ({ page, memory }, step: string) => {
  const heading = page.getByRole('heading', { name: step, level: 2, exact: false });
  if (!(await heading.isVisible())) {
    await page
      .getByRole('navigation', { name: 'Build steps' })
      .getByRole('link', { name: new RegExp(`^${step}`, 'i') })
      .click();
  }
  await expect(heading).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  memory.violations = results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.help} — ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
  );
});

Then('no WCAG 2.1 AA violations are reported', async ({ memory }) => {
  expect(memory.violations).toEqual([]);
});

Then('every control has a unique, non-empty accessible name', async ({ page }) => {
  // The accessibility tree as assistive technology receives it, one node per line.
  const tree = await page.locator('main').ariaSnapshot();
  const lines = tree.split('\n').filter((line) => CONTROL_LINE.test(line));
  const names = lines.map((line) => CONTROL_NAME.exec(line)?.[1]);

  expect(lines.length).toBeGreaterThan(0);
  expect(lines.filter((_, index) => !names[index]?.trim())).toEqual([]);
  expect(names.filter((name, index) => names.indexOf(name) !== index)).toEqual([]);
});

Then('at 375 pixels wide the page does not scroll horizontally', async ({ page }) => {
  await page.setViewportSize(PHONE);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});
