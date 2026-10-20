// The Advantages screen: the Disciplines card, the Background chips with their rows, search and six-row
// limit, and the Virtues card. Screen standards are the shared steps (builder-standards.steps.ts) and are
// not restated here; the platform, key and navigation steps are the Clan and navigation steps'.

import { expect } from '@playwright/test';
import { BACKGROUND_KEYS_HELP } from '../../src/domain/v20/creation/advantageViews';
import { BACKGROUNDS, type BackgroundName } from '../../src/domain/v20/creation/rules';
import { DISCIPLINES_NEED_CLAN } from '../../src/domain/v20/creation/screens';
import { clan, completeBuild, creation, freebie, generation, play } from '../../src/domain/v20/creation/testing/play';
import { setRating } from '../../src/domain/v20/creation/updates';
import { Given, Then, When, memoryFor } from './fixtures';
import { announcements } from './support/announcements';
import { addDiscipline, backgroundChip, backgroundChipGroup, backgroundChips, backgroundHeading, backgroundLimit, backgroundResults, backgroundRow, backgroundRows, backgroundSearch, backgroundSearchHint, cardPool, disciplineNames, expectChipChosen, listedBackgroundChips, openAdvantages, pressBackgroundChip } from './support/advantages';
import { buildWith, finishOpenBuild, freebiePointsRemaining, openPlayed, openPlayedFrom } from './support/builder';
import { expectRated, groupBox, groupNotice, placeDots, rateTrait, ratingOf, requestRating, stepButton, traitRating } from './support/ranked';
import { SHEET_ADDRESS } from './support/pages';
import { openCharacterId, savedCharacter } from './support/sheet';
import { escaped } from './support/text';

const NAME = `(${BACKGROUNDS.map(escaped).join('|')})`;
const POOL_CARD = '(Disciplines|Backgrounds|Virtues)';

/** What earlier steps of a scenario did, for later steps to check against. */
interface AdvantagesMemory {
  /** The Backgrounds the last step chose, by name. */
  chosen: string[];
  /** The Background the scenario is working with. */
  background: string;
  /** What the freebie points read when the scenario arranged its build. */
  freebies: string;
}
const advantages = (world: Parameters<typeof memoryFor>[0]): AdvantagesMemory =>
  memoryFor(world, 'advantages', (): AdvantagesMemory => ({ chosen: [], background: '', freebies: '' }));

/** Five Backgrounds with a creation dot each. */
const FIVE = ['Allies', 'Contacts', 'Herd', 'Mentor', 'Resources'] as const;
const fiveHeld = FIVE.map((name) => creation(`background:${name}`, 1));

/** The names in "Contacts, Resources and Mentor". */
const names = (list: string): string[] => list.split(/, | and /);

// Given

Given('I am on the Advantages screen of a Toreador build', async ({ page }) => {
  await openPlayed(page, clan('Toreador'));
  await openAdvantages(page);
});

Given('a build with no clan on the Advantages screen', async ({ page }) => {
  await openPlayed(page);
  await openAdvantages(page);
});

Given('a Caitiff build on the Advantages screen', async ({ page }) => {
  await openPlayed(page, clan('Caitiff'));
  await openAdvantages(page);
});

Given('a build seeded with six Backgrounds each holding a dot', async ({ page }) => {
  // Five from the creation pool and the sixth bought, so the pool is not overspent.
  await openPlayed(page, clan('Toreador'), ...fiveHeld, freebie('background:Fame', 1));
  await openAdvantages(page);
});

Given('a build with five Backgrounds holding dots and a sixth chip chosen at 0 dots', async ({ page }) => {
  await openPlayed(page, clan('Toreador'), ...fiveHeld);
  await pressBackgroundChip(page, 'Fame');
});

Given(/^a build at base (\d+)th generation$/, async ({ page }, base: string) => {
  await openPlayed(page, clan('Toreador'), generation(Number(base)));
  await openAdvantages(page);
});

Given('a Background row at 0 dots', async ({ page, memory }) => {
  advantages({ memory }).background = 'Resources';
  await pressBackgroundChip(page, 'Resources');
  await expect(backgroundRow(page, 'Resources')).toBeVisible();
  await expectRated(await traitRating(page, 'Resources'), 0);
});

