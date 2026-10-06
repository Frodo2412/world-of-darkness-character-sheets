import { expect, type Locator, type Page } from '@playwright/test';
import type { NamedRating } from '../../src/domain/v20/character';
import { DISCIPLINE_ROWS } from '../../src/domain/v20/traits';
import { Given, Then, When } from './fixtures';
import { setRating } from './support/ratings';
import { characterArranged, characterWith, givenSaved, saveCharacters } from './support/seed';
import { enterEditMode, openSavedSheet } from './support/sheet';
import { escaped } from './support/text';

const disciplinesCard = (page: Page): Locator => page.getByRole('region', { name: 'Disciplines', exact: true });

/** The Disciplines the play view lists, one per line. */
const listedDisciplines = (page: Page): Locator => disciplinesCard(page).locator('.discipline-entry');

const disciplineRow = (page: Page, number: number) => ({
  name: page.getByLabel(`Discipline ${number} name`, { exact: true }),
  rating: page.getByRole('slider', { name: new RegExp(`^Discipline ${number}(: |$)`) }),
});

/** The card shows exactly these lines, in this order. */
async function expectDisciplinesListed(page: Page, lines: string[]): Promise<void> {
  await expect(listedDisciplines(page)).toHaveText(lines);
}

// Arranging

Given(
  'a saved character with the Disciplines {string} rated {int}, {string} rated {int} and {string} rated {int}, and a fourth Discipline named with only spaces',
  async ({ page, memory }, first: string, a: number, second: string, b: number, third: string, c: number) => {
    // A rating on a row with no name is not enough to list it.
    const rows: NamedRating[] = [
      { name: first, rating: a },
      { name: second, rating: b },
      { name: third, rating: c },
      { name: '   ', rating: 3 },
    ];
    await givenSaved(page, memory, { name: 'Lucita', clan: 'Lasombra' }, (character) => {
      rows.forEach((row, index) => (character.disciplines[index] = row));
    });
  },
);

Given('a saved character with no Discipline named', async ({ page, memory }) => {
  memory.saved = [characterWith({ name: 'Lucita', clan: 'Lasombra' })];
  await saveCharacters(page, memory.saved);
});

Given('a saved character with the Discipline {string} rated {int}', async ({ page, memory }, name: string, rated: number) => {
  await givenSaved(page, memory, { name: 'Lucita', clan: 'Lasombra' }, (character) => {
    character.disciplines[0] = { name, rating: rated };
  });
});

Given('the player is editing a saved character with no Discipline named', async ({ page, memory }) => {
  memory.saved = [characterWith({ name: 'Fatima', clan: 'Lasombra' })];
  await openSavedSheet(page, memory.saved[0]);
  await enterEditMode(page);
});

Given(
  'the player is editing a saved character with the Discipline {string} rated {int}',
  async ({ page, memory }, name: string, rated: number) => {
    memory.saved = [
      characterArranged({ name: 'Fatima', clan: 'Lasombra' }, (character) => {
        character.disciplines[0] = { name, rating: rated };
      }),
    ];
    await openSavedSheet(page, memory.saved[0]);
    await enterEditMode(page);
  },
);

// Acting

When('they name the first Discipline {string} with {int} dots', async ({ page }, name: string, dots: number) => {
  const row = disciplineRow(page, 1);
  await row.name.fill(name);
  await setRating(row.rating, dots);
});

When("they clear that Discipline's name", async ({ page }) => {
  await disciplineRow(page, 1).name.fill('');
});

// Reading

Then(
  'the Disciplines card lists {string}, {string} and {string} in that order',
  async ({ page }, first: string, second: string, third: string) => {
    await expectDisciplinesListed(page, [first, second, third]);
  },
);

Then(
  'the Disciplines card lists {string} and {string} and no other row',
  async ({ page }, first: string, second: string) => {
    await expectDisciplinesListed(page, [first, second]);
  },
);

Then('the Disciplines card lists {string}', async ({ page }, line: string) => {
  await expectDisciplinesListed(page, [line]);
});

Then('no other Discipline row is shown', async ({ page, memory }) => {
  const named = memory.saved[0].disciplines.filter((row) => row.name.trim() !== '');
  await expect(listedDisciplines(page)).toHaveCount(named.length);
  await expect(disciplinesCard(page).getByRole('textbox')).toHaveCount(0);
});

Then('the Disciplines card shows no power list and no expand control', async ({ page }) => {
  const card = disciplinesCard(page);
  await expect(listedDisciplines(page)).not.toHaveCount(0);
  await expect(card.locator('details, summary, [aria-expanded]')).toHaveCount(0);
  await expect(card.locator('.power')).toHaveCount(0);
});

// Powers

/** A Discipline that opens, found by the name on its line. */
const disciplineNamed = (page: Page, name: string): Locator =>
  disciplinesCard(page).locator('details').filter({ has: page.locator('summary', { hasText: new RegExp(`^${escaped(name)} \\d+$`) }) });

const powerNamed = (page: Page, name: string): Locator =>
  disciplinesCard(page).locator('.power').filter({ has: page.locator('.power-name', { hasText: new RegExp(`^${escaped(name)}$`) }) });

Given(
  'a saved character with Charisma {int}, Appearance {int}, Performance {int}, Intimidation {int}, Empathy {int} and the Disciplines {string} rated {int} and {string} rated {int}',
  async (
    { page, memory },
    charisma: number,
    appearance: number,
    performance: number,
    intimidation: number,
    empathy: number,
    first: string,
    a: number,
    second: string,
    b: number,
  ) => {
    await givenSaved(page, memory, { name: 'Lucita', clan: 'Lasombra' }, (character) => {
      Object.assign(character.attributes, { charisma, appearance });
      Object.assign(character.abilities, { performance, intimidation, empathy });
      character.disciplines[0] = { name: first, rating: a };
      character.disciplines[1] = { name: second, rating: b };
    });
  },
);

