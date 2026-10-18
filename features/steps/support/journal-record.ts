import { expect, type Locator, type Page } from '@playwright/test';
import type { V20Character } from '../../../src/domain/v20/character';
import type { CharacterRecord, Description } from '../../../src/domain/v20/journal/types';
import { DESCRIPTION_FIELDS } from '../../../src/domain/v20/journal/record/view';
import { journalPanel, showJournal } from './journal';

// This file is the one place that knows the Journal record's markup: the steps ask for the parts, the
// entries and the controls through the functions below.

export const recordSection = (page: Page): Locator => journalPanel(page).locator('[data-journal-section="record"]');

/** The heading of one of the record's five parts. */
export const partNamed = (page: Page, name: string | RegExp): Locator => recordSection(page).getByRole('heading', { name });

/** The entries of a list, as drawn (a blank one is not shown in play). */
export const entriesOf = (page: Page, key: string): Locator => recordSection(page).locator(`[data-list="${key}"] > li`).filter({ visible: true });

/** An Add control, by its name: "Add gear". */
export const addButton = (page: Page, name: string): Locator => recordSection(page).getByRole('button', { name, exact: true });

/** A control of an entry, by the name assistive technology gives it: "Gear 1 item". */
export const controlNamed = (page: Page, name: string): Locator => recordSection(page).getByLabel(name, { exact: true });

/** The empty-state message of a list. */
export const emptyOf = (page: Page, key: string): Locator => recordSection(page).locator(`[data-empty="${key}"]`);

/** The value shown for a description field in play mode. */
export const factOf = (page: Page, field: keyof Description): Locator => recordSection(page).locator(`[data-fact="${field}"]`);

/** Shows the Journal and waits for its record. */
export async function showRecord(page: Page, id: string): Promise<void> {
  await showJournal(page, id);
  await expect(recordSection(page)).toBeVisible();
}

/** The record the "full" Givens use: every part holds something. */
export function fullRecord(long = ''): CharacterRecord {
  const word = (text: string): string => (long === '' ? text : `${text} ${long}`);
  return {
    gear: [
      { item: word('Leather portfolio'), detail: 'restoration documents' },
      { item: 'Ivory-handled letter knife', detail: 'concealed' },
    ],
    equipment: [
      { item: word('Voss Antiquities'), detail: 'gallery & cover' },
      { item: 'Restoration workshop', detail: 'above gallery' },
    ],
    bloodBonds: [
      { name: word('Lucien Delacroix'), relation: 'Toreador patron · she is bound to him', rating: 2, type: 'Blood Bond' },
      { name: 'Henri Marchand', relation: 'Gallery caretaker', rating: 3, type: 'Blood Bond' },
    ],
    derangements: [{ name: word('Obsession · Art forgery'), status: 'Active', note: 'An obsession with detecting, acquiring or exposing forgeries.' }],
    goals: [
      { text: word('Uncover the true owner of the portrait'), kind: 'Story goal · Session 12' },
      { text: 'Strengthen standing at Elysium', kind: 'Long-term goal' },
      { text: 'Locate the remaining works', kind: 'Personal goal' },
    ],
    description: {
      apparentAge: 'Late twenties',
      dateOfBirth: '14 March 1887',
      rip: '2 November 1914',
      hair: 'Deep auburn, pinned',
      eyes: 'Pale grey',
      nationality: 'Belgian (naturalised French)',
      heightWeight: '168 cm · 54 kg',
      sex: 'Female',
    },
  };
}

/** The character with this record. */
export function withRecord(character: V20Character, record: CharacterRecord): V20Character {
  character.journal = { ...character.journal, record };
  return character;
}

/** What each description field is set to when a scenario fills them all in: a value that names its field. */
export const DESCRIPTION_VALUES: Readonly<Record<keyof Description, string>> = Object.fromEntries(
  DESCRIPTION_FIELDS.map(({ field, label }) => [field, `${label} value`]),
) as Record<keyof Description, string>;
