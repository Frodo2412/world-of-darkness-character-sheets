import { expect, type Page } from '@playwright/test';
import { ATTRIBUTE_GROUPS } from '../../src/domain/v20/traits';
import {
  attributesRanked,
  clan,
  creation,
  generation,
  rank,
} from '../../src/domain/v20/creation/testing/play';
import { Given, Then, When } from './fixtures';
import {
  expectRated,
  groupNotice,
  groupReadout,
  openPlayed,
  openStep,
  placeDots,
  rankGroup,
  rankSelect,
  rateTrait,
  shownStep,
  startBuild,
  traitRating,
} from './support/builder';

const RANK = '(primary|secondary|tertiary)';
const EXHAUSTED = 'More can be bought with freebie points on Finishing touches.';

const clanPanel = (page: Page) => page.locator('[data-clan-change]');

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
    const sliders = page.getByRole('group', { name: group, exact: true }).getByRole('slider');
    for (const slider of await sliders.all()) {
      memory.ratings.set((await slider.getAttribute('aria-labelledby'))!, Number(await slider.getAttribute('aria-valuenow')));
    }
  },
);

Given(
  new RegExp(`^an? (\\d+)th generation build with (\\w+) ranked ${RANK}$`),
  async ({ page }, base: string, group: string, value: string) => {
    await openPlayed(page, generation(Number(base)), rank(group.toLowerCase(), value));
  },
);

Given('a player who was just told Mental has no dots remaining', async ({ page }) => {
  await startBuild(page);
  await rankGroup(page, 'Mental', 'tertiary');
  await rateTrait(page, 'Perception', 3);
  await rateTrait(page, 'Intelligence', 2);
  const wits = await traitRating(page, 'Wits');
  await wits.locator('.rating-mark').nth(1).click();
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

Given('a build of clan {string}', async ({ page }, name: string) => {
  await openPlayed(page, clan(name));
});

Given(new RegExp(`^a build of clan "([^"]+)" with Social ranked ${RANK}$`), async ({ page }, name: string, value: string) => {
  await openPlayed(page, clan(name), rank('social', value));
});

Given(
  /^a build of clan "([^"]+)" with Social ranked primary and Appearance rated (\d+)$/,
  async ({ page }, name: string, rating: string) => {
    await openPlayed(page, clan(name), rank('social', 'primary'), creation('attribute:appearance', Number(rating)));
  },
);

Given('a build with ranked Attribute groups, an overspent group and a refusal showing', async ({ page }) => {
  await openPlayed(
    page,
    ...attributesRanked,
    creation('attribute:strength', 4),
    creation('attribute:dexterity', 4),
    creation('attribute:stamina', 2),
    rank('physical', 'tertiary'),
  );
  await openStep(page, 'Attributes');
  await (await traitRating(page, 'Charisma')).locator('.rating-mark').nth(4).click();
  await (await traitRating(page, 'Strength')).locator('.rating-mark').nth(4).click();
  await expect(await groupNotice(page, 'Physical')).toContainText('Physical has no dots remaining');
});

// When

When(/^they choose the clan "([^"]+)" and confirm$/, async ({ page }, name: string) => {
  await openStep(page, 'Concept');
  await page.getByLabel('Clan', { exact: true }).selectOption({ label: name });
  await clanPanel(page).getByRole('button', { name: `Switch to ${name}` }).click();
});

// Then

Then('every Attribute is rated 1', async ({ page }) => {
  const labels: string[] = ATTRIBUTE_GROUPS.flatMap((group) => group.traits.map((trait) => trait.label));
  for (const label of labels) await expectRated(await traitRating(page, label), 1);
});

Then('no Attribute group has a rank yet', async ({ page }) => {
  for (const group of ATTRIBUTE_GROUPS) await expect(await rankSelect(page, group.label)).toHaveValue('');
});

