import { expect, type Page } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import { sheetField } from './support/pages';
import { ensureOnSheet, expectRating, mark, rating, setRating } from './support/ratings';
import { ensureEditing } from './support/sheet';

const TRACKER = /((?:temporary )?Willpower|Blood Pool)/.source;

Given(
  new RegExp(`^(?:the )?${TRACKER} shows (\\d+) boxes marked$`),
  async ({ page, memory }, name: string, marked: string) => {
    const arranging = await ensureOnSheet(page);
    if (arranging) await setRating(rating(page, name), Number(marked));
    await expectRating(rating(page, name), Number(marked));
    memory.rating = name;
  },
);

When(
  new RegExp(`^the player activates the (\\d+)(?:st|nd|rd|th) ${TRACKER} box( twice)?$`),
  async ({ page, memory }, position: string, name: string, twice: string | undefined) => {
    memory.rating = name;
    await mark(rating(page, name), Number(position)).click();
    if (twice) await mark(rating(page, name), Number(position)).click();
  },
);

When(
  /^the player activates the (\d+)(?:st|nd|rd|th) box again$/,
  async ({ page, memory }, position: string) => {
    await mark(rating(page, memory.rating), Number(position)).click();
  },
);

When(
  'the player enters {string} as Blood Per Turn and reloads the sheet',
  async ({ page }, text: string) => {
    await ensureOnSheet(page);
    await sheetField(page, 'Blood Per Turn').fill(text);
    await page.reload();
  },
);

Then('{int} boxes are marked', async ({ page, memory }, marked: number) => {
  await expectRating(rating(page, memory.rating), marked);
});

Then(
  '{int} temporary boxes are marked and permanent Willpower still shows {int} dots',
  async ({ page }, marked: number, dots: number) => {
    await expectRating(rating(page, 'temporary Willpower'), marked);
    await expectRating(rating(page, 'permanent Willpower'), dots);
  },
);

Then(
  /^(\d+) boxes are marked and there is no (\d+)(?:st|nd|rd|th) box$/,
  async ({ page, memory }, marked: string, beyond: string) => {
    const tracker = rating(page, memory.rating);
    await expectRating(tracker, Number(marked));
    await expect(tracker.locator('.rating-mark')).toHaveCount(Number(beyond) - 1);
  },
);

Then('Blood Per Turn shows {string}', async ({ page }, text: string) => {
  await ensureEditing(page);
  await expect(sheetField(page, 'Blood Per Turn')).toHaveValue(text);
});

const HEALTH_LEVELS = ['Bruised', 'Hurt', 'Injured', 'Wounded', 'Mauled', 'Crippled', 'Incapacitated'];
const DAMAGE_ORDER = ['empty', 'bashing', 'lethal', 'aggravated'];
const DAMAGE_GLYPHS: Record<string, string> = { empty: '', bashing: '/', lethal: 'X', aggravated: '*' };

/** A health box, found by the name it reports: "<level>, <damage>". */
const healthBox = (page: Page, level: string) =>
  page.getByRole('button', { name: new RegExp(`^${level}, `) });

async function expectDamage(page: Page, level: string, damage: string): Promise<void> {
  await expect(page.getByRole('button', { name: `${level}, ${damage}`, exact: true })).toBeVisible();
  // The glyph, not only the announced name: sighted players read the box.
  await expect(healthBox(page, level)).toHaveText(DAMAGE_GLYPHS[damage]);
}

async function markDamage(page: Page, level: string, damage: string): Promise<void> {
  for (let step = 0; step < DAMAGE_ORDER.indexOf(damage); step += 1) {
    await healthBox(page, level).click();
  }
  await expectDamage(page, level, damage);
}

Given(/^the ([A-Z][a-z]+) box is empty$/, async ({ page, memory }, level: string) => {
  await ensureOnSheet(page);
  await expectDamage(page, level, 'empty');
  memory.healthLevel = level;
});

Given('every health box is empty', async ({ page }) => {
  await ensureOnSheet(page);
  for (const level of HEALTH_LEVELS) await expectDamage(page, level, 'empty');
});

Given(
  /^the ([A-Z][a-z]+) box shows (bashing|lethal|aggravated) damage$/,
  async ({ page }, level: string, damage: string) => {
    await ensureOnSheet(page);
    await markDamage(page, level, damage);
  },
);