Given(new RegExp(`^${NAME} holds (\\d+) dots$`), async ({ page, memory }, name: string, dots: string) => {
  advantages({ memory }).background = name;
  await openPlayed(page, clan('Toreador'), creation(`background:${name as BackgroundName}`, Number(dots)));
  await openAdvantages(page);
});

Given(new RegExp(`^the ${NAME} chip is chosen at 0 dots$`), async ({ page, memory }, name: string) => {
  advantages({ memory }).background = name;
  await pressBackgroundChip(page, name);
});

Given(
  new RegExp(`^${NAME} holds (\\d+) dots and the ${NAME} chip is chosen at 0 dots$`),
  async ({ page, memory }, held: string, dots: string, chosen: string) => {
    advantages({ memory }).background = held;
    await openPlayed(page, clan('Toreador'), creation(`background:${held as BackgroundName}`, Number(dots)));
    await pressBackgroundChip(page, chosen);
  },
);

Given('the Backgrounds pool is fully placed', async ({ page, memory }) => {
  await openPlayed(page, clan('Toreador'), creation('background:Resources', 3), creation('background:Herd', 2));
  await openAdvantages(page);
  advantages({ memory }).freebies = (await freebiePointsRemaining(page).textContent()) ?? '';
});

// When

When(/^I add (\w+) and give it (\d+) creation dots$/, async ({ page }, name: string, dots: string) => {
  await addDiscipline(page, name);
  await rateTrait(page, name, Number(dots));
});

When(/^I choose the Background chips (.+)$/, async ({ page, memory }, list: string) => {
  advantages({ memory }).chosen = names(list);
  for (const name of names(list)) await pressBackgroundChip(page, name);
});

When(new RegExp(`^I choose the Background chip ${NAME}$`), async ({ page, memory }, name: string) => {
  advantages({ memory }).chosen = [name];
  await pressBackgroundChip(page, name);
});

When(new RegExp(`^I choose the ${NAME} chip again$`), async ({ page }, name: string) => {
  await pressBackgroundChip(page, name);
});

When('I give Rituals 1 creation dot and finish a finishable build', async ({ page }) => {
  // A finishable build whose Backgrounds pool has one dot to place, which Rituals then takes.
  const finishable = play(completeBuild('Toreador'), (build) => setRating(build, 'background:Resources', 0, 'creation'));
  await openPlayedFrom(page, { ...finishable, id: buildWith().id });
  await openAdvantages(page);
  await rateTrait(page, 'Rituals', 1);
  await finishOpenBuild(page);
});

When('I press a Background chip that is unavailable', async ({ page, memory }) => {
  const chip = backgroundChips(page).and(page.locator('[aria-disabled="true"]')).first();
  advantages({ memory }).background = (await chip.getAttribute('data-bg-chip'))!;
  await chip.click({ force: true });
});

When('I raise the Generation Background as far as it goes', async ({ page }) => {
  await requestRating(await traitRating(page, 'Generation'), 6);
});

When('I search the Backgrounds for {string}', async ({ page }, query: string) => {
  await openAdvantages(page);
  await backgroundSearch(page).fill(query);
});

When('I remove it', async ({ page, memory }) => {
  await backgroundRow(page, advantages({ memory }).background).getByRole('button', { name: /^Remove / }).click();
});

When(/^(\d) of the 7 Virtue dots are placed$/, async ({ page }, placed: string) => {
  await placeDots(page, 'Virtues', Number(placed), 5);
});

When('I press a plus on Backgrounds', async ({ page }) => {
  const [row] = await backgroundRows(page).all();
  await stepButton(row.locator('.rating-stepper'), 'Increase').click({ force: true });
});

// Then

Then(/^(.+) are listed and the Disciplines pool reads "([^"]+)"$/, async ({ page }, list: string, pool: string) => {
  expect(await disciplineNames(page)).toEqual(names(list));
  await expect(await cardPool(page, 'Disciplines')).toContainText(pool);
});

Then('the reason reads {string}', async ({ page }, reason: string) => {
  expect(reason).toBe(DISCIPLINES_NEED_CLAN);
  const card = await groupBox(page, 'Disciplines');
  await expect(card.locator('[data-needs-clan-text]')).toHaveText(reason);
});

