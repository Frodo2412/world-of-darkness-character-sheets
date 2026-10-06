import { expect } from '@playwright/test';
import type { DataTable } from 'playwright-bdd';
import { Given, Then, When } from './fixtures';
import { buildWith, saveBuilds } from './support/builder';
import {
  chronicleBreakdown,
  clearFiltersButton,
  entryNamed,
  noMatchState,
  expectSelectedTab,
  expectStoredEntriesListed,
  expectTabs,
  openRoster,
  rosterEntries,
  searchField,
  selectedTab,
  summaryCounts,
  tab,
  tabAccessibleName,
  tabPanel,
  tabStrip,
  tabText,
  tabs,
  unreadableEntries,
} from './support/pages';
import {
  characterWith,
  inChronicles,
  saveCharacters,
  saveLibraryInOrder,
  saveFromAnotherPage,
  saveInOrder,
  type LibraryRow,
} from './support/seed';

/** The texts a step lists in double quotes: `"A", "B"` is A and B. */
const quotedTexts = (list: string): string[] => [...list.matchAll(/"([^"]*)"/g)].map((match) => match[1]);

/** A step's chronicles: each is quoted, or `none` for an entry with no chronicle. */
const chroniclesOf = (list: string): string[] =>
  [...list.matchAll(/"([^"]*)"|none/g)].map((match) => match[1] ?? '');

// Given

Given('these characters and builds, created in this order', async ({ page, memory }, table: DataTable) => {
  await saveLibraryInOrder(page, memory, table.hashes() as unknown as LibraryRow[]);
});

Given('saved characters {string} and {string} with no chronicle', async ({ page, memory }, first: string, second: string) => {
  await saveInOrder(page, memory, [{ name: first }, { name: second }]);
});

Given('saved characters in these chronicles', async ({ page, memory }, table: DataTable) => {
  await saveInOrder(
    page,
    memory,
    table.hashes().map(({ name, chronicle }) => ({ name, chronicle })),
  );
});

Given(
  'saved characters {string} and {string} in the chronicle {string}',
  async ({ page, memory }, first: string, second: string, chronicle: string) => {
    await saveInOrder(page, memory, [
      { name: first, chronicle },
      { name: second, chronicle },
    ]);
  },
);

Given(/^saved characters, oldest first, in the chronicles (.+)$/, async ({ page, memory }, spellings: string) => {
  await saveInOrder(page, memory, inChronicles(quotedTexts(spellings)));
});

Given(/^saved characters whose chronicles are (.+)$/, async ({ page, memory }, chronicles: string) => {
  await saveInOrder(page, memory, inChronicles(chroniclesOf(chronicles)));
});

Given(
  'saved characters {string} in {string} and {string} in {string}',
  async ({ page, memory }, first: string, firstChronicle: string, second: string, secondChronicle: string) => {
    await saveInOrder(page, memory, [
      { name: first, chronicle: firstChronicle },
      { name: second, chronicle: secondChronicle },
    ]);
  },
);

Given('a saved character named {string} with no chronicle', async ({ page }, name: string) => {
  await saveCharacters(page, [characterWith({ name })]);
});

Given(
  'a build in progress named {string} in the chronicle {string}',
  async ({ page }, name: string, chronicle: string) => {
    await saveBuilds(page, [buildWith({ concept: { name, chronicle } })]);
  },
);

Given('the player has selected the tab {string} on the roster', async ({ page }, text: string) => {
  await openRoster(page);
  await tab(page, text).click();
  await expectSelectedTab(page, text);
});

// The other page writes to the same storage, as a second window of the browser would.
Given('the chronicle of {string} is cleared from another page', async ({ page, memory }, name: string) => {
  const character = memory.saved.find((saved) => saved.header.name === name)!;
  await saveFromAnotherPage(page, [{ ...character, header: { ...character.header, chronicle: '' } }]);
});

// Focused as a player's keyboard would leave it. A tab the page does not start on is selected first
// (by a click, which also moves focus), so the key that follows is what moves the selection.
Given('the player has opened the roster and focused the tab {string}', async ({ page }, text: string) => {
  await openRoster(page);
  const wanted = tab(page, text);
  await expect(wanted).toBeVisible();
  if ((await wanted.getAttribute('aria-selected')) !== 'true') await wanted.click();
  await expectSelectedTab(page, text);
  await wanted.focus();
  await expect(wanted).toBeFocused();
});

// When

When('they select the tab {string}', async ({ page }, text: string) => {
  await tab(page, text).click();
});

