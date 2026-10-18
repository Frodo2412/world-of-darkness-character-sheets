import { expect, type Locator, type Page } from '@playwright/test';
import type { V20Character } from '../../../src/domain/v20/character';
import { addNote, editNote, togglePin, type NoteFields } from '../../../src/domain/v20/journal/notes/notes';
import type { Stamp } from '../../../src/domain/v20/journal/stamp';
import { escaped } from './text';
import { journalPanel, showJournal } from './journal';

// This file is the one place that knows the Journal notes' markup: the steps ask for the sidebar, the
// list and the editor through the functions below.

export const notesSection = (page: Page): Locator => journalPanel(page).locator('[data-journal-section="notes"]');

/** The "New note" button in the Journal's heading. */
export const newNoteButton = (page: Page): Locator => journalPanel(page).locator('.journal-heading').getByRole('button', { name: 'New note', exact: true });

/** A sidebar item by the name it shows: "All notes", "Pinned", a session, a category. */
export const sidebarItem = (page: Page, name: string): Locator =>
  notesSection(page).locator('[data-sidebar] .journal-scope').filter({ has: page.locator('.journal-scope-name', { hasText: new RegExp(`^${escaped(name)}$`) }) });

/** The number beside a sidebar item. */
export const countOf = (page: Page, name: string): Locator => sidebarItem(page, name).locator('.journal-scope-count');

export const noteCards = (page: Page): Locator => notesSection(page).locator('[data-note-list] > li');

/** The card of the note titled `title`. */
export const noteCard = (page: Page, title: string): Locator =>
  noteCards(page).filter({ has: page.locator('.journal-note-title', { hasText: new RegExp(`^${escaped(title)}$`) }) });

export const listTitle = (page: Page): Locator => notesSection(page).locator('[data-list-title]');
export const searchBox = (page: Page): Locator => notesSection(page).getByRole('searchbox', { name: 'Search notes', exact: true });
export const editorEmpty = (page: Page): Locator => notesSection(page).locator('[data-editor-empty]');
export const titleField = (page: Page): Locator => notesSection(page).getByLabel('Note title', { exact: true });
export const bodyField = (page: Page): Locator => notesSection(page).getByLabel('Note text', { exact: true });
export const categoryField = (page: Page): Locator => notesSection(page).getByLabel('Category', { exact: true });
export const preview = (page: Page): Locator => notesSection(page).locator('[data-preview]');
export const saveStatus = (page: Page): Locator => notesSection(page).locator('[data-save-status]');
export const saveButton = (page: Page): Locator => notesSection(page).getByRole('button', { name: 'Save note', exact: true });
export const tagChips = (page: Page): Locator => notesSection(page).locator('[data-tags] .journal-chip-text');
export const mentionChips = (page: Page): Locator => notesSection(page).locator('[data-mentions] .journal-chip-text');
export const checkboxes = (page: Page): Locator => preview(page).getByRole('checkbox');

/** A toolbar button by its name. */
export const tool = (page: Page, name: string): Locator => notesSection(page).getByRole('button', { name, exact: true });

/** The pin button on a note's card. */
export const pinOf = (page: Page, title: string): Locator => notesSection(page).getByRole('button', { name: `Pin ${title}`, exact: true });

/** Chooses a sidebar item and waits for the list to say so. */
export async function chooseScope(page: Page, name: string): Promise<void> {
  await sidebarItem(page, name).click();
  await expect(sidebarItem(page, name)).toHaveAttribute('aria-current', 'true');
}

/** Opens the card of the note titled `title` in the editor. */
export async function openNote(page: Page, title: string): Promise<void> {
  await noteCard(page, title).locator('.journal-note-open').click();
  await expect(titleField(page)).toHaveValue(title);
}

/** Selects one line of the body, so a toolbar button works on it. Lines count from 0. */
export async function selectBodyLine(page: Page, line: number): Promise<void> {
  await bodyField(page).evaluate((area: HTMLTextAreaElement, at: number) => {
    const lines = area.value.split('\n');
    const start = lines.slice(0, at).reduce((total, text) => total + text.length + 1, 0);
    area.focus();
    area.setSelectionRange(start, start + lines[at].length);
  }, line);
}

/** Shows the Journal and waits for its notes. */
export async function showNotes(page: Page, id: string): Promise<void> {
  await showJournal(page, id);
  await expect(notesSection(page)).toBeVisible();
}

let made = 0;

/** A clock that starts on the evening of 14 March 2026 and moves a minute with each use, and ids the page will never make. */
export function seededNotesStamp(): Stamp {
  return {
    newId: () => `seeded-note-${(made += 1)}`,
    now: () => new Date(2026, 2, 14, 22, 0).getTime() + (made += 1) * 60_000,
  };
}

/** The character with a note written in its current session, by the fields given; `mentions` and `pinned` are set after. */
export function withNote(character: V20Character, fields: Partial<NoteFields> & { mentions?: string[]; pinned?: boolean }): V20Character {
  const stamp = seededNotesStamp();
  const { mentions, pinned, ...written } = fields;
  const added = addNote(character.journal, written, stamp);
  if (!added.ok) throw new Error(`the character has no session to write a note in (${added.reason})`);
  let journal = added.journal;
  if (mentions !== undefined) journal = { ...journal, notes: journal.notes.map((note) => (note.id === added.id ? { ...note, mentions } : note)) };
  if (pinned === true) journal = togglePin(journal, added.id);
  character.journal = editNote(journal, added.id, {}, stamp);
  return character;
}
