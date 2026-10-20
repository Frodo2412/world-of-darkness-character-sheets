// The standards every builder screen is held to, as steps written once. A screen's feature ends in these
// and never restates them: axe at 1512 px and 375 px, one h1, focus on arrival, no sideways scroll.

import { expect } from '@playwright/test';
import { SCREENS } from '../../src/domain/v20/creation/rules';
import { Then } from './fixtures';
import { expectUniqueControlNames } from './support/accessibility';
import { screenTitle, shownStep, stepHeading } from './support/builder';
import { escaped } from './support/text';
import { expectNoSidewaysScrollAt, expectNoViolationsAt, expectOneH1, DESKTOP, PHONE } from './support/standards';

Then('axe reports no violations at 1512 px and 375 px', async ({ page }) => {
  await expectNoViolationsAt(page, DESKTOP.width);
  await expectNoViolationsAt(page, PHONE.width);
});

Then('there is exactly one h1', async ({ page }) => {
  await expectOneH1(page);
});

// Slices written before the shared standards say "unique, non-empty"; both phrasings are this one check.
Then(/^every control has a unique(?:, non-empty)? accessible name$/, async ({ page }) => {
  await expectUniqueControlNames(page.locator('main'));
});

Then('the page does not scroll horizontally at {int} px', async ({ page }, width: number) => {
  await expectNoSidewaysScrollAt(page, width);
});

Then(new RegExp(`^focus is on the (${SCREENS.map((screen) => escaped(screen.title)).join('|')}) heading$`), async ({ page }, title: string) => {
  await expect(stepHeading(page, title)).toBeFocused();
});

// The eyebrow is real text ("Phase 02 / Attributes"; the capitals are only CSS) set directly above the screen's heading.
Then(
  new RegExp(`^the (${SCREENS.map((screen) => escaped(screen.title)).join('|')}) screen is headed by the phase "([^"]+)"$`),
  async ({ page }, title: string, eyebrow: string) => {
    await expect(shownStep(page).locator('.builder-eyebrow')).toHaveText(eyebrow);
    await expect(shownStep(page).locator('.builder-eyebrow + h2')).toHaveText(screenTitle(title));
  },
);
