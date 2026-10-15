import { expect } from '@playwright/test';
import { Given, Then, When, memoryFor, type ScenarioMemory } from './fixtures';
import { announcements } from './support/announcements';
import { characterArranged, saveCharacters } from './support/seed';
import { enterEditMode, openSavedSheet } from './support/sheet';
import { activePanel } from './support/tabs';
import { DESCRIPTION_FIELDS } from '../../src/domain/v20/journal/record/view';
import {
  addButton,
  controlNamed,
  DESCRIPTION_VALUES,
  emptyOf,
  entriesOf,
  factOf,
  fullRecord,
  partNamed,
  recordSection,
  showRecord,
  withRecord,
} from './support/journal-record';

// Step phrases for the Journal's character record. Those about the record name "the Journal record"
// or its parts, so none overlaps another tab's.

const HEADER = { name: 'Marguerite', clan: 'Toreador' };

interface RecordMemory {
  /** What the bond's rating field showed after each entry. */
  ratings: string[];
}

const record = (memory: ScenarioMemory): RecordMemory => memoryFor<RecordMemory>({ memory }, 'journal-record', () => ({ ratings: [] }));

// Arranging

Given('a character with gear, equipment, two blood bonds, a derangement, three goals and a description', async ({ page, memory }) => {
  memory.saved = [withRecord(characterArranged(HEADER, () => {}), fullRecord())];
  await saveCharacters(page, memory.saved);
});

Given('a character in edit mode with two goals', async ({ page, memory }) => {
  const character = characterArranged(HEADER, () => {});
  withRecord(character, {
    ...character.journal.record,
    goals: [
      { text: 'Uncover the owner of the portrait', kind: 'Story goal' },
      { text: 'Secure a domain over the gallery district', kind: 'Long-term goal' },
    ],
  });
  memory.saved = [character];
  await openSavedSheet(page, character);
  await enterEditMode(page);
});

Given('a character with an empty record', async ({ page, memory }) => {
  memory.saved = [characterArranged(HEADER, () => {})];
  await saveCharacters(page, memory.saved);
});

Given('a character in edit mode with a full record', async ({ page, memory }) => {
  const long = 'Supercalifragilisticexpialidocious'.repeat(2);
  memory.saved = [withRecord(characterArranged(HEADER, () => {}), fullRecord(long))];
  await openSavedSheet(page, memory.saved[0]);
  await enterEditMode(page);
});

// Acting

When('the Journal tab is opened in play mode', async ({ page, memory }) => {
  await openSavedSheet(page, memory.saved[0]);
  await showRecord(page, memory.saved[0].id);
});

When('the player adds a gear item, an equipment item, a blood bond, a derangement and a goal on the Journal record', async ({ page, memory }) => {
  await showRecord(page, memory.saved[0].id);
  await addButton(page, 'Add gear').click();
  await controlNamed(page, 'Gear 1 item').fill('Leather portfolio');
  await controlNamed(page, 'Gear 1 detail').fill('restoration documents');
  await addButton(page, 'Add equipment').click();
  await controlNamed(page, 'Equipment 1 item').fill('Voss Antiquities');
  await controlNamed(page, 'Equipment 1 detail').fill('gallery and cover');
  await addButton(page, 'Add blood bond').click();
  await controlNamed(page, 'Blood bond 1 bound to or by').fill('Lucien Delacroix');
  await controlNamed(page, 'Blood bond 1 relation').fill('Toreador patron');
  await controlNamed(page, 'Blood bond 1 rating').fill('2');
  await controlNamed(page, 'Blood bond 1 type').fill('Vinculum');
  await addButton(page, 'Add derangement').click();
  await controlNamed(page, 'Derangement 1 name').fill('Obsession · Art forgery');
  await controlNamed(page, 'Derangement 1 storyteller-agreed note').fill('Agreed with the Storyteller.');
  await addButton(page, 'Add goal').click();
  await controlNamed(page, 'Goal 1 goal text').fill('Uncover the true owner of the portrait');
  await controlNamed(page, 'Goal 1 kind').fill('Story goal');
});

When('sets every description field', async ({ page }) => {
  for (const { field, label } of DESCRIPTION_FIELDS) await controlNamed(page, label).fill(DESCRIPTION_VALUES[field]);
});

When('reloads the sheet', async ({ page, memory }) => {
  // The sheet saves as the player types; give the last edit its moment, then read it back as a reload would.
  await page.reload();
  await showRecord(page, memory.saved[0].id);
});

When('the player removes the first goal on the Journal record', async ({ page, memory }) => {
  await showRecord(page, memory.saved[0].id);
  await recordSection(page).getByRole('button', { name: 'Remove Uncover the owner of the portrait', exact: true }).click();
});

// "Undo" names the one shown notice on whichever tab is open (the record's removal, Level up's result), so the step is shared.
When('the player presses Undo', async ({ page }) => {
  await activePanel(page).getByRole('button', { name: 'Undo', exact: true }).click();
});

