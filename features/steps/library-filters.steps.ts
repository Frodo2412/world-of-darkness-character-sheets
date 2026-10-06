import { expect, type Page } from '@playwright/test';
import type { DataTable } from 'playwright-bdd';
import { Given, Then, When } from './fixtures';
import { ANNOUNCEMENT_WINDOW_MS, waitOnPageClock, writtenTexts } from './support/announcements';
import { buildWith, saveBuilds } from './support/builder';
import {
  browsingControls,
  chronicleBreakdown,
  clanFilter,
  clearFiltersButton,
  entryNamed,
  noMatchState,
  expectSelectedTab,
  expectStoredEntriesListed,
  expectTabs,
  liveRegion,
  openRoster,
  rosterButton,
  rosterEntries,
  searchField,
  selectedTab,
  shortcutHint,
  shownStatusTexts,
  statusFilter,
  statusOption,
  statusOptions,
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

/** What each platform name a scenario gives is called by `navigator.userAgentData`, which names platforms differently. */
const BRAND_PLATFORM: Record<string, string> = { MacIntel: 'macOS', Win32: 'Windows' };

/** The keys the page tells assistive technology about, for the hint a player is shown. */
const KEY_SHORTCUT_OF_HINT: Record<string, string> = { '⌘ K': 'Meta+K', 'Ctrl K': 'Control+K' };

/** Waits until more has been announced than `before` writes: the player's pause, as the page hears it. */
const untilAnnounced = (page: Page, before: number): Promise<void> =>
  expect.poll(async () => (await writtenTexts(page)).length).toBeGreaterThan(before);

/** Waits for what the page announces to settle, then reads every announcement made so far. */
async function announcedAfterPause(page: Page): Promise<string[]> {
  await waitOnPageClock(page, ANNOUNCEMENT_WINDOW_MS);
  return writtenTexts(page);
}

// Given

// Both places a page can ask are answered before it loads, so the machine the test runs on cannot decide the outcome.
Given('the browser reports the platform {string}', async ({ page }, platform: string) => {
  const brand = BRAND_PLATFORM[platform];
  if (brand === undefined) throw new Error(`no brand platform is known for "${platform}"`);
  await page.addInitScript(
    ({ legacy, branded }) => {
      Object.defineProperty(navigator, 'platform', { get: () => legacy, configurable: true });
      Object.defineProperty(navigator, 'userAgentData', {
        get: () => ({ platform: branded, brands: [], mobile: false }),
        configurable: true,
      });
    },
    { legacy: platform, branded: brand },
  );
});

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
// An empty search types nothing: the field starts empty, and that is what is checked once the page has drawn it.
When('they search for {string}', async ({ page }, text: string) => {
  if (text === '') await expect(searchField(page)).toHaveValue('');
  else await searchField(page).fill(text);
});

When('they type {string}, then {string}, in the search field', async ({ page }, first: string, second: string) => {
  const field = searchField(page);
  await field.pressSequentially(first);
  await field.pressSequentially(second);
});

// A key every 100ms, as a typist's pace: well inside the 400ms the page waits for, so a page that said
// something at each key would be caught.
When('they type {string} in the search field', async ({ page }, text: string) => {
  await searchField(page).pressSequentially(text, { delay: 100 });
});

// The pause is waited for as the player's assistive technology would meet it: until the page has said something.
When('they search for {string}, pause, and then choose {string}', async ({ page }, text: string, action: string) => {
  const before = (await writtenTexts(page)).length;
  await searchField(page).fill(text);
  await untilAnnounced(page, before);
  await rosterButton(page, action).click();
});

When('they search for {string}, pause, and then search for {string}', async ({ page }, first: string, second: string) => {
  const before = (await writtenTexts(page)).length;
  await searchField(page).fill(first);
  await untilAnnounced(page, before);
  await searchField(page).fill(second);
});

When('they clear the search field', async ({ page }) => {
  await searchField(page).fill('');
});

// The select is focused first, as a player reaches it, so that choosing from it must leave focus where it is.
// Choosing "All clans" chooses the default again; the select is as happy with that as with any other option.
When('they filter by the clan {string}', async ({ page }, clan: string) => {
  await clanFilter(page).focus();
  await clanFilter(page).selectOption({ label: clan });
});

// Nothing is done; the library is drawn first so that what follows looks at the list as it starts.
When('they change nothing', async ({ page }) => {
  await expectStoredEntriesListed(page);
});

When('they focus the selected status', async ({ page }) => {
  const selected = statusFilter(page).getByRole('radio', { checked: true });
  await selected.focus();
  await expect(selected).toBeFocused();
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

// Then: the clan and status filters

// The guard proves `browsingControls` finds these same controls: the roster hides every one of them when it has nothing to browse.
Then(/^the clan filter offers (.+) in that order$/, async ({ page }, list: string) => {
  await expect(clanFilter(page)).toBeVisible();
  await expect.poll(() => clanFilter(page).locator('option').allTextContents()).toEqual(quotedTexts(list));
  await expect(browsingControls(page).and(clanFilter(page))).toHaveCount(1);
  await expect(browsingControls(page).and(statusFilter(page))).toHaveCount(1);
  await expect(browsingControls(page).and(statusOptions(page))).toHaveCount(2);
});

Then('{string} is chosen', async ({ page }, text: string) => {
  await expect(clanFilter(page).locator('option:checked')).toHaveText(text);
});

// Matched by what each option shows ("All · 4"); its accessible name reads "All, 4".
Then('the status filter reads {string} and {string}', async ({ page }, first: string, second: string) => {
  await expect.poll(() => shownStatusTexts(page)).toEqual([first, second]);
  for (const text of [first, second]) {
    await expect(statusOption(page, text.slice(0, text.lastIndexOf(' · ')))).toHaveAccessibleName(tabAccessibleName(text));
  }
});

Then('{string} is the selected status', async ({ page }, name: string) => {
  await expect(statusOption(page, name)).toBeChecked();
  await expect(statusFilter(page).getByRole('radio', { checked: true })).toHaveCount(1);
});

Then('{string} is the selected status and has focus', async ({ page }, name: string) => {
  await expect(statusOption(page, name)).toBeChecked();
  await expect(statusFilter(page).getByRole('radio', { checked: true })).toHaveCount(1);
  await expect(statusOption(page, name)).toBeFocused();
});

Then('focus has left the status filter', async ({ page }) => {
  // Focus has moved on to something, and that is not a radio of the filter.
  await expect(page.locator(':focus')).toHaveCount(1);
  await expect(page.locator('body')).not.toBeFocused();
  await expect(statusFilter(page).locator(':focus')).toHaveCount(0);
});

// Then: what the roster lists

Then('the roster lists only {string}', async ({ page }, name: string) => {
  await expect(rosterEntries(page)).toHaveCount(1);
  await expect(entryNamed(page, name)).toHaveCount(1);
});

Then(/^the roster lists ("[^"]*"(?: and "[^"]*")*) and nothing else$/, async ({ page }, list: string) => {
  const names = quotedTexts(list);
  await expect(rosterEntries(page)).toHaveCount(names.length);
  for (const name of names) await expect(entryNamed(page, name)).toHaveCount(1);
});

// An absence only means something once the list is drawn with what the filters keep of it.
Then('the roster lists nothing', async ({ page }) => {
  await expect(summaryCounts(page)).toHaveText(/^Showing 0 of \d+ characters$/);
  await expect(rosterEntries(page)).toHaveCount(0);
});

Then('the roster does not list {string}', async ({ page }, name: string) => {
  await expect(summaryCounts(page)).toHaveText(/^Showing \d+ of \d+ characters$/);
  await expect(entryNamed(page, name)).toHaveCount(0);
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

// Then: what is announced

Then('nothing has been announced', async ({ page }) => {
  // The list is drawn, and the page has had every chance to speak, before silence says anything.
  await expectStoredEntriesListed(page);
  await expect(liveRegion(page)).toHaveCount(1);
  await expect(liveRegion(page)).toHaveAttribute('aria-atomic', 'true');
  expect(await announcedAfterPause(page)).toEqual([]);
  await expect(liveRegion(page)).toHaveText('');
});

// Once: one write of the text, and still only one after the page has had time to write another.
Then('the roster announces {string} once', async ({ page }, text: string) => {
  await expect.poll(() => writtenTexts(page)).toEqual([text]);
  expect(await announcedAfterPause(page)).toEqual([text]);
  await expect(liveRegion(page)).toHaveText(text);
});

Then('{string} is the last announcement', async ({ page }, text: string) => {
  await expect.poll(async () => (await writtenTexts(page)).at(-1)).toBe(text);
  expect((await announcedAfterPause(page)).at(-1)).toBe(text);
});

Then('{string} has been announced twice', async ({ page }, text: string) => {
  const times = async (): Promise<number> => (await writtenTexts(page)).filter((written) => written === text).length;
  await expect.poll(times).toBe(2);
  await waitOnPageClock(page, ANNOUNCEMENT_WINDOW_MS);
  expect(await times()).toBe(2);
});

Then('focus is still on the search field', async ({ page }) => {
  await expect(searchField(page)).toBeFocused();
});

Then('focus is still on the clan filter', async ({ page }) => {
  await expect(clanFilter(page)).toBeFocused();
});

Then('focus is still on the status option {string}', async ({ page }, name: string) => {
  await expect(statusOption(page, name)).toBeFocused();
});

// The tab the player chose is the selected one, and the one a click or a key leaves focus on.
Then('focus is still on that tab', async ({ page }) => {
  await expect(selectedTab(page)).toHaveCount(1);
  await expect(selectedTab(page)).toBeFocused();
});

// Then: the shortcut

Then(/^focus (is in|is not in) the search field$/, async ({ page }, outcome: string) => {
  // The hint is written by the same script that listens for the keys: once it is up, an absence says something.
  await expect(shortcutHint(page)).toBeVisible();
  if (outcome === 'is in') await expect(searchField(page)).toBeFocused();
  else await expect(searchField(page)).not.toBeFocused();
});

Then('the hint beside the search field reads {string}', async ({ page }, hint: string) => {
  await expect(shortcutHint(page)).toHaveText(hint);
  // Drawn for the eye only; assistive technology is told the keys by the field itself.
  await expect(shortcutHint(page)).toHaveAttribute('aria-hidden', 'true');
  await expect(searchField(page)).toHaveAttribute('aria-keyshortcuts', KEY_SHORTCUT_OF_HINT[hint]);
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
