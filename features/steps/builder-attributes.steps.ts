import { expect } from '@playwright/test';
import { ATTRIBUTE_GROUPS } from '../../src/domain/v20/traits';
import type { BuildTraitRef } from '../../src/domain/v20/creation/build';
import { RANKED_ALLOTMENTS } from '../../src/domain/v20/creation/rules';
import { creation, freebie, rank } from '../../src/domain/v20/creation/testing/play';
import { Given, Then, When } from './fixtures';
import { ANNOUNCEMENT_WINDOW_MS, announcements, waitOnPageClock } from './support/announcements';
import { buildWith, freebiePointsRemaining, openPlayed, openSavedBuild, openStep, startBuild } from './support/builder';
import { chooseClan, clanNotice, clanPanel, clanRadio, expectClanChosen } from './support/clan';
import {
  ANY_SCREEN,
  GROUP,
  SCREEN,
  TITLE_RANK,
  TRAIT,
  arrange,
  dotsOfRank,
  expectRated,
  groupBox,
  groupNotice,
  groupPoolRemaining,
  groupPoolSpent,
  lower,
  lowerOne,
  placeDots,
  placeOne,
  poolStatus,
  rankGroup,
  rankSelect,
  ranked,
  rateTrait,
  ratingNameOf,
  ratingOf,
  ratingsIn,
  requestRating,
  shownCallouts,
  shownRanked,
  stepButton,
  totalOf,
  traitRating,
} from './support/ranked';
import { escaped } from './support/text';

const RANK = '(primary|secondary|tertiary)';

// Given

Given('a player on the attributes step', async ({ page }) => {
  await startBuild(page);
  await openStep(page, 'Attributes');
});

Given('a player on the attributes step with no ranks chosen', async ({ page }) => {
  await startBuild(page);
  await openStep(page, 'Attributes');
});

Given(new RegExp(`^a player who has ranked (\\w+) ${RANK}$`), async ({ page }, group: string, value: string) => {
  await startBuild(page);
  await rankGroup(page, group, value);
});

Given(
  new RegExp(`^a player who has ranked (\\w+) ${RANK}, (\\w+) ${RANK} and (\\w+) ${RANK}$`),
  async ({ page }, a: string, ra: string, b: string, rb: string, c: string, rc: string) => {
    await startBuild(page);
    await rankGroup(page, a, ra);
    await rankGroup(page, b, rb);
    await rankGroup(page, c, rc);
  },
);

Given(
  new RegExp(`^a player who has ranked (\\w+) ${RANK} and raised ([A-Z][\\w ]*?) to (\\d+)$`),
  async ({ page }, group: string, value: string, trait: string, rating: string) => {
    await startBuild(page);
    await rankGroup(page, group, value);
    await rateTrait(page, trait, Number(rating));
  },
);

Given(
  new RegExp(`^a player who has ranked (\\w+) ${RANK} and placed all (\\d+) \\w+ dots$`),
  async ({ page, memory }, group: string, value: string, count: string) => {
    await startBuild(page);
    await rankGroup(page, group, value);
    const cap = ATTRIBUTE_GROUPS.some((entry) => entry.label === group) ? 5 : 3;
    await placeDots(page, group, Number(count), cap);
    for (const row of await ratingsIn(page.getByRole('group', { name: group, exact: true })).all()) {
      memory.ratings.set(await ratingNameOf(row), await ratingOf(row));
    }
  },
);

Given('a player who was just told Mental has no dots remaining', async ({ page }) => {
  await startBuild(page);
  await rankGroup(page, 'Mental', 'tertiary');
  await rateTrait(page, 'Perception', 3);
  await rateTrait(page, 'Intelligence', 2);
  await requestRating(await traitRating(page, 'Wits'), 2);
  await expect(await groupNotice(page, 'Mental')).toContainText('Mental has no dots remaining');
});

Given(/^a build whose Physical group is overspent by 1 dot$/, async ({ page }) => {
  await openPlayed(
    page,
    rank('physical', 'primary'),
    creation('attribute:strength', 3),
    creation('attribute:dexterity', 3),
    rank('physical', 'tertiary'),
  );
  await openStep(page, 'Attributes');
});

// When

When(/^they choose the clan "([^"]+)" and confirm$/, async ({ page }, name: string) => {
  await chooseClan(page, name);
  await clanPanel(page).getByRole('button', { name: `Switch to ${name}` }).click();
});

