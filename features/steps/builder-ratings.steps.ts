// Steps every builder step shares: opening a step, setting and reading
// ratings, ranks and what a group has left.

import { expect, type Locator, type Page } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import { openStep, shownStep } from './support/builder';
import {
  expectRated,
  expectRemaining,
  groupNotice,
  rankGroup,
  rankSelect,
  rateTrait,
  ratingOf,
  requestRating,
  stepButton,
  traitName,
  traitRating,
} from './support/ranked';
import { SHEET_ADDRESS } from './support/pages';
import { expectRating, rating } from './support/ratings';

const STEP_TITLES: Record<string, string> = {
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
    await requestRating(control, (await ratingOf(control)) + (direction === 'raise' ? 1 : -1) * Number(by));
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
  await expect(control).toHaveAttribute(end === 'highest' ? 'data-max' : 'data-min', String(value));
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
  await expectRemaining(page, group, Number(count));
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

/** "focus Decrease Stamina and press Enter 3 times": the keyboard alone, one press at a time. */
When(
  /^using only the keyboard they focus (Increase|Decrease) (\w+) and press Enter (\d+) times$/,
  async ({ page }, direction: 'Increase' | 'Decrease', name: string, times: string) => {
    const button = stepButton(await traitRating(page, name), direction);
    await button.focus();
    for (let press = 0; press < Number(times); press += 1) await page.keyboard.press('Enter');
    await expect(button).toBeFocused();
  },
);

Then(/^(\w+) is rated 0 and is announced as fixed for (\w+)$/, async ({ page }, name: string, clan: string) => {
  const control = await traitRating(page, name);
  await expectRated(control, 0);
  await expect(control.locator('[data-rating-text]')).toHaveText(new RegExp(`fixed for ${clan}`));
  await expect(control.getByRole('button')).toHaveCount(2);
  for (const button of await control.getByRole('button').all()) await expect(button).toHaveAttribute('aria-disabled', 'true');
  await expect(control.locator('[data-rating-limit]')).toHaveText(`Fixed for ${clan}`);
});

// Rating rows: the Increase and Decrease buttons (builder-rating-rows.feature)

const BUTTON = '(Increase|Decrease)';

const rowButton = async (page: Page, direction: 'Increase' | 'Decrease', name: string): Promise<Locator> =>
  stepButton(await traitRating(page, name), direction);

When(new RegExp(`^they press ${BUTTON} (\\w+)$`), async ({ page }, direction: 'Increase' | 'Decrease', name: string) => {
  // Playwright treats aria-disabled as not enabled; a button at its bound is still pressed.
  await (await rowButton(page, direction, name)).click({ force: true });
});

Then(/^(\w+) has the buttons "([^"]+)" and "([^"]+)"$/, async ({ page }, name: string, first: string, second: string) => {
  const names = await (await traitRating(page, name)).getByRole('button').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')));
  expect(names).toEqual([first, second]);
});

Then(new RegExp(`^${BUTTON} (\\w+) is (available|unavailable)$`), async ({ page }, direction: 'Increase' | 'Decrease', name: string, state: string) => {
  const button = await rowButton(page, direction, name);
  if (state === 'unavailable') await expect(button).toHaveAttribute('aria-disabled', 'true');
  else await expect(button).not.toHaveAttribute('aria-disabled', /./);
});

Then(new RegExp(`^${BUTTON} (\\w+) is still on the page and can be focused$`), async ({ page }, direction: 'Increase' | 'Decrease', name: string) => {
  const button = await rowButton(page, direction, name);
  await button.focus();
  await expect(button).toBeFocused();
});

Then(/^"([^"]+)" is shown beside Increase (\w+)$/, async ({ page }, text: string, name: string) => {
  await expect((await traitRating(page, name)).locator('[data-rating-limit]')).toHaveText(text);
  await expect((await traitRating(page, name)).locator('[data-rating-limit]')).toBeVisible();
});

Then(/^no limit is shown beside Increase (\w+)$/, async ({ page }, name: string) => {
  await expect((await traitRating(page, name)).locator('[data-rating-limit]')).toBeHidden();
});

Then(new RegExp(`^${BUTTON} (\\w+) is described by "([^"]+)"$`), async ({ page }, direction: 'Increase' | 'Decrease', name: string, text: string) => {
  await expect(await rowButton(page, direction, name)).toHaveAccessibleDescription(new RegExp(text));
});

Then(/^Decrease (\w+) is described by nothing about a minimum$/, async ({ page }, name: string) => {
  await expect(await rowButton(page, 'Decrease', name)).not.toHaveAccessibleDescription(/Minimum|Fixed/);
});

/** The stepper's polite slot for the value a press produced. */
const valueSlot = async (page: Page, name: string): Promise<Locator> =>
  (await traitRating(page, name)).locator('[data-rating-announce]');

Then(/^pressing announced "([^"]+)" for (\w+)$/, async ({ page }, text: string, name: string) => {
  const slot = await valueSlot(page, name);
  await expect(slot).toHaveAttribute('role', 'status');
  await expect(slot).toHaveText(text);
});

Then(/^nothing was announced as a value for (\w+)$/, async ({ page }, name: string) => {
  await expect(await valueSlot(page, name)).toBeEmpty();
});

Then(new RegExp(`^the visible symbol of ${BUTTON} (\\w+) is hidden from assistive technology$`), async ({ page }, direction: 'Increase' | 'Decrease', name: string) => {
  const symbol = (await rowButton(page, direction, name)).locator('[aria-hidden="true"]');
  await expect(symbol).toHaveText(direction === 'Increase' ? '+' : '−');
});

Then(/^(\w+) is a group holding the buttons "([^"]+)" and "([^"]+)"$/, async ({ page }, name: string, first: string, second: string) => {
  const row = await traitRating(page, name);
  await expect(row).toHaveAttribute('role', 'group');
  const group = shownStep(page).getByRole('group', { name, exact: true });
  await expect(group.getByRole('button')).toHaveText([/./, /./]);
  expect(await group.getByRole('button').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')))).toEqual([first, second]);
});

Then(/^the (\w+) group says "([^"]+)"$/, async ({ page }, group: string, text: string) => {
  await expect(await groupNotice(page, group)).toHaveText(text);
});

Then(new RegExp(`^${BUTTON} (\\w+) still has keyboard focus$`), async ({ page }, direction: 'Increase' | 'Decrease', name: string) => {
  await expect(await rowButton(page, direction, name)).toBeFocused();
});
