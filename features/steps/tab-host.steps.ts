import { expect } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import { statusRegion } from './support/pages';
import { rating, setRating } from './support/ratings';
import { characterArranged } from './support/seed';
import {
  card,
  doneButton,
  editButton,
  identityName,
  markDamage,
  openSavedSheet,
  traitButton,
} from './support/sheet';
import { openSheetAt, tabPanelOf } from './support/tabs';

const savedCharacter = (strength: number, brawl: number) =>
  characterArranged({ name: 'Marguerite', clan: 'Toreador' }, (character) => {
    character.attributes.strength = strength;
    character.abilities.brawl = brawl;
  });

Given('a character in play mode with Strength and Brawl selected on the Character sheet tab', async ({ page, memory }) => {
  memory.saved = [savedCharacter(3, 2)];
  await openSavedSheet(page, memory.saved[0]);
  await traitButton(page, 'Strength').click();
  await traitButton(page, 'Brawl').click();
});

When('the player raises Strength to 4 and returns to play mode', async ({ page }) => {
  await setRating(rating(page, 'Strength'), 4);
  await doneButton(page).click();
  await expect(editButton(page)).toBeVisible();
});

When('the player marks a Hurt wound', async ({ page }) => {
  await markDamage(page, 'Hurt', 'lethal');
});

Then('the sheet shows Strength 4 and it is still 4 after a reload', async ({ page }) => {
  const shown = async (): Promise<void> => {
    await expect(rating(page, 'Strength')).toHaveAttribute('value', '4');
  };
  await shown();
  await page.reload();
  await shown();
});

Then('the Selected pool is announced with the wound subtracted', async ({ page }) => {
  await expect(page.locator('[data-live="pool"]')).toHaveText('Dice pool: Strength 3 + Brawl 2 − wound 1, 4 dice');
});

// Opening a sheet on a tab

Given("no character is saved with the address's id", async ({ page, memory }) => {
  memory.saved = [];
  await page.goto('/');
});

/** The id a scenario opens: the saved character's, or one nothing is saved under. */
const addressedId = (memory: { saved: { id: string }[] }): string => memory.saved[0]?.id ?? 'no-such-character';

When('its sheet is opened with the tab name {string}', async ({ page, memory }, tab: string) => {
  await openSheetAt(page, addressedId(memory), tab);
});

When('the sheet is opened with the tab name {string}', async ({ page, memory }, tab: string) => {
  await openSheetAt(page, addressedId(memory), tab);
});

When('the page is reloaded', async ({ page }) => {
  await page.reload();
});

When('the player goes Back and then Forward', async ({ page }) => {
  await page.goBack();
  await page.goForward();
});

// What the sheet shows

Then(
  "the character's name, the mode toggle, the save status and the resources row are shown",
  async ({ page, memory }) => {
    await expect(identityName(page)).toHaveText(memory.saved[0].header.name);
    await expect(editButton(page)).toBeVisible();
    // The application bar's status is written by the first save, so before one it is there but empty.
    await expect(page.locator('.app-bar #save-status')).toBeAttached();
    for (const name of ['Blood Pool', 'Willpower', 'Health', 'Humanity']) await expect(card(page, name)).toBeVisible();
  },
);

Then('the Attributes and Abilities cards are shown', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Attributes', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Abilities', exact: true })).toBeVisible();
});

Then('the Character sheet tab is shown', async ({ page }) => {
  await expect(editButton(page)).toBeVisible();
  await expect(tabPanelOf(page, 'sheet')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Attributes', exact: true })).toBeVisible();
});

Then('no error is shown on the Character sheet tab', async ({ page }) => {
  await expect(statusRegion(page)).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Character not found' })).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Character could not be read' })).toBeHidden();
});

Then('{string} is shown in place of the Character sheet tab', async ({ page }, text: string) => {
  await expect(page.getByRole('heading', { name: text, exact: true })).toBeVisible();
});