Then('a button {string} is offered', async ({ page }, label: string) => {
  const button = (await groupBox(page, 'Disciplines')).getByRole('button', { name: label });
  await expect(button).toBeVisible();
  await expect(button).toHaveText(label);
});

Then('no Discipline row is listed', async ({ page }) => {
  expect(await disciplineNames(page)).toEqual([]);
});

Then(/^(\w+) holds (\d+) dots and the Discipline pool reads "([^"]+)"$/, async ({ page }, name: string, dots: string, pool: string) => {
  await expectRated(await traitRating(page, name), Number(dots));
  await expect(await cardPool(page, 'Disciplines')).toContainText(pool);
});

Then('each chosen Background has a rating row', async ({ page, memory }) => {
  const { chosen } = advantages({ memory });
  expect(chosen.length).toBeGreaterThan(0);
  await expect(backgroundRows(page)).toHaveCount(chosen.length);
  for (const name of chosen) {
    await expect(backgroundRow(page, name)).toBeVisible();
    await expect(stepButton(backgroundRow(page, name).locator('.rating-stepper'), 'Increase')).toBeVisible();
  }
});

Then(new RegExp(`^the ${POOL_CARD} pool reads "([^"]+)"$`), async ({ page }, card: 'Disciplines' | 'Backgrounds' | 'Virtues', text: string) => {
  await expect(await cardPool(page, card)).toContainText(text);
});

Then(new RegExp(`^the ${NAME} chip reads "Selected" and is pressed$`), async ({ page }, name: string) => {
  await expectChipChosen(page, name, true);
});

Then('the other Background chips are not selected', async ({ page, memory }) => {
  for (const chip of await backgroundChips(page).all()) {
    const name = (await chip.getAttribute('data-bg-chip'))!;
    if (!advantages({ memory }).chosen.includes(name)) await expectChipChosen(page, name, false);
  }
});

Then('the Background chips are described as {string}', async ({ page }, keys: string) => {
  expect(keys).toBe(BACKGROUND_KEYS_HELP);
  await expect(backgroundChipGroup(page)).toHaveAccessibleDescription(keys);
});

Then('the chips for Black Hand Membership and Rituals read {string}', async ({ page }, label: string) => {
  for (const chip of await backgroundChips(page).all()) {
    const name = (await chip.getAttribute('data-bg-chip'))!;
    const sabbat = name === 'Black Hand Membership' || name === 'Rituals';
    await expect(chip.locator('[data-bg-chip-name]')).toHaveText(sabbat ? `${name} ${label}` : name);
  }
});

Then('the finished character\'s row is named {string}', async ({ page }, name: string) => {
  await expect(page).toHaveURL(SHEET_ADDRESS);
  const { backgrounds } = await savedCharacter(page, openCharacterId(page));
  expect(backgrounds.map((row) => row.name).filter((row) => row !== '')).toContain(name);
  expect(backgrounds.some((row) => row.name.includes('Sabbat'))).toBe(false);
});

Then('the other Background chips are unavailable', async ({ page }) => {
  for (const chip of await backgroundChips(page).all()) {
    const chosen = (await chip.getAttribute('aria-pressed')) === 'true';
    if (chosen) await expect(chip).not.toHaveAttribute('aria-disabled', 'true');
    else await expect(chip).toHaveAttribute('aria-disabled', 'true');
  }
});

Then('the other Background chips are unavailable with the reason {string}', async ({ page }, reason: string) => {
  await expect(backgroundLimit(page)).toBeVisible();
  await expect(backgroundLimit(page)).toHaveText(reason);
  for (const chip of await backgroundChips(page).all()) {
    if ((await chip.getAttribute('aria-pressed')) === 'true') continue;
    await expect(chip).toHaveAttribute('aria-disabled', 'true');
    await expect(chip).toHaveAccessibleDescription(new RegExp(escaped(reason)));
  }
});

Then('the reason {string} is announced', async ({ page }, reason: string) => {
  await expect.poll(() => announcements(page)).toContain(reason);
});

Then('the chip is still unavailable and still focused', async ({ page, memory }) => {
  const chip = backgroundChip(page, advantages({ memory }).background);
  await expect(chip).toHaveAttribute('aria-disabled', 'true');
  await expect(chip).toHaveAttribute('aria-pressed', 'false');
  await expect(chip).toBeFocused();
});