When('the player enters a bond rating of {int}, then {int}, on the Journal record', async ({ page, memory }, first: number, second: number) => {
  await showRecord(page, memory.saved[0].id);
  await addButton(page, 'Add blood bond').click();
  const rating = controlNamed(page, 'Blood bond 1 rating');
  for (const typed of [first, second]) {
    await rating.fill(String(typed));
    await rating.blur();
    record(memory).ratings.push(await rating.inputValue());
  }
});

// Checking

Then('Possessions, Blood Bonds & Vinculi, Derangements, Goals and Description show their entries', async ({ page }) => {
  for (const name of ['Possessions', 'Blood Bonds & Vinculi', 'Derangements', 'Goals', 'Description']) {
    await expect(partNamed(page, name)).toBeVisible();
  }
  const section = recordSection(page);
  await expect(section.getByText('Leather portfolio', { exact: true })).toBeVisible();
  await expect(section.getByText('Voss Antiquities', { exact: true })).toBeVisible();
  await expect(entriesOf(page, 'bloodBonds')).toHaveCount(2);
  await expect(entriesOf(page, 'derangements')).toHaveCount(1);
  await expect(entriesOf(page, 'goals')).toHaveCount(3);
  await expect(section.getByText('Obsession · Art forgery', { exact: true })).toBeVisible();
  await expect(factOf(page, 'apparentAge')).toHaveText('Late twenties');
  await expect(factOf(page, 'heightWeight')).toHaveText('168 cm · 54 kg');
});

Then('nothing in the Character record can be edited', async ({ page }) => {
  await expect(recordSection(page)).toBeVisible();
  await expect(recordSection(page).locator('input, textarea, select, [contenteditable]').filter({ visible: true })).toHaveCount(0);
  await expect(recordSection(page).getByRole('button', { name: /^(Add|Remove)\b/ })).toHaveCount(0);
});

Then('the read-only hint is shown in that section', async ({ page }) => {
  await expect(recordSection(page).getByText('Read-only in play · edit character to change', { exact: true })).toBeVisible();
});

Then('every entry and every description field is shown', async ({ page }) => {
  const section = recordSection(page);
  await expect(section.getByText('Leather portfolio', { exact: true })).toBeVisible();
  await expect(section.getByText('restoration documents', { exact: true })).toBeVisible();
  await expect(section.getByText('Voss Antiquities', { exact: true })).toBeVisible();
  await expect(section.getByText('Lucien Delacroix', { exact: true })).toBeVisible();
  await expect(section.getByText('Vinculum', { exact: true })).toBeVisible();
  await expect(entriesOf(page, 'bloodBonds').first().locator('.journal-bond-rating')).toHaveText('2');
  await expect(section.getByText('Obsession · Art forgery', { exact: true })).toBeVisible();
  await expect(section.getByText('Uncover the true owner of the portrait', { exact: true })).toBeVisible();
  for (const { field } of DESCRIPTION_FIELDS) await expect(factOf(page, field)).toHaveText(DESCRIPTION_VALUES[field]);
});

Then('one goal remains and "Removed" with its text and "Undo" is announced', async ({ page }) => {
  await expect(recordSection(page).locator('[data-list="goals"] > li')).toHaveCount(1);
  await expect.poll(() => announcements(page)).toContain('Removed Uncover the owner of the portrait. Undo');
  await expect(recordSection(page).getByRole('button', { name: 'Undo', exact: true })).toBeFocused();
});

Then('both goals are back in their order and focus is on the restored one', async ({ page }) => {
  await expect(recordSection(page).locator('[data-list="goals"] > li')).toHaveCount(2);
  await expect(controlNamed(page, 'Goal 1 goal text')).toHaveValue('Uncover the owner of the portrait');
  await expect(controlNamed(page, 'Goal 2 goal text')).toHaveValue('Secure a domain over the gallery district');
  await expect(controlNamed(page, 'Goal 1 goal text')).toBeFocused();
});

Then('the rating shows {int}, then {int}, and {string} is shown', async ({ page, memory }, first: number, second: number, message: string) => {
  expect(record(memory).ratings).toEqual([String(first), String(second)]);
  await expect(recordSection(page).locator('.journal-record-hint').filter({ visible: true })).toHaveText(message);
  await expect(controlNamed(page, 'Blood bond 1 rating')).toHaveAttribute('aria-describedby', 'journal-bond-hint-0');
  await expect.poll(() => announcements(page)).toContain(message);
});

Then('Possessions, Blood bonds, Derangements and Goals each show an empty-state message', async ({ page }) => {
  for (const key of ['gear', 'equipment', 'bloodBonds', 'derangements', 'goals']) await expect(emptyOf(page, key)).toBeVisible();
});

Then('Description shows each field as {string}', async ({ page }, text: string) => {
  for (const { field } of DESCRIPTION_FIELDS) await expect(factOf(page, field)).toHaveText(text);
});
