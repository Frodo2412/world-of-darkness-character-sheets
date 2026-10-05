// Steps every builder step shares: opening a step, setting and reading
// ratings, ranks and what a group has left.

import { expect } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import {
  expectRated,
  groupNotice,
  groupReadout,
  openStep,
  rankGroup,
  rankSelect,
  rateTrait,
  requestRating,
  stepNav,
  traitName,
  traitRating,
} from './support/builder';
import { SHEET_ADDRESS } from './support/pages';
import { expectRating, rating } from './support/ratings';

const STEP_TITLES: Record<string, string> = {
  settings: 'Settings',
  concept: 'Concept',
  attributes: 'Attributes',
  abilities: 'Abilities',
  advantages: 'Advantages',
  'finishing touches': 'Finishing touches',
};

const STEP_WORDS = Object.keys(STEP_TITLES).join('|');

/** A trait as scenarios name it: "Strength", "Animal Ken", "the Generation background". */
const NAME = '((?:the )?[A-Z][\\w-]*(?: [A-Z][\\w-]*)*(?: background)?)';

When(new RegExp(`^they open the (${STEP_WORDS}) step$`), async ({ page }, step: string) => {
  await openStep(page, STEP_TITLES[step]);
});

/** "raise Strength to 4", "try to lower Stamina to 0 on the finishing touches step". */
When(
  new RegExp(`^they (?:try to )?(?:raise|lower) ${NAME} to (\\d+)(?: on the (${STEP_WORDS}) step)?$`),
  async ({ page }, name: string, value: string, step?: string) => {
    if (step) await openStep(page, STEP_TITLES[step]);
    await requestRating(await traitRating(page, name), Number(value));
  },
);

When(
  new RegExp(`^they (?:try to )?(raise|lower) ${NAME} by (\\d+)(?: again)?$`),
  async ({ page }, direction: string, name: string, by: string) => {
    const control = await traitRating(page, name);
    const current = Number(await control.getAttribute('aria-valuenow'));
    await requestRating(control, current + (direction === 'raise' ? 1 : -1) * Number(by));
  },
);

Given(/^(\w[\w-]*(?: \w+)?) is rated (\d+)$/, async ({ page }, name: string, value: string) => {
  await rateTrait(page, name, Number(value));
});

Given(
  /^(\w[\w-]*) is rated (\d+) and (\w[\w-]*) is rated (\d+)$/,
  async ({ page }, first: string, a: string, second: string, b: string) => {
    await rateTrait(page, first, Number(a));
    await rateTrait(page, second, Number(b));
  },
);

Then(new RegExp(`^${NAME} is rated (\\d+)$`), async ({ page }, name: string, value: string) => {
  // The sheet's scenarios say the same words; there a rating is read in either mode.
  if (SHEET_ADDRESS.test(page.url())) return expectRating(rating(page, name), Number(value));
  await expectRated(await traitRating(page, name), Number(value));
});

Then(new RegExp(`^${NAME} reports (\\d+) as its (highest|lowest) rating$`), async ({ page }, name: string, value: string, end: string) => {
  const control = await traitRating(page, traitName(name));
  await expect(control).toHaveAttribute(end === 'highest' ? 'aria-valuemax' : 'aria-valuemin', String(value));
});

When(
  /^they rank (\w+) (primary|secondary|tertiary), (\w+) (primary|secondary|tertiary) and (\w+) (primary|secondary|tertiary)$/,
  async ({ page }, a: string, ra: string, b: string, rb: string, c: string, rc: string) => {
    await rankGroup(page, a, ra);
    await rankGroup(page, b, rb);
    await rankGroup(page, c, rc);
  },
);

When(/^they rank (\w+) (primary|secondary|tertiary)$/, async ({ page }, group: string, rank: string) => {
  await rankGroup(page, group, rank);
});

Then(/^(\w+) has (\d+) dots? remaining$/, async ({ page }, group: string, count: string) => {
  const dots = Number(count) === 1 ? 'dot' : 'dots';
  await expect(await groupReadout(page, group)).toHaveText(`${group}: ${count} ${dots} remaining`);
});

Then(/^(\w+) is (primary|secondary|tertiary)$/, async ({ page }, group: string, rank: string) => {
  await expect(await rankSelect(page, group)).toHaveValue(rank);
});

Then(
  /^(\w+) is (primary|secondary|tertiary) and (\w+) is (primary|secondary|tertiary)$/,
  async ({ page }, a: string, ra: string, b: string, rb: string) => {
    await expect(await rankSelect(page, a)).toHaveValue(ra);
    await expect(await rankSelect(page, b)).toHaveValue(rb);
  },
);

Then(/^(\w+) is (primary|secondary|tertiary) and (\w+) has no rank$/, async ({ page }, a: string, ra: string, b: string) => {
  await expect(await rankSelect(page, a)).toHaveValue(ra);
  await expect(await rankSelect(page, b)).toHaveValue('');
});

Then(/^(\w+) and (\w+) have no rank$/, async ({ page }, a: string, b: string) => {
  await expect(await rankSelect(page, a)).toHaveValue('');
  await expect(await rankSelect(page, b)).toHaveValue('');
});

Then(/^no message is shown beside the (\w+) group$/, async ({ page }, group: string) => {
  await expect(await groupNotice(page, group)).toHaveText('');
});

Then(/^the step navigation marks the (\w+) step "([^"]+)"$/, async ({ page }, step: string, status: string) => {
  await expect(stepNav(page).getByRole('link', { name: step, exact: true })).toHaveAccessibleDescription(status);
});

When(
  /^using only the keyboard they focus (\w+) and press (Home|End)$/,
  async ({ page }, name: string, key: string) => {
    const control = await traitRating(page, name);
    await control.focus();
    await page.keyboard.press(key);
  },
);

Then(/^(\w+) is rated 0 and is announced as fixed for (\w+)$/, async ({ page }, name: string, clan: string) => {
  const control = await traitRating(page, name);
  await expectRated(control, 0);
  await expect(control).toHaveAttribute('aria-valuetext', new RegExp(`fixed for ${clan}`));
  await expect(control).toHaveAttribute('aria-disabled', 'true');
});
