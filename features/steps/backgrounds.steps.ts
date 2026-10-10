import { expect } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import {
  backgroundCard,
  backgroundCards,
  backgroundsPanel,
  openBackgroundsCharacter,
  saveBackgroundsCharacter,
  showBackgrounds,
} from './support/backgrounds';

// The steps of the Backgrounds scenarios. Each one that is not shared names the tab ("on the
// Backgrounds tab"), so it never has the same words as a step of another tab.

// Arranging

Given(/^a character with (.+) on the Backgrounds tab$/, async ({ page, memory }, words: string) => {
  await saveBackgroundsCharacter(page, memory, words);
});

Given(/^a character in play mode with (.+) on the Backgrounds tab$/, async ({ page, memory }, words: string) => {
  await openBackgroundsCharacter(page, memory, words, 'play');
});

// Opening

When('the Backgrounds tab is chosen from the tab bar on the Backgrounds tab', async ({ page, memory }) => {
  await showBackgrounds(page, memory);
});

// What the cards show

Then(
  /^(\w+) shows (\d+) of 5 dots, the summary "([^"]*)" and the note "([^"]*)" on the Backgrounds tab$/,
  async ({ page }, name: string, dots: string, summary: string, note: string) => {
    const card = backgroundCard(page, name);
    await expect(card.getByRole('img', { name: `${name} ${dots} of 5` })).toBeVisible();
    await expect(card.getByText(summary, { exact: true })).toBeVisible();
    await expect(card.getByText(note, { exact: true })).toBeVisible();
  },
);

Then('{word} shows both people with their roles on the Backgrounds tab', async ({ page, memory }, name: string) => {
  const arranged = memory.saved[0].backgrounds.find((row) => row.name === name)?.people ?? [];
  expect(arranged).toHaveLength(2);
  const people = backgroundCard(page, name).getByRole('list', { name: 'People' }).getByRole('listitem');
  await expect(people).toHaveText(arranged.map((person) => `${person.name} ${person.role}`));
});

Then(/^(\w+) background cards are shown on the Backgrounds tab$/, async ({ page }, count: string) => {
  const counts: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
  await expect(backgroundCards(page)).toHaveCount(counts[count]);
});

Then('the Backgrounds section shows {string} on the Backgrounds tab', async ({ page }, message: string) => {
  await expect(backgroundsPanel(page).locator('[data-empty="backgrounds"]').getByText(message, { exact: true })).toBeVisible();
});
