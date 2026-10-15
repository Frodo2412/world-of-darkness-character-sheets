import { expect, type Page } from '@playwright/test';
import type { V20Character } from '../../src/domain/v20/character';
import { Given, Then, When, memoryFor, type ScenarioMemory } from './fixtures';
import { characterArranged, saveCharacters } from './support/seed';
import { openSavedSheet, savedCharacter } from './support/sheet';
import { fixClock } from './support/tabs';
import { withSessions } from './support/journal';
import {
  bodyField,
  categoryField,
  checkboxes,
  chooseScope,
  countOf,
  editorEmpty,
  listTitle,
  mentionChips,
  newNoteButton,
  noteCard,
  noteCards,
  notesSection,
  openNote,
  pinOf,
  preview,
  saveButton,
  saveStatus,
  searchBox,
  selectBodyLine,
  showNotes,
  sidebarItem,
  titleField,
  tool,
  withNote,
} from './support/journal-notes';

// Step phrases for the Journal's notes. Those about notes name "the Journal notes" or the note, so none
// overlaps the sessions' or the other tabs'.

const HEADER = { name: 'Marguerite', clan: 'Toreador' };

interface NotesMemory {
  /** The title of the note the scenario is working with. */
  title: string;
  /** The notes' titles, in the order arranged. */
  titles: string[];
  /** How many dialogs the page opened. */
  dialogs: number;
}

const notes = (memory: ScenarioMemory): NotesMemory => memoryFor<NotesMemory>({ memory }, 'journal-notes', () => ({ title: '', titles: [], dialogs: 0 }));

/** Saves the character, opens its sheet (so announcements are watched) and shows the Journal. */
async function open(page: Page, memory: ScenarioMemory, character: V20Character, chosen?: string): Promise<void> {
  memory.saved = [character];
  await openSavedSheet(page, character);
  await showNotes(page, character.id);
  if (chosen !== undefined) await openNote(page, chosen);
}

const alphaIn = (character: V20Character, title = 'Alpha'): V20Character => withNote(withSessions(character, 'Session 12'), { title, category: 'Clues', body: 'Some text.' });

// Arranging

Given(/^"([^"]*)" is current$/, async ({ page, memory }, title: string) => {
  memory.saved = [withSessions(characterArranged(HEADER, () => {}), title)];
  await saveCharacters(page, memory.saved);
});

Given('a character with notes', async ({ page, memory }) => {
  const character = characterArranged(HEADER, () => {});
  withSessions(character, 'Session 11');
  withNote(character, { title: 'Alpha', category: 'Places' });
  withSessions(character, 'Session 12');
  withNote(character, { title: 'Beta', category: 'Clues', tags: ['portrait'] });
  withNote(character, { title: 'Gamma', category: 'Unsorted' });
  memory.saved = [character];
  await saveCharacters(page, memory.saved);
});

Given(/^"([^"]*)" is current and the player is viewing "([^"]*)" on the Journal notes$/, async ({ page, memory }, current: string, viewing: string) => {
  const character = characterArranged(HEADER, () => {});
  withSessions(character, viewing);
  withNote(character, { title: 'Written earlier', category: 'Clues' });
  withSessions(character, current);
  await open(page, memory, character);
  await chooseScope(page, viewing);
  await expect(listTitle(page)).toHaveText(viewing);
});

Given('a note being edited', async ({ page, memory }) => {
  await open(page, memory, alphaIn(characterArranged(HEADER, () => {})), 'Alpha');
  notes(memory).title = 'Alpha';
});

Given(/^a note being edited with the clock fixed at (\d+):(\d+)$/, async ({ page, memory }, hour: string, minute: string) => {
  await fixClock(page, new Date(2026, 2, 14, Number(hour), Number(minute)));
  await open(page, memory, alphaIn(characterArranged(HEADER, () => {})), 'Alpha');
  notes(memory).title = 'Alpha';
});

Given('two notes', async ({ page, memory }) => {
  const character = withSessions(characterArranged(HEADER, () => {}), 'Session 12');
  withNote(character, { title: 'Alpha', category: 'Clues' });
  withNote(character, { title: 'Beta', category: 'Places' });
  notes(memory).titles = ['Alpha', 'Beta'];
  await open(page, memory, character);
});

Given('a note with three checklist items', async ({ page, memory }) => {
  const body = '- [ ] Ask Mara\n- [ ] Compare the seal\n- [ ] Find the dealer';
  const character = withNote(withSessions(characterArranged(HEADER, () => {}), 'Session 12'), { title: 'Follow-ups', category: 'Promises & boons', body });
  notes(memory).title = 'Follow-ups';
  await open(page, memory, character, 'Follow-ups');
});

Given(
  /^a note titled "([^"]*)" with body "([^"]*)", tag "([^"]*)" and mention "@([^"]*)"$/,
  async ({ page, memory }, title: string, body: string, tag: string, mention: string) => {
    const character = withNote(withSessions(characterArranged(HEADER, () => {}), 'Session 12'), { title, body, tags: [tag], mentions: [mention] });
    notes(memory).title = title;
    await open(page, memory, character);
  },
);

Given(/^a note titled "([^"]*)"$/, async ({ page, memory }, title: string) => {
  notes(memory).title = title;
  await open(page, memory, withNote(withSessions(characterArranged(HEADER, () => {}), 'Session 12'), { title, body: 'Some text.' }));
});