// Then

Then(/^they are told, beside the (\w+) group, to rank the group first$/, async ({ page }, group: string) => {
  await expect(await groupNotice(page, group)).toHaveText(`Rank the ${group} group before placing dots in it.`);
});

Then(
  /^they are told (\w+) is now (\w+) and (\w+) now has no rank, so (\d+) \w+ dots are overspent until \w+ is ranked$/,
  async ({ page }, a: string, ra: string, b: string, dots: string) => {
    await expect(await groupNotice(page, a)).toHaveText(
      `${a} is now ${ra} and ${b} now has no rank, so ${dots} ${b} dots are overspent until ${b} is ranked.`,
    );
  },
);

Then(/^(\w+) is no longer reported as overspent$/, async ({ page }, group: string) => {
  await expect(await groupPoolRemaining(page, group)).not.toContainText('Overspent');
});

Then(
  /^they are asked to confirm that (.+)$/,
  async ({ page }, what: string) => {
    await expect(clanPanel(page)).toBeVisible();
    await expect(clanPanel(page)).toContainText(new RegExp(escaped(what), 'i'));
  },
);

Then(
  /^declining keeps the clan "([^"]+)" (?:and|with) (\w+) rated (\d+)$/,
  async ({ page }, name: string, trait: string, rating: string) => {
    await clanPanel(page).getByRole('button', { name: `Keep ${name}` }).click();
    await expect(clanPanel(page)).toBeHidden();
    await expectClanChosen(page, name);
    await expect(clanRadio(page, name)).toBeFocused();
    await expectRated(await traitRating(page, trait), Number(rating));
  },
);

Then(/^they are told (?:that )?(Appearance was set to 0.*|the .+ dots? (?:was|were) removed.*)$/, async ({ page }, what: string) => {
  await expect(clanNotice(page)).toContainText(new RegExp(escaped(what), 'i'));
});

Then('no confirmation was asked', async ({ page }) => {
  await expect(clanPanel(page)).toBeHidden();
});

// The redesigned screens (shared by Abilities)

Given('I am on the Attributes screen of a new build', async ({ page }) => {
  await startBuild(page);
  await openStep(page, 'Attributes');
});

Given(new RegExp(`^${GROUP} is ${TITLE_RANK} and ${GROUP} is ${TITLE_RANK}$`), async ({ page }, a: string, ra: string, b: string, rb: string) => {
  await rankGroup(page, a, lower(ra));
  await rankGroup(page, b, lower(rb));
});

Given(
  new RegExp(`^${GROUP} is ${TITLE_RANK}, ${GROUP} ${TITLE_RANK} and ${GROUP} ${TITLE_RANK}$`),
  async ({ page }, a: string, ra: string, b: string, rb: string, c: string, rc: string) => {
    await rankGroup(page, a, lower(ra));
    await rankGroup(page, b, lower(rb));
    await rankGroup(page, c, lower(rc));
  },
);

Given(new RegExp(`^${GROUP} is ${TITLE_RANK} on the ${ANY_SCREEN} screen$`), async ({ page }, group: string, rank: string) => {
  await rankGroup(page, group, lower(rank));
});

Given(
  new RegExp(`^${GROUP} is ${TITLE_RANK} with (\\d+)(?: of (\\d+))?(?: additional)? dots placed$`),
  async ({ page, memory }, group: string, rank: string, placed: string, of?: string) => {
    if (of) expect(dotsOfRank(group, rank)).toBe(Number(of));
    ranked({ memory }).freebies = (await freebiePointsRemaining(page).textContent()) ?? '';
    await arrange(page, group, rank, Number(placed));
    ranked({ memory }).totals.set(group, await totalOf(page, group));
  },
);

Given(new RegExp(`^${GROUP} is ${TITLE_RANK}$`), async ({ page }, group: string, value: string) => {
  await rankGroup(page, group, lower(value));
});

Given(
  new RegExp(`^a saved build holds Primary for both ${GROUP} and ${GROUP}$`),
  async ({ page }, first: string, second: string) => {
    const build = buildWith();
    for (const group of [first, second]) {
      const key = RANKED_ALLOTMENTS.flatMap((allotment) => allotment.groups).find((entry) => entry.label === group)!.key;
      build.ranks = { ...build.ranks, [key]: 'primary' };
    }
    await openSavedBuild(page, build);
  },
);

