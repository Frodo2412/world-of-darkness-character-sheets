import { expect, type Page } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import { sheetField } from './support/pages';
import { ensureOnSheet, expectRating, mark, rating, setRating } from './support/ratings';
import { ensureEditing } from './support/sheet';

/** A write-in row: its name field and its rating, which is announced with that name. */
const namedRowOf = (page: Page, label: string) => ({
  name: page.getByLabel(`${label} name`, { exact: true }),
  rating: page.getByRole('slider', { name: new RegExp(`^${label}(: |$)`) }),
});

// "<Trait> shows <n> dots" both arranges and checks: as a scenario's opening
// step there is no sheet yet, so it opens one and puts the rating there.
// Steps are matched by keyword, so it is registered as a Given and a Then.
const SHOWS_DOTS = /^((?:permanent )?[A-Z][A-Za-z-]*(?: [A-Z][A-Za-z-]*)?) shows (\d+) dots?$/;

async function showsDots(page: Page, name: string, dots: string): Promise<void> {
  const arranging = await ensureOnSheet(page);
  if (arranging) await setRating(rating(page, name), Number(dots));
  await expectRating(rating(page, name), Number(dots));
}

Given(SHOWS_DOTS, async ({ page }, name: string, dots: string) => showsDots(page, name, dots));
Then(SHOWS_DOTS, async ({ page }, name: string, dots: string) => showsDots(page, name, dots));

Given(
  /^keyboard focus is on the ([A-Z][A-Za-z-]*) rating showing (\d+) dots?$/,
  async ({ page, memory }, name: string, dots: string) => {
    await ensureOnSheet(page);
    await setRating(rating(page, name), Number(dots));
    await rating(page, name).focus();
    memory.rating = name;
  },
);

When(
  /^the player activates the (\d+)(?:st|nd|rd|th) ([A-Z][A-Za-z-]*(?: [A-Z][A-Za-z-]*)?) dot$/,
  async ({ page }, position: string, name: string) => {
    await mark(rating(page, name), Number(position)).click();
  },
);

When('the player presses the increase key twice', async ({ page }) => {
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
});

Then(
  'the rating reports its name and the value {int} to assistive technology',
  async ({ page, memory }, value: number) => {
    const control = page.getByRole('slider', { name: memory.rating, exact: true });
    await expect(control).toBeFocused();
    await expect(control).toHaveAttribute('aria-valuenow', String(value));
    await expect(control).toHaveAttribute('aria-valuemin', '0');
    await expect(control).toHaveAttribute('aria-valuemax', '10');
  },
);

When(
  'they name the blank Talent {string} and give it {int} dots',
  async ({ page }, name: string, dots: number) => {
    const row = namedRowOf(page, 'Custom talent');
    await row.name.fill(name);
    await setRating(row.rating, dots);
  },
);

Then(
  'the Talents list shows {string} with {int} dots',
  async ({ page }, name: string, dots: number) => {
    await ensureEditing(page);
    const talents = page.getByRole('group', { name: 'Talents' });
    await expect(talents.getByLabel('Custom talent name', { exact: true })).toHaveValue(name);
    await expectRating(talents.getByRole('slider', { name: `Custom talent: ${name}` }), dots);
  },
);

const ATTRIBUTES = [
  'Strength',
  'Dexterity',
  'Stamina',
  'Charisma',
  'Manipulation',
  'Appearance',
  'Perception',
  'Intelligence',
  'Wits',
];
const VIRTUES = ['Conscience/Conviction', 'Self-Control/Instinct', 'Courage'];
const ABILITY_GROUPS = ['Talents', 'Skills', 'Knowledges'];
const WRITE_IN_ROWS = 6;

When(
  /^they name the first (discipline|background) "([^"]*)" with (\d+) dots$/,
  async ({ page }, kind: string, name: string, dots: string) => {
    const row = namedRowOf(page, kind === 'discipline' ? 'Discipline 1' : 'Background 1');
    await row.name.fill(name);
    await setRating(row.rating, Number(dots));
  },
);

Then('each of the nine attributes shows 1 dot', async ({ page }) => {
  for (const name of ATTRIBUTES) await expectRating(rating(page, name), 1);
});

Then('each of the three virtues shows 1 dot', async ({ page }) => {
  for (const name of VIRTUES) await expectRating(rating(page, name), 1);
});

Then('every ability shows 0 dots', async ({ page }) => {
  for (const group of ABILITY_GROUPS) {
    const ratings = page.getByRole('group', { name: group }).getByRole('slider');
    // Ten named abilities and one custom row in each group.
    await expect(ratings).toHaveCount(11);
    for (const control of await ratings.all()) await expectRating(control, 0);
  }
});

Then(
  '{string} shows {int} dots and {string} shows {int} dots',
  async ({ page }, discipline: string, disciplineDots: number, background: string, backgroundDots: number) => {
    await ensureEditing(page);
    const first = namedRowOf(page, 'Discipline 1');
    await expect(first.name).toHaveValue(discipline);
    await expectRating(first.rating, disciplineDots);

    const second = namedRowOf(page, 'Background 1');
    await expect(second.name).toHaveValue(background);
    await expectRating(second.rating, backgroundDots);
  },
);

Then('five discipline rows and five background rows remain blank', async ({ page }) => {
  for (const kind of ['Discipline', 'Background']) {
    for (let number = 2; number <= WRITE_IN_ROWS; number += 1) {
      const row = namedRowOf(page, `${kind} ${number}`);
      await expect(row.name).toHaveValue('');
      await expectRating(row.rating, 0);
    }
    await expect(namedRowOf(page, `${kind} ${WRITE_IN_ROWS + 1}`).name).toHaveCount(0);
  }
});

Given('a new character whose Generation is {string}', async ({ page }, generation: string) => {
  await ensureOnSheet(page);
  await sheetField(page, 'Generation').fill(generation);
});

Given(
  'the player sets Dexterity to {int} and Brawl to {int} and Courage to {int}',
  async ({ page }, dexterity: number, brawl: number, courage: number) => {
    await ensureOnSheet(page);
    await setRating(rating(page, 'Dexterity'), dexterity);
    await setRating(rating(page, 'Brawl'), brawl);
    await setRating(rating(page, 'Courage'), courage);
  },
);

When(/^they activate the last ([A-Z][A-Za-z]*) dot$/, async ({ page, memory }, name: string) => {
  memory.rating = name;
  await rating(page, name).locator('.rating-mark').last().click();
});

When('the player sets every attribute to {int}', async ({ page }, dots: number) => {
  for (const name of ATTRIBUTES) await setRating(rating(page, name), dots);
});

Then('there is no dot beyond position {int}', async ({ page, memory }, max: number) => {
  await expect(rating(page, memory.rating).locator('.rating-mark')).toHaveCount(max);
});

Then('every attribute shows {int} dots and nothing is flagged', async ({ page }, dots: number) => {
  for (const name of ATTRIBUTES) await expectRating(rating(page, name), dots);
  await expect(page.locator('[aria-invalid="true"], :invalid')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

Then(
  'Dexterity shows {int} dots, Brawl {int} dots and Courage {int} dots',
  async ({ page }, dexterity: number, brawl: number, courage: number) => {
    await expectRating(rating(page, 'Dexterity'), dexterity);
    await expectRating(rating(page, 'Brawl'), brawl);
    await expectRating(rating(page, 'Courage'), courage);
  },
);
