// The Clan screen: the fourteen clans as a radiogroup, a search with its result count and shortcut, the
// detail of the chosen clan, and the question a switch that would remove dots asks. Screen standards are
// the shared steps (builder-standards.steps.ts) and are not restated here.

import { expect, type Page } from '@playwright/test';
import { CAITIFF_NOTE, CLAN_CARDS } from '../../src/domain/v20/creation/clanCards';
import { isLocked, rating } from '../../src/domain/v20/creation/ratings';
import { CLAN_NAMES } from '../../src/domain/v20/creation/rules';
import { clan as inClan, creation, rank } from '../../src/domain/v20/creation/testing/play';
import { announcements } from './support/announcements';
import { Given, Then, When } from './fixtures';
import { openPlayed, reloadBuilder, startBuild, storedBuild } from './support/builder';
import {
  CLAN_PATTERN,
  chooseClan,
  clanDetailPanel,
  clanHeading,
  clanHelp,
  clanList,
  clanNotice,
  clanPanel,
  clanQuestionStatus,
  clanRadio,
  clanResults,
  clanSearch,
  clanSelectedCount,
  expectClanChosen,
  focusedClan,
  listedClans,
  openClanScreen,
} from './support/clan';
import { panelValue } from './support/shell';
import { escaped } from './support/text';

const CLAN = `(${CLAN_PATTERN})`;

/** "A, B and C" as its names. */
const names = (list: string): string[] => list.split(/, | and /);

// Given

Given('I am on the Clan screen of a new build', async ({ page }) => {
  await startBuild(page);
  await openClanScreen(page);
});

Given('the platform is {string}', async ({ page }, platform: string) => {
  // The shortcut and its hint are decided when the page starts, so the platform is set before it reloads.
  const reported = platform === 'macOS' ? 'MacIntel' : 'Win32';
  await page.addInitScript((value) => Object.defineProperty(navigator, 'platform', { get: () => value }), reported);
  await reloadBuilder(page);
  await openClanScreen(page);
});

// "a Nosferatu build" and the other plain builds are arranged by builder-seeding.steps.ts.

Given(new RegExp(`^a ${CLAN} build with no Discipline dots$`), async ({ page }, clan: string) => {
  await openPlayed(page, inClan(clan));
  await openClanScreen(page);
});

Given(new RegExp(`^a ${CLAN} build with creation dots in (.+)$`), async ({ page }, clan: string, list: string) => {
  await openPlayed(page, inClan(clan), ...names(list).map((discipline) => creation(`discipline:${discipline}`, 1)));
  await openClanScreen(page);
});

Given(new RegExp(`^a ${CLAN} build with (\\d+) creation dots on Appearance$`), async ({ page }, clan: string, dots: string) => {
  // Appearance's free dot comes first: two creation dots make a rating of 3.
  await openPlayed(page, rank('social', 'primary'), inClan(clan), creation('attribute:appearance', 1 + Number(dots)));
  await openClanScreen(page);
});

// When

When('they open the clan step', async ({ page }) => {
  await openClanScreen(page);
});

When('they choose the clan {string}', async ({ page }, clan: string) => {
  await chooseClan(page, clan);
});

When(new RegExp(`^I choose ${CLAN}$`), async ({ page }, clan: string) => {
  await chooseClan(page, clan);
});

When(new RegExp(`^I choose ${CLAN} and then keep ${CLAN}$`), async ({ page }, clan: string, kept: string) => {
  await chooseClan(page, clan);
  await clanPanel(page).getByRole('button', { name: `Keep ${kept}`, exact: true }).click();
});

When('I confirm the switch', async ({ page }) => {
  await clanPanel(page).getByRole('button', { name: /^Switch to / }).click();
});

When('I search the clans for {string}', async ({ page }, query: string) => {
  await openClanScreen(page);
  await clanSearch(page).fill(query);
});

When('I move through the clan list with the arrow keys', async ({ page, memory }) => {
  await openClanScreen(page);
  // Tab reaches the list on its one tab stop: the first clan, while none is chosen.
  await clanRadio(page, CLAN_CARDS[0].name).focus();
  const visited = [await focusedClan(page)];
  for (const key of ['ArrowDown', 'ArrowDown', 'ArrowUp']) {
    await page.keyboard.press(key);
    visited.push(await focusedClan(page));
  }
  memory.entered.set('visited', visited.join('|'));
});

When(/^I press (Meta|Control)\+K$/, async ({ page }, modifier: string) => {
  await page.keyboard.press(`${modifier}+K`);
});

// Then

Then(/^(\d+) clans are listed with "([^"]*)"$/, async ({ page }, count: string, heading: string) => {
  await expect(listedClans(page)).toHaveCount(Number(count));
  const listed = await listedClans(page).evaluateAll((cards) => cards.map((card) => card.getAttribute('data-clan-card')));
  expect(listed).toEqual([...CLAN_NAMES]);
  await expect(clanHeading(page)).toHaveText(heading);
});

