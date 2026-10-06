import { expect, type Page } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import {
  createCharacter,
  entryNamed,
  openRoster,
  openSheetOf,
  rosterEntries,
  sheetAddress,
  sheetField,
} from './support/pages';
import { rating, setRating } from './support/ratings';
import { characterWith, saveCharacters } from './support/seed';
import { ensureEditing, identityName } from './support/sheet';
import {
  acceptWrites,
  overwriteRecord,
  refuseWrites,
  storedText,
  withholdStorage,
} from './support/storage';

const NOT_JSON = '{"id": "broken", "header": {"name": "Fat';

const unreadableEntries = (page: Page) =>
  rosterEntries(page).filter({ hasText: 'Unreadable character' });

Given("Fatima's saved data has become unreadable", async ({ page, memory }) => {
  const fatima = memory.saved.find((character) => character.header.name === 'Fatima')!;
  memory.damaged = { id: fatima.id, ...(await overwriteRecord(page, fatima.id, NOT_JSON)) };
});

Given('a saved character whose data has become unreadable', async ({ page, memory }) => {
  const character = characterWith({ name: 'Fatima' });
  await saveCharacters(page, [character]);
  memory.damaged = { id: character.id, ...(await overwriteRecord(page, character.id, NOT_JSON)) };
});

Given('a saved record that is readable but is not a V20 character', async ({ page, memory }) => {
  const character = characterWith({});
  await saveCharacters(page, [character]);
  const record = await overwriteRecord(page, character.id, JSON.stringify({ hello: 'world' }));
  memory.damaged = { id: character.id, ...record };
});

When('the player opens the roster and then reloads it', async ({ page }) => {
  await openRoster(page);
  await page.reload();
});

When('the player opens its sheet address', async ({ page, memory }) => {
  await page.goto(sheetAddress(memory.damaged!.id));
});

Then('{string} is listed and can be opened', async ({ page }, name: string) => {
  await openSheetOf(entryNamed(page, name));
  await expect(identityName(page)).toHaveText(name);
});

Then('one entry is reported as an unreadable character', async ({ page }) => {
  await openRoster(page);
  await expect(unreadableEntries(page)).toHaveCount(1);
  await expect(rosterEntries(page)).toHaveCount(2);
});

Then('the unreadable entry is still reported', async ({ page }) => {
  await expect(unreadableEntries(page)).toHaveCount(1);
});

Then('its saved data is unchanged', async ({ page, memory }) => {
  expect(await storedText(page, memory.damaged!.key)).toBe(memory.damaged!.text);
});

Then('that entry is reported as an unreadable character', async ({ page }) => {
  await expect(unreadableEntries(page)).toHaveCount(1);
});

Then('creating a new character still works', async ({ page, memory }) => {
  await page.getByRole('button', { name: 'New V20 character' }).click();
  await expect(sheetField(page, 'Name')).toBeEditable();

  await openRoster(page);
  await expect(rosterEntries(page)).toHaveCount(2);
  await expect(unreadableEntries(page)).toHaveCount(1);
  expect(await storedText(page, memory.damaged!.key)).toBe(memory.damaged!.text);
});

Then(
  'they see that the character could not be read, with a link to the roster',
  async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Character could not be read' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Character sheet' })).toBeHidden();
    await expect(page.getByRole('link', { name: 'Go to your characters' })).toBeVisible();
  },
);

const savingProblem = (page: Page) => page.getByRole('alert').filter({ hasText: /changes not saved/i });

async function change(page: Page, entered: Map<string, string>, label: string, text: string) {
  await sheetField(page, label).fill(text);
  entered.set(label, text);
}

Given('the browser will not accept further saved data', async ({ page }) => {
  await refuseWrites(page);
});

Given('the "changes not saved" message is shown', async ({ page, memory }) => {
  await createCharacter(page);
  await refuseWrites(page);
  await change(page, memory.entered, 'Name', 'Lucita');
  await expect(savingProblem(page)).toBeVisible();
});

Given('the browser provides no storage to the page', async ({ page }) => {
  await withholdStorage(page);
});

When("they change the character's Name", async ({ page, memory }) => {
  await change(page, memory.entered, 'Name', 'Lucita');
});

When(
  'the browser accepts saved data again and the player makes another change',
  async ({ page, memory }) => {
    await acceptWrites(page);
    await change(page, memory.entered, 'Clan', 'Lasombra');
  },
);

Then('a "changes not saved" message is shown', async ({ page }) => {
  await expect(savingProblem(page)).toBeVisible();
});

Then('they can keep editing the sheet', async ({ page, memory }) => {
  await change(page, memory.entered, 'Clan', 'Lasombra');
  await setRating(rating(page, 'Strength'), 3);

  for (const [label, text] of memory.entered) {
    await expect(sheetField(page, label)).toHaveValue(text);
  }
  await expect(savingProblem(page)).toBeVisible();
});

Then('the message is no longer shown', async ({ page }) => {
  await expect(savingProblem(page)).toBeHidden();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

Then('after a reload the latest values are shown', async ({ page, memory }) => {
  await page.reload();
  await ensureEditing(page);
  expect(memory.entered.size).toBe(2);
  for (const [label, text] of memory.entered) {
    await expect(sheetField(page, label)).toHaveValue(text);
  }
});

Then('they see that characters cannot be saved in this browser', async ({ page }) => {
  await expect(page.getByRole('alert')).toContainText('cannot be saved in this browser');
  await expect(page.getByRole('button', { name: 'New V20 character' })).toBeDisabled();
});

Given(
  'the roster is open and the browser will not accept further saved data',
  async ({ page }) => {
    await openRoster(page);
    await refuseWrites(page);
  },
);

When('the player opens a sheet address', async ({ page }) => {
  await page.goto(sheetAddress('any-character'));
});

When('they try to create a V20 character', async ({ page }) => {
  await page.getByRole('button', { name: 'New V20 character' }).click();
});

Then(
  'they see on the sheet page that characters cannot be saved in this browser',
  async ({ page }) => {
    await expect(page.getByRole('alert')).toContainText('cannot be saved in this browser');
    await expect(page.getByRole('heading', { name: 'Character sheet' })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Character not found' })).toBeHidden();
  },
);

Then('they see that the new character could not be saved', async ({ page }) => {
  await expect(page.getByRole('alert')).toContainText('could not be saved');
  await expect(page).toHaveURL(/\/$/);
});
