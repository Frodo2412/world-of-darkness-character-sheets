import { expect, type Page } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import {
  createCharacter,
  followAction,
  openRoster,
  rosterEntries,
  sheetAddress,
  sheetField,
  statusRegion,
} from './support/pages';
import { characterWith, saveCharacters } from './support/seed';
import { doneButton, ensureEditing, identityName, identityRegion, sheetRoot } from './support/sheet';
import { storedRecords } from './support/storage';
import { escaped } from './support/text';

async function enter(
  page: Page,
  entered: Map<string, string>,
  label: string,
  text: string,
): Promise<void> {
  await sheetField(page, label).fill(text);
  entered.set(label, text);
}

Given("a player viewing a new character's sheet", async ({ page }) => {
  await createCharacter(page);
});

Given("a player viewing a character's sheet", async ({ page }) => {
  await createCharacter(page);
});

Given('two saved characters', async ({ page, memory }) => {
  memory.saved = [characterWith({}), characterWith({})];
  await saveCharacters(page, memory.saved);
});

When(
  'they enter {string} as {word} and {string} as {word}',
  async ({ page, memory }, first: string, firstLabel: string, second: string, secondLabel: string) => {
    await enter(page, memory.entered, firstLabel, first);
    await enter(page, memory.entered, secondLabel, second);
  },
);

When('they reload the sheet', async ({ page }) => {
  await page.reload();
});

When('the player names the first one {string}', async ({ page, memory }, name: string) => {
  await page.goto(sheetAddress(memory.saved[0].id));
  await ensureEditing(page);
  await enter(page, memory.entered, 'Name', name);
});

Then(
  '{word} shows {string} and {word} shows {string}',
  async ({ page }, firstLabel: string, first: string, secondLabel: string, second: string) => {
    await ensureEditing(page);
    await expect(sheetField(page, firstLabel)).toHaveValue(first);
    await expect(sheetField(page, secondLabel)).toHaveValue(second);
  },
);

Then('both entries are kept exactly as typed and nothing is flagged', async ({ page, memory }) => {
  expect(memory.entered.size).toBe(2);
  for (const [label, text] of memory.entered) {
    await expect(sheetField(page, label)).toHaveValue(text);
  }
  await expect(page.locator('[aria-invalid="true"], :invalid')).toHaveCount(0);
  await expect(statusRegion(page)).toHaveCount(0);
});

Then("the second character's Name is still empty", async ({ page, memory }) => {
  await page.goto(sheetAddress(memory.saved[1].id));
  await ensureEditing(page);
  await expect(sheetField(page, 'Name')).toBeVisible();
  await expect(sheetField(page, 'Name')).toHaveValue('');
});

Given('no saved character has the id in the sheet address', async () => {
  // Storage starts empty, so no id matches.
});

When('the player opens that address', async ({ page }) => {
  await page.goto(sheetAddress('no-such-character'));
});

When('the player opens the sheet address with no character id', async ({ page }) => {
  await page.goto('/sheet/');
});

Then(
  'they see a "character not found" message with a link to the roster',
  async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Character not found' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Character sheet' })).toBeHidden();

    await page.getByRole('link', { name: 'Go to your characters' }).click();
    await expect(page.getByRole('heading', { name: 'Characters' })).toBeVisible();
  },
);

Then('the roster still lists no additional character', async ({ page }) => {
  await openRoster(page);
  await expect(page.getByText('No characters yet')).toBeVisible();
  await expect(rosterEntries(page)).toHaveCount(0);
});

// Chronicle on the sheet

/** Follows "<label>" for the character called `name` from the roster, and waits for the sheet. */
async function followFromRoster(page: Page, label: string, name: string): Promise<void> {
  await openRoster(page);
  await followAction(page, label, name);
}

async function editFromRoster(page: Page, name: string): Promise<void> {
  await followFromRoster(page, 'Edit character', name);
  await expect(doneButton(page)).toBeVisible();
}

Given(
  'a saved character named {string} with chronicle {string}',
  async ({ page, memory }, name: string, chronicle: string) => {
    await saveCharacters(page, [characterWith({ name, chronicle })]);
    memory.stored = await storedRecords(page);
  },
);

When('the player edits {string}', async ({ page }, name: string) => {
  await editFromRoster(page, name);
});

When(
  'the player edits {string} and enters the chronicle {string}',
  async ({ page, memory }, name: string, chronicle: string) => {
    await editFromRoster(page, name);
    await enter(page, memory.entered, 'Chronicle', chronicle);
  },
);

When('the player edits {string} and clears the chronicle', async ({ page, memory }, name: string) => {
  await editFromRoster(page, name);
  await enter(page, memory.entered, 'Chronicle', '');
});

When('the player edits {string} and leaves edit mode without typing', async ({ page }, name: string) => {
  await editFromRoster(page, name);
  await doneButton(page).click();
  await expect(doneButton(page)).toBeHidden();
});

When('they reload the sheet and edit it again', async ({ page }) => {
  await page.reload();
  await ensureEditing(page);
});

When('the player opens {string} in play mode', async ({ page }, name: string) => {
  await followFromRoster(page, 'Open sheet', name);
  await expect(sheetRoot(page)).toHaveAttribute('data-sheet-mode', 'play');
});

Then('the Chronicle field holds {string}', async ({ page }, chronicle: string) => {
  await expect(sheetField(page, 'Chronicle')).toBeVisible();
  await expect(sheetField(page, 'Chronicle')).toHaveValue(chronicle);
});

Then('the Chronicle field is empty', async ({ page }) => {
  await expect(sheetField(page, 'Chronicle')).toBeVisible();
  await expect(sheetField(page, 'Chronicle')).toHaveValue('');
});

/** The sheet is drawn once the character's data is: the identity shows a name, not the blank it starts as. */
async function expectSheetDrawn(page: Page): Promise<void> {
  await expect(identityRegion(page)).toBeVisible();
  await expect(identityName(page)).not.toHaveText(/^\s*$/);
}

Then('no Chronicle field is offered', async ({ page }) => {
  // An absent field is absent from the sheet and not just not yet drawn.
  await expectSheetDrawn(page);
  await expect(page.getByRole('textbox', { name: 'Chronicle', exact: true })).toHaveCount(0);
});

Then('{string} appears nowhere on the sheet', async ({ page }, text: string) => {
  await expectSheetDrawn(page);
  await expect(sheetRoot(page)).not.toContainText(new RegExp(escaped(text)));
  expect(await sheetRoot(page).ariaSnapshot()).not.toContain(text);
});