Then('the selection count reads {string}', async ({ page }, count: string) => {
  await expect(clanSelectedCount(page)).toHaveText(count);
  // A new build has no clan chosen.
  await expect(page.locator('[data-clan-card][aria-checked="true"]')).toHaveCount(0);
});

Then('each clan shows a short description line', async ({ page }) => {
  for (const { name, line } of CLAN_CARDS) await expect(clanRadio(page, name)).toContainText(line);
});

Then(new RegExp(`^only ${CLAN} is listed$`), async ({ page }, clan: string) => {
  await expect(listedClans(page)).toHaveCount(1);
  await expect(clanRadio(page, clan)).toBeVisible();
});

Then('the clan count heading reads {string}', async ({ page }, heading: string) => {
  await expect(clanHeading(page)).toHaveText(heading);
});

Then('the clan result count {string} is announced', async ({ page }, text: string) => {
  await expect(clanResults(page)).toHaveAttribute('role', 'status');
  await expect(clanResults(page)).toHaveText(text);
  await expect.poll(() => announcements(page)).toContain(text);
});

Then('no clans are listed', async ({ page }) => {
  await expect(listedClans(page)).toHaveCount(0);
});

Then('I am told no clan matches and it is announced', async ({ page }) => {
  await expect(clanResults(page)).toBeVisible();
  await expect(clanResults(page)).toContainText('No clan matches');
  const told = (await clanResults(page).textContent())!.trim();
  await expect.poll(() => announcements(page)).toContain(told);
});

Then(new RegExp(`^${CLAN} reads "Selected" and the count reads "([^"]*)"$`), async ({ page }, clan: string, count: string) => {
  await expectClanChosen(page, clan);
  await expect(clanSelectedCount(page)).toHaveText(count);
});

Then(/^the detail panel lists (.+)$/, async ({ page }, list: string) => {
  await expect(clanDetailPanel(page).locator('[data-clan-detail-disciplines] li')).toHaveText(names(list));
});

Then(new RegExp(`^the character panel's Clan row reads ${CLAN}$`), async ({ page }, clan: string) => {
  await expect(panelValue(page, 'Clan')).toHaveText(clan);
});

Then('focus moves from one clan to the next and a clan is chosen only when I select it', async ({ page, memory }) => {
  const [first, second, third] = CLAN_CARDS.map((card) => card.name);
  // Down, down, up: the walk went on to the next clan each time, and back one.
  expect(memory.entered.get('visited')).toBe([first, second, third, second].join('|'));
  await expect(page.locator('[data-clan-card][aria-checked="true"]')).toHaveCount(0);
  await expect(clanSelectedCount(page)).toHaveText('Selected · 0/1');
  await page.keyboard.press('Space');
  await expectClanChosen(page, second);
});

Then('the detail panel says any Discipline is available', async ({ page }) => {
  await expect(clanDetailPanel(page).locator('[data-clan-detail-disciplines] li')).toHaveText(['Any Discipline']);
});

Then(/^the "Not sure yet\?" note says (.+)$/, async ({ page }, note: string) => {
  expect(CAITIFF_NOTE.heading).toBe('Not sure yet?');
  await expect(clanHelp(page).getByRole('heading', { name: 'Not sure yet?' })).toBeVisible();
  await expect(clanHelp(page)).toContainText(note);
  await expect(clanHelp(page)).toContainText(CAITIFF_NOTE.text);
});

Then('the detail panel says Appearance is fixed at 0', async ({ page }) => {
  await expect(clanDetailPanel(page)).toContainText('Appearance is fixed at 0');
});

Then(/^the detail panel notes that (only Nosferatu's Appearance rule changes creation arithmetic)$/, async ({ page }, note: string) => {
  await expect(clanDetailPanel(page)).toContainText(new RegExp(escaped(note), 'i'));
});

Then(new RegExp(`^${CLAN} is chosen with no confirmation$`), async ({ page }, clan: string) => {
  await expectClanChosen(page, clan);
  await expect(clanPanel(page)).toBeHidden();
});

Then(/^I am told that the (\w+) dots would be removed$/, async ({ page }, discipline: string) => {
  await expect(clanPanel(page)).toBeVisible();
  await expect(clanPanel(page)).toContainText(new RegExp(`The ${discipline} dots? will be removed`));
});

Then('the switch confirmation is shown', async ({ page }) => {
  await expect(clanPanel(page)).toBeVisible();
  await expect(clanPanel(page).getByRole('button', { name: /^Switch to / })).toBeFocused();
});