Then('it cannot go above {int} dots', async ({ page }, max: number) => {
  const row = await traitRating(page, 'Generation');
  await expectRated(row, max);
  await expect(stepButton(row, 'Increase')).toHaveAttribute('aria-disabled', 'true');
});

Then('I am told why', async ({ page }) => {
  await expect(await groupNotice(page, 'Backgrounds')).toContainText('The effective generation cannot be better than 4th.');
  await expect(backgroundRow(page, 'Generation')).toContainText('Maximum 2, 4th generation is the best');
});

Then(/^only (.+) are shown$/, async ({ page }, list: string) => {
  const shown = await listedBackgroundChips(page).evaluateAll((chips) => chips.map((chip) => chip.getAttribute('data-bg-chip')));
  expect(shown).toEqual(names(list));
});

Then('the Backgrounds count heading reads {string}', async ({ page }, heading: string) => {
  await expect(backgroundHeading(page)).toHaveText(heading);
});

Then('the Backgrounds result count {string} is announced', async ({ page }, text: string) => {
  await expect(backgroundResults(page)).toHaveAttribute('role', 'status');
  await expect(backgroundResults(page)).toHaveText(text);
  await expect.poll(() => announcements(page)).toContain(text);
});

Then('none are shown and I am told nothing matches and it is announced', async ({ page }) => {
  await expect(listedBackgroundChips(page)).toHaveCount(0);
  await expect(backgroundResults(page)).toContainText('No Background matches');
  const told = (await backgroundResults(page).textContent())!.trim();
  await expect.poll(() => announcements(page)).toContain(told);
});

Then('focus is in the Backgrounds search field', async ({ page }) => {
  await expect(backgroundSearch(page)).toBeFocused();
});

Then('the Backgrounds search hint reads {string}', async ({ page }, hint: string) => {
  await expect(backgroundSearchHint(page)).toHaveText(hint);
});

Then('its chip is no longer selected', async ({ page, memory }) => {
  const { background } = advantages({ memory });
  await expectChipChosen(page, background, false);
  await expect(backgroundRow(page, background)).toHaveCount(0);
});

Then('focus is on its chip', async ({ page, memory }) => {
  await expect(backgroundChip(page, advantages({ memory }).background)).toBeFocused();
});

Then(new RegExp(`^I am told to lower ${NAME} to 0 first$`), async ({ page }, name: string) => {
  await expect(await groupNotice(page, 'Backgrounds')).toHaveText(`Lower ${name} to 0 first.`);
});

Then(new RegExp(`^${NAME} still holds (\\d+) dots$`), async ({ page }, name: string, dots: string) => {
  await expectRated(await traitRating(page, name), Number(dots));
});

Then(new RegExp(`^${NAME} is not chosen$`), async ({ page }, name: string) => {
  await openAdvantages(page);
  await expectChipChosen(page, name, false);
  await expect(backgroundRow(page, name)).toHaveCount(0);
});

Then('each Virtue shows at least one dot and the pool reads {string}', async ({ page }, pool: string) => {
  for (const virtue of ['Conscience', 'Self-Control', 'Courage']) {
    expect(await ratingOf(await traitRating(page, virtue))).toBeGreaterThanOrEqual(1);
  }
  await expect(await cardPool(page, 'Virtues')).toContainText(pool);
});

Then(/^the Virtues callout says (\d+ of \d+ additional Virtue dots are placed and \d+ remains?)$/, async ({ page }, text: string) => {
  const callout = (await groupBox(page, 'Virtues')).locator('[data-callout]:not([hidden])');
  await expect(callout).toContainText(text);
});

Then('a line says Humanity and Willpower are derived from the Virtues', async ({ page }) => {
  await expect((await groupBox(page, 'Virtues')).locator('[data-adv-derivation]')).toHaveText(
    'Humanity and Willpower are derived from the Virtues.',
  );
});

Then('the plus controls on Backgrounds are unavailable', async ({ page }) => {
  const rows = await backgroundRows(page).all();
  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) await expect(stepButton(row.locator('.rating-stepper'), 'Increase')).toHaveAttribute('aria-disabled', 'true');
});

Then('no freebie point was spent', async ({ page, memory }) => {
  await expect(freebiePointsRemaining(page)).toHaveText(advantages({ memory }).freebies);
});