Given(/^a note body containing "([^"]*)"$/, async ({ page, memory }, body: string) => {
  const character = withNote(withSessions(characterArranged(HEADER, () => {}), 'Session 12'), { title: 'Mentions', body });
  notes(memory).title = 'Mentions';
  await open(page, memory, character, 'Mentions');
});

Given('a note in Session 12', async ({ page, memory }) => {
  notes(memory).title = 'Alpha';
  memory.saved = [alphaIn(characterArranged(HEADER, () => {}))];
  await saveCharacters(page, memory.saved);
});

Given('a character in play mode with a session', async ({ page, memory }) => {
  memory.saved = [withSessions(characterArranged(HEADER, () => {}), 'Session 12')];
  await openSavedSheet(page, memory.saved[0]);
});

Given('a character saved before the Journal with text in its notes field', async ({ page, memory }) => {
  memory.saved = [characterArranged(HEADER, (character) => void (character.notes = 'Met the Prince at Elysium.\nOwes Henri a favour.'))];
  await saveCharacters(page, memory.saved);
});

/** Everything the notes can hold, in words that would overflow a phone. */
Given('a character with a populated note being edited', async ({ page, memory }) => {
  const long = 'Supercalifragilisticexpialidocious'.repeat(3);
  const character = withSessions(characterArranged({ ...HEADER, chronicle: long }, () => {}), 'Session 11');
  withNote(character, {
    title: `${long} provenance`,
    category: 'People & relationships',
    tags: [long, 'portrait', 'Elysium'],
    mentions: [long],
    pinned: true,
    body: `${long}\n\n**bold** and *italic* and [a link](https://example.com/${long})\n\n- one\n- [ ] two\n1. three\n\n> ${long}`,
  });
  withNote(character, { title: 'A second note', category: 'Clues' });
  notes(memory).title = `${long} provenance`;
  await open(page, memory, character, `${long} provenance`);
});

// Acting

When('the player presses "New note" on the Journal notes', async ({ page, memory }) => {
  await showNotes(page, memory.saved[0].id);
  await newNoteButton(page).click();
});

When(
  'the player presses "New note" on the Journal notes and writes a note titled {string} in category {string} tagged {string}',
  async ({ page, memory }, title: string, category: string, tag: string) => {
    await showNotes(page, memory.saved[0].id);
    await newNoteButton(page).click();
    await titleField(page).fill(title);
    await categoryField(page).selectOption(category);
    await notesSection(page).getByLabel('Add tag', { exact: true }).fill(tag);
    await notesSection(page).getByRole('button', { name: 'Add tag', exact: true }).click();
    await saveButton(page).click();
    await expect(saveStatus(page)).toContainText('All changes saved');
    notes(memory).title = title;
  },
);

When('the player creates a note', async ({ page }) => {
  await newNoteButton(page).click();
});

When('the player changes its title', async ({ page }) => {
  await titleField(page).fill('A changed title');
});

When('the player presses "Save note"', async ({ page }) => {
  await saveButton(page).click();
});

When('the player types a long body with pauses longer than the autosave delay', async ({ page, memory }) => {
  const parts = ['The portrait ', 'passed through ', 'the museum ', 'before it appeared.'];
  await bodyField(page).fill('');
  for (const part of parts) {
    await bodyField(page).pressSequentially(part);
    await page.waitForTimeout(600);
  }
  notes(memory).title = parts.join('');
});

When('the player pins one', async ({ page, memory }) => {
  const [first] = notes(memory).titles;
  await pinOf(page, first).click();
  await expect(pinOf(page, first)).toHaveAttribute('aria-pressed', 'true');
});

When('the player unpins it', async ({ page, memory }) => {
  const [first] = notes(memory).titles;
  // In the Pinned list an unpinned note leaves at once, so there is no card left to check.
  await pinOf(page, first).click();
});