Then('each group says to rank it before placing dots', async ({ page }) => {
  for (const group of ATTRIBUTE_GROUPS) {
    await expect(await groupReadout(page, group.label)).toHaveText(`${group.label}: Rank this group to place dots`);
  }
});

Then(/^they are told, beside the (\w+) group, to rank the group first$/, async ({ page }, group: string) => {
  await expect(await groupNotice(page, group)).toHaveText(`Rank the ${group} group before placing dots in it.`);
});

Then(
  /^they are told, beside the (\w+) group, that \w+ has no dots remaining and more can be bought with freebie points on Finishing touches$/,
  async ({ page }, group: string) => {
    const notice = await groupNotice(page, group);
    await expect(notice).toContainText(`${group} has no dots remaining. ${EXHAUSTED}`);
    await expect(notice.getByRole('link', { name: 'Go to Finishing touches' })).toBeVisible();
  },
);

Then(/^they are told, beside the (\w+) group, that \w+ has no dots remaining$/, async ({ page }, group: string) => {
  await expect(await groupNotice(page, group)).toContainText(`${group} has no dots remaining.`);
});

Then(
  /^they are told both changes: (\w+) is now (\w+) and (\w+) is now (\w+)$/,
  async ({ page }, a: string, ra: string, b: string, rb: string) => {
    await expect(await groupNotice(page, a)).toHaveText(`${a} is now ${ra} and ${b} is now ${rb}.`);
  },
);

Then(
  /^they are told (\w+) is now (\w+) and (\w+) now has no rank, so its (\d+) dots are overspent until it is ranked$/,
  async ({ page }, a: string, ra: string, b: string, dots: string) => {
    await expect(await groupNotice(page, a)).toHaveText(
      `${a} is now ${ra} and ${b} now has no rank, so its ${dots} dots are overspent until it is ranked.`,
    );
  },
);

Then(
  /^(\w+) is reported in words as overspent by (\d+) dots, with the instruction to lower \w+ traits by \d+$/,
  async ({ page }, group: string, by: string) => {
    await expect(await groupReadout(page, group)).toHaveText(`${group}: Overspent by ${by} — lower ${group} traits by ${by}`);
  },
);

Then(/^the (\w+) ratings are unchanged$/, async ({ page, memory }, group: string) => {
  expect(memory.ratings.size).toBe(3);
  const sliders = shownStep(page).getByRole('group', { name: group, exact: true }).getByRole('slider');
  for (const slider of await sliders.all()) {
    const key = (await slider.getAttribute('aria-labelledby'))!;
    await expect(slider).toHaveAttribute('aria-valuenow', String(memory.ratings.get(key)));
  }
});

Then(/^(\w+) is no longer reported as overspent$/, async ({ page }, group: string) => {
  await expect(await groupReadout(page, group)).not.toContainText('Overspent');
});

Then(
  /^they are asked to confirm that (.+)$/,
  async ({ page }, what: string) => {
    await expect(clanPanel(page)).toBeVisible();
    await expect(clanPanel(page)).toContainText(what.replace(/ because .*/, ''));
  },
);

Then(
  /^declining keeps the clan "([^"]+)" (?:and|with) (\w+) rated (\d+)$/,
  async ({ page }, name: string, trait: string, rating: string) => {
    await clanPanel(page).getByRole('button', { name: `Keep ${name}` }).click();
    await expect(clanPanel(page)).toBeHidden();
    await expect(page.getByLabel('Clan', { exact: true }).locator('option:checked')).toHaveText(name);
    await expect(page.getByLabel('Clan', { exact: true })).toBeFocused();
    await expectRated(await traitRating(page, trait), Number(rating));
  },
);

Then(/^they are told (?:that )?(Appearance was set to 0.*|the .+ dots? (?:was|were) removed.*)$/, async ({ page }, what: string) => {
  await expect(page.locator('#concept-clan-notice')).toContainText(what);
});

Then('no confirmation was asked', async ({ page }) => {
  await expect(clanPanel(page)).toBeHidden();
});
