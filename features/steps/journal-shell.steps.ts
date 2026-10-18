import { expect } from '@playwright/test';
import { Given, Then, When, memoryFor } from './fixtures';
import { characterArranged, saveCharacters } from './support/seed';
import { openSavedSheet } from './support/sheet';
import { activePanel, showTab } from './support/tabs';
import {
  appBarLabel,
  currentRows,
  emptyState,
  journalPanel,
  sessionRow,
  sessionsCard,
  showJournal,
  startSessionOnPage,
  subNavigation,
  withSessions,
} from './support/journal';

// Step phrases for the Journal shell and its sessions. The ones about sessions are shared by the
// Journal's other sections, which read the same stored sessions.

const HEADER = { name: 'Marguerite', clan: 'Toreador' };

/** The first saved character: the one a scenario arranged. */
const arranged = (memory: { saved: { id: string }[] }) => memory.saved[0];

// Arranging

Given(/^a character with "([^"]*)" current$/, async ({ page, memory }, title: string) => {
  memory.saved = [withSessions(characterArranged(HEADER, () => {}), title)];
  await saveCharacters(page, memory.saved);
});

Given(/^a character with "([^"]*)" and "([^"]*)" current$/, async ({ page, memory }, first: string, second: string) => {
  memory.saved = [withSessions(characterArranged(HEADER, () => {}), first, second)];
  await saveCharacters(page, memory.saved);
});

Given(
  /^a character in the chronicle "([^"]*)" with "([^"]*)" current$/,
  async ({ page, memory }, chronicle: string, session: string) => {
    memory.saved = [
      characterArranged({ ...HEADER, chronicle }, (character) => {
        if (session !== '') withSessions(character, session);
      }),
    ];
    await saveCharacters(page, memory.saved);
  },
);

Given('a started session', async ({ page, memory }) => {
  memory.saved = [characterArranged(HEADER, () => {})];
  await openSavedSheet(page, memory.saved[0]);
  await showJournal(page, arranged(memory).id);
  await startSessionOnPage(page, 'Session 7');
  await expect(currentRows(page)).toHaveCount(1);
  journal(memory).started = 'Session 7';
});

Given('a character with many sessions and a very long session title', async ({ page, memory }) => {
  const titles = Array.from({ length: 8 }, (_, at) => `Session ${at + 1}`);
  titles.push(`Session ${'Chronicle'.repeat(12)}`);
  memory.saved = [characterArranged({ ...HEADER, chronicle: 'The Glass City' }, (character) => void withSessions(character, ...titles))];
  await saveCharacters(page, memory.saved);
});

interface JournalMemory {
  /** The session the scenario started on the page. */
  started?: string;
}

const journal = (memory: Parameters<typeof memoryFor>[0]['memory']): JournalMemory =>
  memoryFor<JournalMemory>({ memory }, 'journal', () => ({}));

// Acting

When(/^the player starts a new session titled "([^"]*)" on the Journal tab$/, async ({ page, memory }, title: string) => {
  await showJournal(page, arranged(memory).id);
  await startSessionOnPage(page, title);
});

When('the player starts a session with no title on the Journal tab', async ({ page, memory }) => {
  await showJournal(page, arranged(memory).id);
  await startSessionOnPage(page, '');
});

When(/^the player renames "([^"]*)" to "([^"]*)" on the Journal tab$/, async ({ page, memory }, from: string, to: string) => {
  await showJournal(page, arranged(memory).id);
  await sessionRow(page, from).getByRole('button', { name: `Rename ${from}`, exact: true }).click();
  const field = sessionsCard(page).getByRole('textbox', { name: 'Session title', exact: true });
  await field.fill(to);
  await sessionsCard(page).getByRole('button', { name: new RegExp(`^Save the title of `) }).click();
  await expect(sessionRow(page, to)).toBeVisible();
});

When(/^makes "([^"]*)" current$/, async ({ page }, title: string) => {
  await sessionRow(page, title).getByRole('button', { name: `Make ${title} current`, exact: true }).click();
  await expect(sessionRow(page, title).locator('.journal-session-mark')).toHaveText('current');
});

When(/^the player starts "([^"]*)" and opens the Character sheet tab$/, async ({ page, memory }, title: string) => {
  await showJournal(page, arranged(memory).id);
  await startSessionOnPage(page, title);
  await expect(sessionRow(page, title).locator('.journal-session-mark')).toHaveText('current');
  await showTab(page, 'Character sheet');
});

// Reloading keeps the address, so the same tab is shown again: whichever it was.
When('the sheet is reloaded', async ({ page }) => {
  await page.reload();
  await expect(activePanel(page)).toBeVisible();
});

// Checking

Then('an empty state above the sections offers {string} and {string}', async ({ page }, first: string, second: string) => {
  const empty = emptyState(page);
  await expect(empty).toBeVisible();
  await expect(empty.getByRole('button', { name: first, exact: true })).toBeVisible();
  await expect(empty.getByRole('button', { name: second, exact: true })).toBeVisible();
  const above = await empty.boundingBox();
  const sections = await journalPanel(page).locator('[data-journal-section]').first().boundingBox();
  expect(above!.y + above!.height).toBeLessThanOrEqual(sections!.y);
});

Then('{string} is marked {string} and {string} is not', async ({ page }, marked: string, mark: string, other: string) => {
  await expect(sessionRow(page, marked).locator('.journal-session-mark')).toHaveText(mark);
  await expect(sessionRow(page, other).locator('.journal-session-mark')).toHaveCount(0);
});

Then(/^the page explains that (.+) stops being current$/, async ({ page }, title: string) => {
  await expect(sessionsCard(page).getByText(`${title} stops being current`)).toBeVisible();
});

Then('the new session is named {string}', async ({ page }, title: string) => {
  await expect(sessionRow(page, title)).toBeVisible();
  await expect(sessionRow(page, title).locator('.journal-session-mark')).toHaveText('current');
});

Then('{string} is the only current session and the other is named {string}', async ({ page }, current: string, other: string) => {
  await expect(currentRows(page)).toHaveCount(1);
  await expect(sessionRow(page, current).locator('.journal-session-mark')).toHaveText('current');
  await expect(sessionRow(page, other)).toBeVisible();
  await expect(sessionRow(page, other).locator('.journal-session-mark')).toHaveCount(0);
});

Then('the same session is current on the Journal tab', async ({ page, memory }) => {
  await showJournal(page, arranged(memory).id);
  await expect(sessionRow(page, journal(memory).started!).locator('.journal-session-mark')).toHaveText('current');
});

Then('the application bar reads {string}', async ({ page }, label: string) => {
  await expect(appBarLabel(page)).toHaveText(label);
  if (label === '') await expect(appBarLabel(page)).toBeHidden();
  else await expect(appBarLabel(page)).toBeVisible();
});

Then('{string}, {string} and {string} are headings in that order', async ({ page }, first: string, second: string, third: string) => {
  await expect(journalPanel(page).locator('[data-journal-section] h2')).toHaveText([first, second, third]);
});

Then('a sub-navigation links to each of them', async ({ page }) => {
  const links = subNavigation(page).getByRole('link');
  await expect(links).toHaveText(['Notes', 'Experience', 'Character Record']);
  for (const link of await links.all()) {
    const target = ((await link.getAttribute('href')) ?? '').replace(/^#/, '');
    await expect(journalPanel(page).locator(`[id="${target}"]`)).toHaveCount(1);
  }
});
