import { expect } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import { rating, setRating } from './support/ratings';
import { characterArranged } from './support/seed';
import {
  doneButton,
  editButton,
  enterEditMode,
  markDamage,
  openSavedSheet,
  traitButton,
} from './support/sheet';

const savedCharacter = (strength: number, brawl: number) =>
  characterArranged({ name: 'Marguerite', clan: 'Toreador' }, (character) => {
    character.attributes.strength = strength;
    character.abilities.brawl = brawl;
  });

Given('a character in edit mode', async ({ page, memory }) => {
  memory.saved = [savedCharacter(2, 1)];
  await openSavedSheet(page, memory.saved[0]);
  await enterEditMode(page);
});

Given('a character in play mode with Strength and Brawl selected', async ({ page, memory }) => {
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