When('the player makes text bold and italic, adds a bulleted list, a numbered list, a link and a quote', async ({ page }) => {
  await bodyField(page).fill('strong\nemphasis\nbullet\nnumber\nquoted\nlink text');
  const lines: [number, string][] = [
    [0, 'Bold'],
    [1, 'Italic'],
    [2, 'Bulleted list'],
    [3, 'Numbered list'],
    [4, 'Quote'],
  ];
  for (const [line, name] of lines) {
    await selectBodyLine(page, line);
    await tool(page, name).click();
  }
  await selectBodyLine(page, 5);
  await tool(page, 'Link').click();
  await notesSection(page).getByLabel('Link address', { exact: true }).fill('https://example.com');
  await notesSection(page).getByRole('button', { name: 'Add link', exact: true }).click();
});

When('the player ticks the second in the preview', async ({ page }) => {
  await checkboxes(page).nth(1).check();
});

When('the player unticks it', async ({ page }) => {
  await checkboxes(page).nth(1).uncheck();
});

When('the player types {string} and {string} in the body', async ({ page, memory }, first: string, second: string) => {
  const dialogs = notes(memory);
  page.on('dialog', (dialog) => {
    dialogs.dialogs += 1;
    void dialog.dismiss();
  });
  await bodyField(page).fill(`${first}\n\n${second}`);
});

When('the player adds a link to {string}', async ({ page }, address: string) => {
  await bodyField(page).fill('');
  await tool(page, 'Link').click();
  await notesSection(page).getByLabel('Link address', { exact: true }).fill(address);
  await notesSection(page).getByRole('button', { name: 'Add link', exact: true }).click();
});

When('the player searches {string} on the Journal notes', async ({ page }, query: string) => {
  await showNotes(page, (await currentId(page)));
  await searchBox(page).fill(query);
});

When('the player searches {string}', async ({ page }, query: string) => {
  await searchBox(page).fill(query);
});

When('the player writes a note on the Journal notes', async ({ page, memory }) => {
  await showNotes(page, memory.saved[0].id);
  await newNoteButton(page).click();
  await titleField(page).fill('Played note');
  await bodyField(page).fill('Written during play.');
  await saveButton(page).click();
  await expect(saveStatus(page)).toContainText('All changes saved');
});

/** The id of the character whose sheet is open, read from the address. */
async function currentId(page: Page): Promise<string> {
  return new URL(page.url()).searchParams.get('id') ?? '';
}

// Checking

Then('the note is listed under Session 12 and under Clues', async ({ page, memory }) => {
  const { title } = notes(memory);
  await chooseScope(page, 'Session 12');
  await expect(noteCard(page, title)).toBeVisible();
  await chooseScope(page, 'Clues');
  await expect(noteCard(page, title)).toBeVisible();
});

Then('the session and category counts include it', async ({ page }) => {
  await expect(countOf(page, 'Session 12')).toHaveText('1');
  await expect(countOf(page, 'Clues')).toHaveText('1');
  await expect(countOf(page, 'All notes')).toHaveText('1');
});

Then('it is still there after a reload', async ({ page, memory }) => {
  await page.reload();
  await showNotes(page, memory.saved[0].id);
  await expect(noteCard(page, notes(memory).title)).toBeVisible();
});

Then('the Journal notes editor says {string}', async ({ page }, text: string) => {
  await expect(editorEmpty(page)).toBeVisible();
  await expect(editorEmpty(page)).toHaveText(text);
});

Then('the view switches to Session 12 and the new note is shown and focused', async ({ page }) => {
  await expect(sidebarItem(page, 'Session 12')).toHaveAttribute('aria-current', 'true');
  await expect(listTitle(page)).toHaveText('Session 12');
  await expect(noteCards(page).filter({ has: page.locator('.journal-note-open[aria-current="true"]') })).toHaveCount(1);
  await expect(titleField(page)).toBeFocused();
  await expect(titleField(page)).toHaveValue('');
});

Then('the same status is shown', async ({ page }) => {
  await expect(saveStatus(page)).toHaveText('All changes saved · 23:42');
});

Then('the body holds exactly what was typed and it is stored', async ({ page, memory }) => {
  const typed = notes(memory).title;
  await expect(bodyField(page)).toHaveValue(typed);
  await expect(saveStatus(page)).toContainText('All changes saved');
  const stored = await savedCharacter(page, memory.saved[0].id);
  expect(stored.journal.notes.find((note) => note.title === 'Alpha')?.body).toBe(typed);
});

Then('it appears under Pinned and the Pinned count reads 1', async ({ page, memory }) => {
  await expect(countOf(page, 'Pinned')).toHaveText('1');
  await chooseScope(page, 'Pinned');
  await expect(noteCards(page)).toHaveCount(1);
  await expect(noteCard(page, notes(memory).titles[0])).toBeVisible();
});

Then('the Pinned count reads 0', async ({ page }) => {
  await expect(countOf(page, 'Pinned')).toHaveText('0');
});

