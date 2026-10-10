import { expect } from '@playwright/test';
import type { DataTable } from 'playwright-bdd';
import { Given, Then } from './fixtures';
import { cellOf, saveCombatCharacter, tableRow } from './support/combat';

// The steps of the Combat scenarios. Each one that is not shared names the tab ("on the Combat
// tab"), so it never has the same words as a step of another tab.

// Arranging

Given(/^a character with (.+) on the Combat tab$/, async ({ page, memory }, words: string) => {
  await saveCombatCharacter(page, memory, words);
});

// What the tables show

Then(/^(.+) shows "([^"]+)" with "([^"]+)" on the Combat tab$/, async ({ page }, name: string, dice: string, formula: string) => {
  const row = tableRow(page, name);
  await expect(cellOf(row, 'pool')).toHaveText(dice);
  await expect(cellOf(row, 'formula')).toHaveText(formula);
});

Then('these manoeuvres show {string} and the rulebook\'s values on the Combat tab', async ({ page }, dice: string, table: DataTable) => {
  for (const values of table.hashes()) {
    const row = tableRow(page, values.Manoeuvre);
    await expect(cellOf(row, 'pool'), values.Manoeuvre).toHaveText(dice);
    await expect(cellOf(row, 'accuracy'), values.Manoeuvre).toHaveText(values.Accuracy);
    await expect(cellOf(row, 'difficulty'), values.Manoeuvre).toHaveText(values.Difficulty);
    await expect(cellOf(row, 'damage'), values.Manoeuvre).toHaveText(values['Base damage']);
    await expect(cellOf(row, 'page'), values.Manoeuvre).toHaveText(values.Page);
  }
});
