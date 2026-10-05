import { expect, type Locator, type Page } from '@playwright/test';
import type { NamedRating } from '../../src/domain/v20/character';
import { DISCIPLINE_ROWS } from '../../src/domain/v20/traits';
import { Given, Then, When } from './fixtures';
import { setRating } from './support/ratings';
import { characterArranged, characterWith, saveCharacters } from './support/seed';
import { enterEditMode, openSavedSheet } from './support/sheet';

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
    memory.saved = [
      characterArranged({ name: 'Lucita', clan: 'Lasombra' }, (character) => {
        rows.forEach((row, index) => (character.disciplines[index] = row));
      }),
    ];
    await saveCharacters(page, memory.saved);
  },
);

Given('a saved character with no Discipline named', async ({ page, memory }) => {
  memory.saved = [characterWith({ name: 'Lucita', clan: 'Lasombra' })];
  await saveCharacters(page, memory.saved);
});

Given('a saved character with the Discipline {string} rated {int}', async ({ page, memory }, name: string, rated: number) => {
  memory.saved = [
    characterArranged({ name: 'Lucita', clan: 'Lasombra' }, (character) => {
      character.disciplines[0] = { name, rating: rated };
    }),
  ];
  await saveCharacters(page, memory.saved);
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
  await expect(card.getByRole('button')).toHaveCount(0);
  await expect(card.locator('[aria-expanded], details')).toHaveCount(0);
});

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
