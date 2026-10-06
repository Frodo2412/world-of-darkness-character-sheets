import { expect, type Locator, type Page } from '@playwright/test';
import { keyFor } from '../../src/storage/characterStore';
import { Given, Then, When } from './fixtures';
import { givenSaved } from './support/seed';
import { selectedPoolCard, traitButton, traitRow } from './support/sheet';

const specialtyField = (page: Page, trait: string): Locator =>
  page.getByRole('textbox', { name: `${trait} specialty`, exact: true });

const specialtyFields = (scope: Page | Locator): Locator => scope.getByRole('textbox', { name: / specialty$/ });

const poolSpecialties = (page: Page): Locator => selectedPoolCard(page).locator('[data-show="pool.specialties"]');

/** The mark drawn after a trait's name: the stylesheet's, so read from the name's generated content. */
const specialtyMark = (page: Page, trait: string): Promise<string> =>
  traitButton(page, trait).evaluate((button) => getComputedStyle(button, '::after').content);

// Arranging

Given(
  'a saved character with Intelligence {int}, Investigation {int} and the Intelligence specialty {string}',
  async ({ page, memory }, intelligence: number, investigation: number, specialty: string) => {
    await givenSaved(page, memory, { name: 'Lucita', clan: 'Lasombra' }, (character) => {
      character.attributes.intelligence = intelligence;
      character.abilities.investigation = investigation;
      character.specialties['attributes.intelligence'] = specialty;
    });
  },
);

Given('a character that was saved before specialties existed', async ({ page, memory }) => {
  await givenSaved(page, memory, { name: 'Lucita', clan: 'Lasombra' });
  await page.evaluate((key) => {
    const record = JSON.parse(window.localStorage.getItem(key)!);
    delete record.specialties;
    window.localStorage.setItem(key, JSON.stringify(record));
  }, keyFor(memory.saved[0].id));
});

// Acting

When('they enter {string} as the specialty of {word}', async ({ page }, text: string, trait: string) => {
  await specialtyField(page, trait).fill(text);
});

// Reading

Then('{word} is marked as having a specialty', async ({ page }, trait: string) => {
  await expect(traitRow(page, trait)).toHaveClass(/\bhas-specialty\b/);
  expect(await specialtyMark(page, trait)).toContain('✧');
});

Then('{word} is not marked as having a specialty', async ({ page }, trait: string) => {
  await expect(traitRow(page, trait)).not.toHaveClass(/\bhas-specialty\b/);
  expect(await specialtyMark(page, trait)).toBe('none');
});

Then(
  'a specialty field is offered for each of the {int} attributes and {int} abilities',
  async ({ page }, attributes: number, abilities: number) => {
    const section = (name: string): Locator => page.getByRole('region', { name, exact: true });
    await expect(specialtyFields(section('Attributes'))).toHaveCount(attributes);
    await expect(specialtyFields(section('Abilities'))).toHaveCount(abilities);
  },
);

Then('no specialty field is offered for a Virtue or a Discipline', async ({ page }) => {
  for (const name of ['Virtues', 'Disciplines']) {
    await expect(specialtyFields(page.getByRole('region', { name, exact: true }))).toHaveCount(0);
  }
});

Then('no specialty field is offered', async ({ page }) => {
  await expect(traitButton(page, 'Intelligence')).toBeVisible();
  // By role, so a field present in the page but hidden from the player does not count.
  await expect(specialtyFields(page)).toHaveCount(0);
});

Then('the Selected pool card names the specialty {string}', async ({ page }, text: string) => {
  await expect(poolSpecialties(page)).toBeVisible();
  await expect(poolSpecialties(page)).toHaveText(text);
});

Then('the Selected pool card names no specialty', async ({ page }) => {
  await expect(selectedPoolCard(page).locator('[data-show="pool.total"]')).toBeVisible();
  await expect(poolSpecialties(page)).toBeHidden();
});
