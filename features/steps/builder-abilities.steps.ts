import { expect } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import { openStep, shownStep } from './support/builder';
import {
  GROUP,
  SCREEN,
  TITLE_RANK,
  TRAIT,
  groupBox,
  groupPoolRemaining,
  lower,
  lowerOne,
  rankGroup,
  ranked,
  ratingOf,
  ratingRow,
  ratingsIn,
  shownCallouts,
  stepButton,
} from './support/ranked';

Given(
  new RegExp(`^I am on the Abilities screen with ${GROUP} Primary, ${GROUP} Secondary and ${GROUP} Tertiary$`),
  async ({ page }, first: string, second: string, third: string) => {
    await openStep(page, 'Abilities');
    await rankGroup(page, first, 'primary');
    await rankGroup(page, second, 'secondary');
    await rankGroup(page, third, 'tertiary');
  },
);

Given(new RegExp(`^I am on the ${SCREEN} screen with ${GROUP} ranked ${TITLE_RANK}$`), async ({ page }, screen: string, group: string, rank: string) => {
  await openStep(page, screen);
  await rankGroup(page, group, lower(rank));
});

When('I lower one Skill', async ({ page }) => {
  await lowerOne(page, 'Skills');
});

// Then

Then(/^the pools read "([^"]+)", "([^"]+)" and "([^"]+)"$/, async ({ page, memory }, first: string, second: string, third: string) => {
  const groups = ranked({ memory }).ranked;
  expect(groups).toHaveLength(3);
  for (const [group, text] of [[groups[0], first], [groups[1], second], [groups[2], third]]) {
    await expect(await groupPoolRemaining(page, group)).toHaveText(text);
  }
});

Then('it names the Skills below 3 and not Crafts', async ({ page }) => {
  const rows = await ratingsIn(await groupBox(page, 'Skills')).all();
  const below: string[] = [];
  for (const row of rows) {
    if ((await ratingOf(row)) < 3) {
      below.push(await row.evaluate((element) => document.getElementById(element.getAttribute('data-label-id')!)!.textContent ?? ''));
    }
  }
  const named = (await shownCallouts(page).locator('[data-callout-traits]').textContent()) ?? '';
  for (const name of below) expect(named).toContain(name);
  expect(named).not.toContain('Crafts');
  expect(below).not.toContain('Crafts');
});

Then('every Ability reads 0', async ({ page }) => {
  await openStep(page, 'Abilities');
  const rows = shownStep(page).locator('.rating-stepper');
  await expect(rows).toHaveCount(30);
  for (const row of await rows.all()) await expect(row).toHaveAttribute('data-value', '0');
});

Then(new RegExp(`^the plus control on ${TRAIT} is unavailable but still focused$`), async ({ page, memory }, trait: string) => {
  ranked({ memory }).trait = trait;
  const plus = stepButton(ratingRow(shownStep(page), trait), 'Increase');
  await expect(plus).toHaveAttribute('aria-disabled', 'true');
  await expect(plus).toBeFocused();
});

Then(new RegExp(`^the ${GROUP} group is tagged "([^"]+)"$`), async ({ page }, group: string, text: string) => {
  await expect((await groupBox(page, group)).locator('[data-ranked-tag]')).toHaveText(text);
});
