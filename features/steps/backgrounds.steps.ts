import { expect } from '@playwright/test';
import type { V20Character } from '../../src/domain/v20/character';
import type { Haven } from '../../src/domain/v20/dossier/types';
import { Given, Then, When } from './fixtures';
import {
  backgroundCard,
  backgroundCards,
  cardsOf,
  emptyOf,
  entryCard,
  openBackgroundsCharacter,
  saveBackgroundsCharacter,
  sectionNamed,
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

Then(/^the (.+) section shows "([^"]+)" on the Backgrounds tab$/, async ({ page }, section: string, message: string) => {
  await expect(emptyOf(page, section).getByText(message, { exact: true })).toBeVisible();
});

// Havens

/** The haven the scenario arranged, by name. */
const havenArranged = (memory: { saved: V20Character[] }, name: string): Haven =>
  memory.saved[0].havens.find((haven) => haven.name === name)!;

Then(
  /^"([^"]+)" shows its kind "([^"]+)", description, location, access and security on the Backgrounds tab$/,
  async ({ page, memory }, name: string, kind: string) => {
    const card = entryCard(page, 'Havens', name);
    await expect(card.getByText(kind, { exact: true })).toBeVisible();
    const haven = havenArranged(memory, name);
    for (const [label, value] of [
      ['Description', haven.description],
      ['Location', haven.location],
      ['Access', haven.access],
      ['Security', haven.security],
    ]) {
      expect(value, `the scenario gave ${name} no ${label.toLowerCase()}`).not.toBe('');
      await expect(card.locator('.backgrounds-detail').filter({ has: page.getByText(label, { exact: true }) }).locator('dd')).toHaveText(value);
    }
  },
);

Then(/^"([^"]+)" shows its kind "([^"]+)" on the Backgrounds tab$/, async ({ page }, name: string, kind: string) => {
  await expect(entryCard(page, 'Havens', name).getByText(kind, { exact: true })).toBeVisible();
});

// Merits and Flaws

Then(/^the (Merits|Flaws) heading reads "([^"]+)" on the Backgrounds tab$/, async ({ page }, section: string, text: string) => {
  await expect(sectionNamed(page, section).locator('.dossier-heading-count')).toHaveText(text);
});

Then(
  /^the merits show "([^"]+)" and "([^"]+)" and each entry shows its category on the Backgrounds tab$/,
  async ({ page, memory }, first: string, second: string) => {
    const cards = cardsOf(page, 'Merits');
    await expect(cards).toHaveCount(2);
    for (const [place, points] of [first, second].entries()) {
      await expect(cards.nth(place).getByText(points, { exact: true })).toBeVisible();
      await expect(cards.nth(place).getByText(memory.saved[0].merits[place].category, { exact: true })).toBeVisible();
    }
  },
);