When(/^the player activates it(?: again)?$/, async ({ page, memory }) => {
  await healthBox(page, memory.healthLevel).click();
});

When(/^the player activates the ([A-Z][a-z]+) box twice$/, async ({ page }, level: string) => {
  await healthBox(page, level).click();
  await healthBox(page, level).click();
});

Then(
  'the health track shows Bruised, Hurt -1, Injured -1, Wounded -2, Mauled -2, Crippled -5 and Incapacitated in that order',
  async ({ page }) => {
    const levels = page.getByRole('region', { name: 'Health' }).locator('.health-level');
    await expect(levels).toHaveText([
      /^\s*Bruised\s*$/,
      /^\s*Hurt\s*-1\s*$/,
      /^\s*Injured\s*-1\s*$/,
      /^\s*Wounded\s*-2\s*$/,
      /^\s*Mauled\s*-2\s*$/,
      /^\s*Crippled\s*-5\s*$/,
      /^\s*Incapacitated\s*$/,
    ]);
    await expect(page.getByRole('region', { name: 'Health' }).getByRole('button')).toHaveCount(7);
  },
);

Then(/^it shows (bashing|lethal|aggravated) damage$/, async ({ page, memory }, damage: string) => {
  await expectDamage(page, memory.healthLevel, damage);
});

Then('it is empty', async ({ page, memory }) => {
  await expectDamage(page, memory.healthLevel, 'empty');
});

Then(
  /^([A-Z][a-z]+) shows (bashing|lethal|aggravated) damage and every other box is empty$/,
  async ({ page }, level: string, damage: string) => {
    await expectDamage(page, level, damage);
    for (const other of HEALTH_LEVELS.filter((name) => name !== level)) {
      await expectDamage(page, other, 'empty');
    }
  },
);

Then('assistive technology reports {string}', async ({ page }, name: string) => {
  await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
});

const FREE_TEXT = new Map([
  ['Weakness', 'Casts no reflection'],
  ['Experience', '12 (3 unspent)'],
  ['Notes', 'Sire unknown.\nOwes a boon to the Prince.\n  Haven: the old cannery'],
]);

When(
  'the player enters a Weakness, an Experience value and three lines of notes',
  async ({ page, memory }) => {
    await ensureOnSheet(page);
    for (const [label, text] of FREE_TEXT) {
      await sheetField(page, label).fill(text);
      memory.entered.set(label, text);
    }
  },
);

Given(
  'the player marks {int} temporary Willpower, {int} Blood Pool and aggravated damage on Hurt',
  async ({ page }, willpower: number, blood: number) => {
    await ensureOnSheet(page);
    await setRating(rating(page, 'temporary Willpower'), willpower);
    await setRating(rating(page, 'Blood Pool'), blood);
    await markDamage(page, 'Hurt', 'aggravated');
  },
);

Then(
  'all three show exactly what was entered, including the line breaks',
  async ({ page, memory }) => {
    await ensureEditing(page);
    expect(memory.entered.size).toBe(3);
    for (const [label, text] of memory.entered) {
      await expect(sheetField(page, label)).toHaveValue(text);
    }
  },
);

Then('the same marks are shown', async ({ page }) => {
  await expectRating(rating(page, 'temporary Willpower'), 4);
  await expectRating(rating(page, 'Blood Pool'), 12);
  await expectDamage(page, 'Hurt', 'aggravated');
});

Then('they see the reminder {string}', async ({ page }, reminder: string) => {
  await expect(page.getByText(reminder, { exact: true })).toBeVisible();
});

Then('no entry on the sheet is restricted by it', async ({ page }) => {
  // Nothing on the sheet carries a constraint a browser would enforce...
  await expect(
    page.locator(
      'main :is(input, textarea):is([required], [pattern], [maxlength], [min], [max], [disabled], [readonly])',
    ),
  ).toHaveCount(0);
  // ...and a value far beyond the reminder's budgets is taken as entered.
  for (const name of ['Strength', 'Dexterity', 'Stamina']) {
    await setRating(rating(page, name), 10);
  }
  await expect(page.locator('[aria-invalid="true"], :invalid')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
});