When('they open the Discipline {string}', async ({ page }, name: string) => {
  await disciplineNamed(page, name).locator('summary').click();
});

Then(
  '{string} lists the powers {string}, {string} and {string}',
  async ({ page }, discipline: string, first: string, second: string, third: string) => {
    await expect(disciplineNamed(page, discipline).locator('.power-name')).toHaveText([first, second, third]);
  },
);

Then('the power {string} shows {string} and {string}', async ({ page }, power: string, detail: string, dice: string) => {
  await expect(powerNamed(page, power).locator('.power-detail')).toHaveText(detail);
  await expect(powerNamed(page, power).locator('.power-dice')).toHaveText(dice);
  await expect(powerNamed(page, power)).toBeVisible();
});

Then('the power {string} shows {string} and no dice', async ({ page }, power: string, detail: string) => {
  await expect(powerNamed(page, power).locator('.power-detail')).toHaveText(detail);
  await expect(powerNamed(page, power).locator('.power-dice')).toHaveCount(0);
});

Then(
  'the powers of {string} are shown and the powers of {string} are not',
  async ({ page }, open: string, closed: string) => {
    await expect(disciplineNamed(page, open).locator('.power').first()).toBeVisible();
    await expect(disciplineNamed(page, closed).locator('.power').first()).toBeHidden();
  },
);

Then('the Disciplines card says {string}', async ({ page }, line: string) => {
  await expect(disciplinesCard(page).getByText(line, { exact: true })).toBeVisible();
  await expect(listedDisciplines(page)).toHaveCount(0);
});

Then('the Disciplines card offers six rows, each with a name and a rating', async ({ page }) => {
  for (let number = 1; number <= DISCIPLINE_ROWS; number += 1) {
    const row = disciplineRow(page, number);
    await expect(row.name).toBeVisible();
    await expect(row.rating).toBeVisible();
  }
  await expect(disciplinesCard(page).getByRole('textbox')).toHaveCount(DISCIPLINE_ROWS);
  await expect(disciplinesCard(page).getByRole('slider')).toHaveCount(DISCIPLINE_ROWS);
});

Then('no Discipline name field or rating control is offered', async ({ page }) => {
  const card = disciplinesCard(page);
  await expect(card).toBeVisible();
  await expect(card.getByRole('textbox')).toHaveCount(0);
  await expect(card.getByRole('slider')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: /^Discipline \d+ name$/ })).toHaveCount(0);
});

// Backgrounds

Then('there is no field for any Background', async ({ page }) => {
  await expect(page.getByLabel(/Background/)).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: /Background/ })).toHaveCount(0);
  await expect(page.getByRole('slider', { name: /Background/ })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Background/ })).toHaveCount(0);
});

// Virtues

const virtuesCard = (page: Page): Locator => page.getByRole('region', { name: 'Virtues', exact: true });

/** A virtue's row, found from the name its rating reports. */
const virtueRow = (page: Page, label: string): Locator =>
  virtuesCard(page).locator('[data-trait-key]').filter({ has: page.getByRole('img', { name: new RegExp(`^${escaped(label)} \\d+ of 5$`) }) });

Given(
  'a saved character with Conscience\\/Conviction {int}, Self-Control\\/Instinct {int} and Courage {int}',
  async ({ page, memory }, conscience: number, selfControl: number, courage: number) => {
    await givenSaved(page, memory, { name: 'Lucita', clan: 'Lasombra' }, (character) => {
      character.virtues = { conscience, selfControl, courage };
    });
  },
);

Given('a saved character with Courage {int}', async ({ page, memory }, courage: number) => {
  await givenSaved(page, memory, { name: 'Lucita', clan: 'Lasombra' }, (character) => {
    character.virtues.courage = courage;
  });
});

Then(
  'the Virtues card shows Conscience\\/Conviction {int}, Self-Control\\/Instinct {int} and Courage {int}, each out of 5 dots',
  async ({ page }, conscience: number, selfControl: number, courage: number) => {
    const expected: [string, number][] = [
      ['Conscience/Conviction', conscience],
      ['Self-Control/Instinct', selfControl],
      ['Courage', courage],
    ];
    await expect(virtuesCard(page).getByRole('img')).toHaveCount(expected.length);
    for (const [label, value] of expected) {
      const control = virtuesCard(page).getByRole('img', { name: `${label} ${value} of 5`, exact: true });
      await expect(control.locator('.rating-mark')).toHaveCount(5);
      await expect(control.locator('.rating-mark.is-filled')).toHaveCount(value);
    }
  },
);

Then('the Courage rating cannot be changed', async ({ page, memory }) => {
  const courage = memory.saved[0].virtues.courage;
  await expect(virtuesCard(page).getByRole('slider')).toHaveCount(0);
  await expect(page.getByRole('slider', { name: 'Courage', exact: true })).toHaveCount(0);
  // Pressing a dot does nothing: the rating reads as it did.
  await virtueRow(page, 'Courage').locator('.rating-mark').first().click({ force: true });
  await expect(virtuesCard(page).getByRole('img', { name: `Courage ${courage} of 5`, exact: true })).toBeVisible();
});

When('they activate {string} and set Courage to {int}', async ({ page }, name: string, value: number) => {
  await page.getByRole('button', { name, exact: true }).click();
  await setRating(page.getByRole('slider', { name: 'Courage', exact: true }), value);
});

Then('the Virtues card shows Courage {int}', async ({ page }, value: number) => {
  await expect(virtuesCard(page).getByRole('img', { name: `Courage ${value} of 5`, exact: true })).toBeVisible();
});