Given(
  new RegExp(`^${GROUP} is ${TITLE_RANK} with a freebie dot on ${TRAIT}$`),
  async ({ page }, group: string, value: string, trait: string) => {
    const key = ATTRIBUTE_GROUPS.find((entry) => entry.label === group)!.key;
    // An Attribute's key is its label in lower case.
    await openPlayed(page, rank(key, lower(value)), freebie(`attribute:${lower(trait)}` as BuildTraitRef, 2));
    await openStep(page, 'Attributes');
  },
);

Given('every Attribute group is fully placed', async ({ page }) => {
  await arrange(page, 'Physical', 'Primary', 7);
  await arrange(page, 'Social', 'Secondary', 5);
  await arrange(page, 'Mental', 'Tertiary', 3);
});

Given(new RegExp(`^${TRAIT} is at (\\d+)$`), async ({ page }, trait: string, value: string) => {
  await rateTrait(page, trait, Number(value));
});

// When

When(new RegExp(`^I open the ${GROUP} priority select$`), async ({ page, memory }, group: string) => {
  ranked({ memory }).trait = group;
  await expect(await rankSelect(page, group)).toBeVisible();
});

When(new RegExp(`^I set ${GROUP} to ${TITLE_RANK}(?: on the ${ANY_SCREEN} screen)?$`), async ({ page, memory }, group: string, rank: string) => {
  ranked({ memory }).mark = (await announcements(page)).length;
  await rankGroup(page, group, lower(rank));
});

When(
  new RegExp(`^I rank ${GROUP} Primary, ${GROUP} Secondary and ${GROUP} Tertiary$`),
  async ({ page, memory }, first: string, second: string, third: string) => {
    ranked({ memory }).ranked = [first, second, third];
    await rankGroup(page, first, 'primary');
    await rankGroup(page, second, 'secondary');
    await rankGroup(page, third, 'tertiary');
  },
);

When(new RegExp(`^I try to raise another ${GROUP} Attribute$`), async ({ page, memory }, group: string) => {
  ranked({ memory }).totals.set(group, await totalOf(page, group));
  const rows = await ratingsIn(await groupBox(page, group)).all();
  const row = rows.at(-1)!;
  await stepButton(row, 'Increase').click({ force: true });
});

When(new RegExp(`^I try to lower ${TRAIT}$`), async ({ page, memory }, trait: string) => {
  ranked({ memory }).trait = trait;
  const row = await traitRating(page, trait);
  await requestRating(row, (await ratingOf(row)) - 1);
});

When(new RegExp(`^I try to raise ${TRAIT}$`), async ({ page, memory }, trait: string) => {
  ranked({ memory }).trait = trait;
  const row = await traitRating(page, trait);
  await stepButton(row, 'Increase').click({ force: true });
});

When(new RegExp(`^I raise ${TRAIT} to (\\d+)$`), async ({ page, memory }, trait: string, value: string) => {
  ranked({ memory }).trait = trait;
  await requestRating(await traitRating(page, trait), Number(value));
});

When(new RegExp(`^I place one more ${GROUP} dot$`), async ({ page }, group: string) => {
  await placeOne(page, group);
});

When(new RegExp(`^the last ${GROUP} dot is placed$`), async ({ page }, group: string) => {
  for (let guard = 0; guard < 20 && !/^0 remaining$/.test((await (await groupPoolRemaining(page, group)).textContent()) ?? ''); guard += 1) {
    await placeOne(page, group);
  }
});

When(new RegExp(`^I place the last ${GROUP} dot$`), async ({ page }, group: string) => {
  await placeOne(page, group);
});

When(new RegExp(`^I lower one ${GROUP} Attribute$`), async ({ page }, group: string) => {
  await lowerOne(page, group);
});

Then('Primary, Secondary and Tertiary are all offered', async ({ page, memory }) => {
  const select = await rankSelect(page, ranked({ memory }).trait);
  const offered = await select.locator('option:not([value=""])').evaluateAll((all) =>
    all.map((option) => ({ text: option.textContent ?? '', disabled: (option as HTMLOptionElement).disabled })),
  );
  expect(offered.map((option) => option.text.split(' ')[0])).toEqual(['Primary', 'Secondary', 'Tertiary']);
  expect(offered.some((option) => option.disabled)).toBe(false);
});