Then('the preview shows strong and emphasised text, an unordered list, an ordered list, a link and a block quote', async ({ page }) => {
  const shown = preview(page);
  await expect(shown.locator('strong')).toHaveText('strong');
  await expect(shown.locator('em')).toHaveText('emphasis');
  await expect(shown.locator('ul > li')).toHaveText('bullet');
  await expect(shown.locator('ol > li')).toHaveText('number');
  await expect(shown.locator('a[href="https://example.com"]')).toHaveText('link text');
  await expect(shown.locator('blockquote')).toHaveText('quoted');
});

Then('it shows as done and stays done after a reload', async ({ page, memory }) => {
  await expect(checkboxes(page).nth(1)).toBeChecked();
  await expect(saveStatus(page)).toContainText('All changes saved');
  await page.reload();
  await showNotes(page, memory.saved[0].id);
  await openNote(page, notes(memory).title);
  await expect(checkboxes(page).nth(0)).not.toBeChecked();
  await expect(checkboxes(page).nth(1)).toBeChecked();
  await expect(checkboxes(page).nth(2)).not.toBeChecked();
});

Then('it shows as not done', async ({ page }) => {
  await expect(checkboxes(page).nth(1)).not.toBeChecked();
});

Then('the preview shows that exact text', async ({ page }) => {
  const paragraphs = preview(page).locator('p');
  await expect(paragraphs).toHaveText(['<script>alert(1)</script>', '<img src=x onerror=alert(1)>']);
});

Then('no dialog opens and no script or image element is added to the page', async ({ page, memory }) => {
  // An image that fails to load would have raised its onerror by now.
  await page.waitForTimeout(400);
  expect(notes(memory).dialogs).toBe(0);
  await expect(preview(page).locator('script, img')).toHaveCount(0);
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  await expect(page.locator('script:not([src])').filter({ hasText: 'alert(1)' })).toHaveCount(0);
});

Then('the preview shows the text and no link', async ({ page }) => {
  await expect(preview(page)).toHaveText('link text');
  await expect(preview(page).locator('a')).toHaveCount(0);
});

Then('the note is listed', async ({ page, memory }) => {
  await expect(noteCard(page, notes(memory).title)).toBeVisible();
});

Then('"No notes match." is shown', async ({ page }) => {
  await expect(notesSection(page).getByText('No notes match.', { exact: true })).toBeVisible();
  await expect(noteCards(page)).toHaveCount(0);
});

Then('the note lists {string} among its mentioned names', async ({ page }, name: string) => {
  await expect(mentionChips(page)).toContainText([name]);
});

Then('a chip can be added and removed by hand', async ({ page }) => {
  // A name the text gives is shown without a way to remove it; one added by hand has one.
  await expect(notesSection(page).getByRole('button', { name: 'Remove Camille Arnaud', exact: true })).toHaveCount(0);
  await notesSection(page).getByLabel('Add mentioned name', { exact: true }).fill('Mara Klein');
  await notesSection(page).getByRole('button', { name: 'Add name', exact: true }).click();
  await expect(mentionChips(page)).toContainText(['Camille Arnaud', 'Mara Klein']);
  await notesSection(page).getByRole('button', { name: 'Remove Mara Klein', exact: true }).click();
  await expect(mentionChips(page)).toHaveText(['Camille Arnaud']);
});

Then('the note is listed under Session 12 and not under Session 13', async ({ page, memory }) => {
  const { title } = notes(memory);
  await showNotes(page, memory.saved[0].id);
  await chooseScope(page, 'Session 12');
  await expect(noteCard(page, title)).toBeVisible();
  await expect(countOf(page, 'Session 13')).toHaveText('0');
  await chooseScope(page, 'Session 13');
  await expect(noteCards(page)).toHaveCount(0);
});

Then('it is saved and no trait on the character changes', async ({ page, memory }) => {
  const before = memory.saved[0];
  const after = await savedCharacter(page, before.id);
  expect(after.journal.notes.map((note) => note.title)).toEqual(['Played note']);
  expect({ ...after, journal: null }).toEqual({ ...JSON.parse(JSON.stringify(before)), journal: null });
});

Then('"Earlier notes" shows that text and cannot be edited', async ({ page }) => {
  await notesSection(page).getByRole('button', { name: 'Earlier notes', exact: true }).click();
  const earlier = notesSection(page).locator('[data-editor-earlier]');
  await expect(earlier.locator('[data-earlier-text]')).toHaveText('Met the Prince at Elysium.\nOwes Henri a favour.');
  await expect(earlier.locator('input, textarea, select, [contenteditable]')).toHaveCount(0);
});

Then('choosing a note from the list moves focus to the editor', async ({ page }) => {
  await noteCards(page).filter({ hasText: 'A second note' }).locator('.journal-note-open').click();
  await expect(titleField(page)).toBeFocused();
  await expect(titleField(page)).toHaveValue('A second note');
});