Then(/^the (\w+) dots are removed and I am told so$/, async ({ page }, discipline: string) => {
  await expect(clanNotice(page)).toContainText(new RegExp(`The ${discipline} dots? (?:was|were) removed`));
  const held = (await storedBuild(page)).disciplines.filter((entry) => entry.name === discipline && entry.creation > 0);
  expect(held).toEqual([]);
});

Then(new RegExp(`^${CLAN} is still chosen and no dots were removed$`), async ({ page }, clan: string) => {
  await expectClanChosen(page, clan);
  await expect(clanPanel(page)).toBeHidden();
  // Focus comes back to the chosen clan.
  await expect(clanRadio(page, clan)).toBeFocused();
  const held = (await storedBuild(page)).disciplines.filter((entry) => entry.creation > 0).map((entry) => entry.name);
  expect(held.sort()).toEqual(['Celerity', 'Potence', 'Presence']);
});

Then('I am told the Appearance dots would be removed', async ({ page }) => {
  await expect(clanPanel(page)).toBeVisible();
  await expect(clanPanel(page)).toContainText(/Appearance will be set to 0/);
});

Then('Appearance is fixed at 0', async ({ page }) => {
  const build = await storedBuild(page);
  expect(isLocked(build, 'attribute:appearance')).toBe(true);
  expect(rating(build, 'attribute:appearance')).toBe(0);
});

Then('Appearance can take creation dots again', async ({ page }) => {
  const build = await storedBuild(page);
  expect(isLocked(build, 'attribute:appearance')).toBe(false);
  expect(rating(build, 'attribute:appearance')).toBe(1);
});

Then('focus is in the clan search field', async ({ page }) => {
  await expect(clanSearch(page)).toBeFocused();
});

Then('the clan search hint reads {string}', async ({ page }, hint: string) => {
  await expect(page.locator('[data-clan-search-hint]')).toHaveText(hint);
});

// The edges: the question after the build changes, the keys the browser owns, the detail's outline

Then('the clan question offers {string} and {string}', async ({ page }, answer: string, other: string) => {
  await expect(clanPanel(page).getByRole('button')).toHaveText([answer, other]);
});

Then('no clan question is open', async ({ page }) => {
  await expect(clanPanel(page)).toBeHidden();
  await expect(clanQuestionStatus(page)).toBeEmpty();
  await expect(clanPanel(page).getByRole('button')).toHaveCount(0);
});

When('I focus the first clan and press {word}', async ({ page }, keys: string) => {
  await openClanScreen(page);
  await clanRadio(page, CLAN_CARDS[0].name).focus();
  await page.keyboard.press(keys);
});

Then('focus is still on the first clan', async ({ page }) => {
  expect(await focusedClan(page)).toBe(CLAN_CARDS[0].name);
});

Then('the clan list is described as moving with the arrow keys and choosing with Space or Enter', async ({ page }) => {
  await expect(clanList(page)).toHaveAccessibleDescription(/Arrow keys move between clans; Space or Enter chooses\./);
});

Then('the chosen clan region is headed {string} at level 3', async ({ page }, clan: string) => {
  const region = page.locator('#builder').getByRole('region', { name: 'Chosen clan', exact: true });
  await expect(region.getByRole('heading', { level: 3, name: clan, exact: true })).toBeVisible();
});

/** Whether Control+K, pressed where focus is now, was taken by the page (default prevented). */
const pressedKeyWasTaken = (page: Page): Promise<boolean> =>
  page.evaluate(() => {
    const press = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true });
    (document.activeElement ?? document.body).dispatchEvent(press);
    return press.defaultPrevented;
  });

Then('Control+K is taken by the page', async ({ page }) => {
  expect(await pressedKeyWasTaken(page)).toBe(true);
});

Then('Control+K is left to the browser', async ({ page }) => {
  expect(await pressedKeyWasTaken(page)).toBe(false);
});

// The scenarios that predate the radiogroup

Then('the chosen clan is {string}', async ({ page }, clan: string) => {
  await reloadBuilder(page);
  await expectClanChosen(page, clan);
});

Then('choosing {string} again leaves it chosen', async ({ page }, clan: string) => {
  await clanRadio(page, clan).click();
  await expectClanChosen(page, clan);
  await expect(clanPanel(page)).toBeHidden();
});

Then("the clan question's status region is on the page and says nothing", async ({ page }) => {
  const status = clanQuestionStatus(page);
  await expect(status).toHaveAttribute('role', 'status');
  await expect(status).toBeEmpty();
  // A live region that starts out hidden is not reliably announced when it is shown with its text.
  expect(await status.evaluate((element) => element.closest('[hidden]') === null)).toBe(true);
});

Then("the clan question's status region says {string}", async ({ page }, text: string) => {
  await expect(clanQuestionStatus(page)).toContainText(text);
  await expect(clanQuestionStatus(page)).toBeVisible();
});