Then(
  /^the options read "([^"]+)", "([^"]+)" and "([^"]+)"$/,
  async ({ page, memory }, first: string, second: string, third: string) => {
    const select = await rankSelect(page, ranked({ memory }).trait);
    await expect(select.locator('option:not([value=""])')).toHaveText([first, second, third]);
  },
);

Then(new RegExp(`^${GROUP} is ${TITLE_RANK} and ${GROUP} is ${TITLE_RANK}$`), async ({ page }, a: string, ra: string, b: string, rb: string) => {
  await expect(await rankSelect(page, a)).toHaveValue(lower(ra));
  await expect(await rankSelect(page, b)).toHaveValue(lower(rb));
});

Then(new RegExp(`^${GROUP} is still ${TITLE_RANK}$`), async ({ page }, group: string, rank: string) => {
  await expect(await rankSelect(page, group)).toHaveValue(lower(rank));
});

Then(/^it is announced that (.+)$/, async ({ page, memory }, text: string) => {
  await expect.poll(async () => (await announcements(page)).slice(ranked({ memory }).mark).some((entry) => entry.includes(text))).toBe(true);
});

Then('exactly one message is announced and it names both groups', async ({ page, memory }) => {
  await waitOnPageClock(page, ANNOUNCEMENT_WINDOW_MS);
  const said = (await announcements(page)).slice(ranked({ memory }).mark);
  expect(said).toHaveLength(1);
  const named = RANKED_ALLOTMENTS.flatMap((allotment) => allotment.groups.map((group) => group.label)).filter((label) => said[0].includes(label));
  expect(named.length).toBeGreaterThanOrEqual(2);
});

Then(/^exactly one message is announced and it reads "([^"]+)"$/, async ({ page, memory }, text: string) => {
  await waitOnPageClock(page, ANNOUNCEMENT_WINDOW_MS);
  expect((await announcements(page)).slice(ranked({ memory }).mark)).toEqual([text]);
});

Then('the priority status is a live region', async ({ page }) => {
  await expect(shownRanked(page).locator('[data-ranked-priority]')).toHaveAttribute('role', 'status');
});

Then('the callout title is a level 4 heading', async ({ page }) => {
  await expect(shownCallouts(page).getByRole('heading', { level: 4, name: /^Finish .+ before moving on$/ })).toHaveCount(1);
});

Then(/^the status reads "([^"]+)"$/, async ({ page }, text: string) => {
  await expect(shownRanked(page).locator('[data-ranked-priority]')).toHaveText(text);
});

Then(new RegExp(`^the ${SCREEN} status reads "([^"]+)"$`), async ({ page }, screen: string, text: string) => {
  await openStep(page, screen);
  await expect(shownRanked(page).locator('[data-ranked-priority]')).toHaveText(text);
});

Then(new RegExp(`^the ${GROUP} pool reads "([^"]+)"$`), async ({ page }, group: string, text: string) => {
  await expect(await groupPoolRemaining(page, group)).toHaveText(text);
});

Then(new RegExp(`^the ${GROUP} pool reads "([^"]+)" and "([^"]+)"$`), async ({ page }, group: string, remaining: string, spent: string) => {
  await expect(await groupPoolRemaining(page, group)).toHaveText(remaining);
  await expect(await groupPoolSpent(page, group)).toHaveText(spent);
});

Then('each pool reads "Complete"', async ({ page }) => {
  const pools = shownRanked(page).locator('[data-pool-spent]');
  await expect(pools).toHaveCount(3);
  for (const pool of await pools.all()) await expect(pool).toContainText('Complete');
});

Then('no callout is shown', async ({ page }) => {
  await expect(shownCallouts(page)).toHaveCount(0);
});

Then(new RegExp(`^no ${GROUP} dot was removed$`), async ({ page, memory }, group: string) => {
  expect(await totalOf(page, group)).toBe(ranked({ memory }).totals.get(group));
});

Then(new RegExp(`^the ${GROUP} total is unchanged$`), async ({ page, memory }, group: string) => {
  expect(await totalOf(page, group)).toBe(ranked({ memory }).totals.get(group));
});