// What a player does in the search field. The text is entered as keys when the keys are the point,
// and in one go when only the result is.
When('they search for {string}', async ({ page }, text: string) => {
  await searchField(page).fill(text);
});

When('they type {string}, then {string}, in the search field', async ({ page }, first: string, second: string) => {
  const field = searchField(page);
  await field.pressSequentially(first);
  await field.pressSequentially(second);
});

When('they clear the search field', async ({ page }) => {
  await searchField(page).fill('');
});

When('they press {string}', async ({ page }, key: string) => {
  await page.keyboard.press(key);
});

// Then: the tabs

Then('the only tab is {string}', async ({ page }, text: string) => {
  await expectTabs(page, [text]);
});

// Matched by the text each tab shows ("All characters · 4"); its accessible name reads "All characters, 4".
Then(/^the tabs are (.+)$/, async ({ page }, list: string) => {
  await expectTabs(page, quotedTexts(list));
});

Then('{string} is the selected tab', async ({ page }, text: string) => {
  await expectSelectedTab(page, text);
});

Then('{string} is the selected tab and has focus', async ({ page }, text: string) => {
  await expectSelectedTab(page, text);
  await expect(tab(page, text)).toBeFocused();
});

Then('the list region is named by the selected tab', async ({ page }) => {
  const panel = tabPanel(page);
  await expect(panel).toHaveCount(1);
  await expect(selectedTab(page)).toHaveCount(1);
  const selectedId = (await selectedTab(page).getAttribute('id'))!;
  const panelId = (await panel.getAttribute('id'))!;

  await expect(panel).toHaveAttribute('aria-labelledby', selectedId);
  await expect(panel).toHaveAccessibleName(tabAccessibleName(await tabText(selectedTab(page))));
  // Every tab, not just the selected one, controls that one panel.
  const all = await tabs(page).all();
  expect(all.length).toBeGreaterThan(0);
  for (const each of all) await expect(each).toHaveAttribute('aria-controls', panelId);
});

Then('focus has left the tab strip', async ({ page }) => {
  // Focus has moved on to something, and that is not a tab of the strip.
  await expect(page.locator(':focus')).toHaveCount(1);
  await expect(page.locator('body')).not.toBeFocused();
  await expect(tabStrip(page).locator(':focus')).toHaveCount(0);
});

// Then: what the roster lists

Then('the roster lists only {string}', async ({ page }, name: string) => {
  await expect(rosterEntries(page)).toHaveCount(1);
  await expect(entryNamed(page, name)).toHaveCount(1);
});

Then(
  'the roster lists {string} and one unreadable character and nothing else',
  async ({ page }, name: string) => {
    await expect(rosterEntries(page)).toHaveCount(2);
    await expect(entryNamed(page, name)).toHaveCount(1);
    await expect(unreadableEntries(page, 'character')).toHaveCount(1);
  },
);

// Then: the search

Then('the roster shows {string}', async ({ page }, text: string) => {
  await expect(noMatchState(page)).toBeVisible();
  await expect(noMatchState(page)).toContainText(text);
});

Then('the roster shows {string} and offers {string}', async ({ page }, text: string, action: string) => {
  await expect(noMatchState(page)).toContainText(text);
  await expect(clearFiltersButton(page)).toBeVisible();
  await expect(clearFiltersButton(page)).toHaveText(action);
});

Then('the roster lists no unreadable character', async ({ page }) => {
  // The list is drawn, with what the search keeps of it, before an absence says anything.
  await expect(summaryCounts(page)).toHaveText(/^Showing \d+ of \d+ characters$/);
  await expect(unreadableEntries(page, 'character')).toHaveCount(0);
});

Then('the search field is empty and has focus', async ({ page }) => {
  await expect(searchField(page)).toHaveValue('');
  await expect(searchField(page)).toBeFocused();
});

Then("the search field's accessible name is {string}", async ({ page }, name: string) => {
  await expect(searchField(page)).toBeVisible();
  await expect(searchField(page)).toHaveAccessibleName(name);
});

Then('its placeholder reads {string}', async ({ page }, text: string) => {
  await expect(searchField(page)).toHaveAttribute('placeholder', text);
});

// Then: the summary row

Then('the summary row shows no chronicle breakdown', async ({ page }) => {
  // Not drawn only means something once the row has its counts.
  await expectStoredEntriesListed(page);
  await expect(summaryCounts(page)).toHaveText('Showing 2 of 2 characters');
  await expect(chronicleBreakdown(page)).toBeHidden();
});

Then('the summary row also reads {string}', async ({ page }, text: string) => {
  await expect(chronicleBreakdown(page)).toHaveText(text);
});