Then(/^the text beside Continue reads "([^"]+)"$/, async ({ page }, text: string) => {
  await expect(page.locator('[data-continue-reason]')).toHaveText(text);
});

Then('every Attribute shows at least one dot', async ({ page }) => {
  for (const group of ATTRIBUTE_GROUPS) {
    for (const trait of group.traits) await expect((await traitRating(page, trait.label)).locator('.rating-mark.is-filled')).not.toHaveCount(0);
  }
});

Then('the card says dot counts include 1 automatic dot in each trait', async ({ page }) => {
  await openStep(page, 'Attributes');
  await expect(shownRanked(page).locator('[data-ranked-intro]')).toHaveText('Dot counts include 1 automatic dot in each trait.');
});

Then(/^a callout reads "([^"]+)"$/, async ({ page }, text: string) => {
  await expect(shownCallouts(page)).toHaveCount(1);
  await expect(shownCallouts(page).locator('[data-callout-heading]')).toHaveText(text);
});

Then(/^a callout says (.+)$/, async ({ page }, text: string) => {
  await expect(shownCallouts(page)).toHaveCount(1);
  await expect(shownCallouts(page).locator('[data-callout-summary]')).toHaveText(text);
});

Then(/^it says (\d+ of \d+ [\w ]+ dots are placed and \d+ remains?)$/, async ({ page }, text: string) => {
  await expect(shownCallouts(page).locator('[data-callout-summary]')).toHaveText(text);
});

Then(/^it names ([A-Z].+)$/, async ({ page }, names: string) => {
  await expect(shownCallouts(page).locator('[data-callout-traits]')).toHaveText(`Dots can go on ${names}.`);
});

Then(new RegExp(`^I am told the ${GROUP} group has no dots left$`), async ({ page }, group: string) => {
  await expect(await groupNotice(page, group)).toContainText(`${group} has no dots remaining`);
});

Then(/^it stays at (\d+)$/, async ({ page, memory }, value: string) => {
  await expectRated(await traitRating(page, ranked({ memory }).trait), Number(value));
});

Then(new RegExp(`^the ${GROUP} status region reads the new remaining count$`), async ({ page }, group: string) => {
  const remaining = await groupPoolRemaining(page, group);
  const text = ((await remaining.textContent()) ?? '').trim();
  await expect(await poolStatus(page, group)).toHaveText(`${group}: ${text}`);
});

Then(new RegExp(`^the ${GROUP} status region reads "([^"]+)"$`), async ({ page }, group: string, text: string) => {
  await expect(await poolStatus(page, group)).toContainText(text);
});

Then('Appearance shows 0 as fixed, with the reason', async ({ page }) => {
  const row = await traitRating(page, 'Appearance');
  await expectRated(row, 0);
  await expect(row.locator('[data-rating-limit]')).toHaveText('Fixed for Nosferatu');
});

Then('its plus and minus controls are unavailable but focusable', async ({ page }) => {
  const row = await traitRating(page, 'Appearance');
  for (const direction of ['Increase', 'Decrease'] as const) {
    const button = stepButton(row, direction);
    await expect(button).toHaveAttribute('aria-disabled', 'true');
    await button.focus();
    await expect(button).toBeFocused();
  }
});

Then('a summary names Social as strongest and Physical as tertiary', async ({ page }) => {
  await openStep(page, 'Attributes');
  const lines = shownRanked(page).locator('[data-ranked-summary] li');
  await expect(lines).toContainText(['Strongest: Social', 'Tertiary: Physical']);
});

Then('it contains none of the words he, she, his, her, him', async ({ page }) => {
  const text = (await shownRanked(page).locator('[data-ranked-summary]').textContent()) ?? '';
  expect(text.trim()).not.toBe('');
  expect(text).not.toMatch(/\b(?:he|she|his|her|him)\b/i);
});

Then(new RegExp(`^the plus controls in ${GROUP} are unavailable$`), async ({ page }, group: string) => {
  const rows = await ratingsIn(await groupBox(page, group)).all();
  for (const row of rows) await expect(stepButton(row, 'Increase')).toHaveAttribute('aria-disabled', 'true');
});

Then('the freebie points remaining on the panel are unchanged', async ({ page, memory }) => {
  await expect(freebiePointsRemaining(page)).toHaveText(ranked({ memory }).freebies);
});
