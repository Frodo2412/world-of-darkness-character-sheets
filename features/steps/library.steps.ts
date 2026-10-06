import { expect, type Locator, type Page } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import { buildWith, saveBuilds } from './support/builder';
import { controlNames, linkNames } from './support/accessibility';
import {
  SHEET_ADDRESS,
  actionName,
  createAction,
  creatorCard,
  currentEntry,
  entryAction,
  entryHeading,
  entryNamed,
  entrySlot,
  expectStoredEntriesListed,
  openRoster,
  openSheetOf,
  rosterEntries,
  rosterList,
  sheetAddress,
  sheetField,
  summaryRow,
  unreadableEntries,
} from './support/pages';
import {
  characterWith,
  inCreationOrder,
  saveCharacters,
  saveDamagedBuild,
  saveDamagedCharacter,
} from './support/seed';
import { editButton, identityName, sheetRoot } from './support/sheet';
import { storedRecords } from './support/storage';
import { escaped } from './support/text';

/** The entry a scenario has been talking about, or the only one on the roster. */
async function theEntry(page: Page, entry: Locator | undefined): Promise<Locator> {
  if (entry !== undefined) return entry;
  await expect(rosterEntries(page)).toHaveCount(1);
  return rosterEntries(page);
}

// Given

Given(
  'a saved character, a build in progress, an unreadable character and an unreadable build',
  async ({ page, memory }) => {
    await saveBuilds(page, [buildWith({ concept: { name: 'Beckett' }, clan: 'Gangrel' })]);
    await saveDamagedBuild(page);
    await saveCharacters(page, [characterWith({ name: 'Lucita', clan: 'Lasombra' })]);
    await saveDamagedCharacter(page);
    memory.stored = await storedRecords(page);
  },
);

Given(
  'a saved character {string} of clan {string}, generation {string}, concept {string}, nature {string}, demeanor {string} and chronicle {string}',
  async (
    { page },
    name: string,
    clan: string,
    generation: string,
    concept: string,
    nature: string,
    demeanor: string,
    chronicle: string,
  ) => {
    await saveCharacters(page, [
      characterWith({ name, clan, generation, concept, nature, demeanor, chronicle }),
    ]);
  },
);

Given('a saved character with nothing filled in', async ({ page }) => {
  await saveCharacters(page, [characterWith({})]);
});

Given(
  'a saved character named {string} with nature {string} and a chronicle of three spaces',
  async ({ page }, name: string, nature: string) => {
    await saveCharacters(page, [characterWith({ name, nature, chronicle: '   ' })]);
  },
);

Given('two saved characters with nothing filled in, one created after the other', async ({ page, memory }) => {
  memory.saved = inCreationOrder({}, {});
  await saveCharacters(page, memory.saved);
});

Given(
  'a build in progress named {string} of clan {string}, concept {string}, nature {string}, demeanor {string} and chronicle {string}',
  async ({ page }, name: string, clan: string, concept: string, nature: string, demeanor: string, chronicle: string) => {
    await saveBuilds(page, [buildWith({ clan, concept: { name, concept, nature, demeanor, chronicle } })]);
  },
);

Given(
  'a saved character named {string} of clan {string} with chronicle {string}',
  async ({ page }, name: string, clan: string, chronicle: string) => {
    await saveCharacters(page, [characterWith({ name, clan, chronicle })]);
  },
);

Given('the player has the roster open with one saved character', async ({ page }) => {
  await saveCharacters(page, [characterWith({ name: 'Lucita' })]);
  await openRoster(page);
  await expect(rosterEntries(page)).toHaveCount(1);
});

Given('a second character is saved from another page', async ({ page }) => {
  const other = await page.context().newPage();
  await saveCharacters(other, [characterWith({ name: 'Fatima' })]);
  await other.close();
});

// When

When('they follow {string} for {string}', async ({ page }, label: string, name: string) => {
  await page.getByRole('link', { name: actionName(label, name), exact: true }).click();
});

When("they open the character's sheet and come back", async ({ page }) => {
  await openSheetOf(rosterEntries(page));
  await expect(page).toHaveURL(SHEET_ADDRESS);
  await expect(editButton(page)).toBeVisible();
  await page.goBack();
  await expect(rosterEntries(page).first()).toBeVisible();
});

// The test browser keeps no back/forward cache, so the event a restored page receives is sent by hand.
When("the roster is restored from the browser's back and forward cache", async ({ page }) => {
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
});

When('they choose {string}', async ({ page }, name: string) => {
  await page.getByRole('button', { name, exact: true }).click();
});

// Then: the Character creator card

Then('the Character creator card is headed {string}', async ({ page }, title: string) => {
  await expect(creatorCard(page).getByRole('heading', { level: 2, name: title, exact: true })).toBeVisible();
});

Then('it names the stages {string}, {string} and {string}', async ({ page }, first: string, second: string, third: string) => {
  const stages = creatorCard(page).getByRole('listitem');
  await expect(stages).toContainText([first, second, third]);
  for (const stage of await stages.all()) await expect(stage).toBeVisible();
});

Then('it offers {string} and {string}', async ({ page }, primary: string, secondary: string) => {
  for (const name of [primary, secondary]) await expect(createAction(page, name)).toBeEnabled();
});

// Then: one entry

Then('the entry for {string} shows the monogram {string}', async ({ page, memory }, name: string, monogram: string) => {
  memory.entry = entryNamed(page, name);
  await expect(entrySlot(memory.entry, 'monogram')).toHaveText(monogram);
});

Then('it shows {string}', async ({ memory }, text: string) => {
  await expect(entrySlot(currentEntry(memory), 'summary')).toHaveText(text);
});

async function expectTemperament(entry: Locator, value: string, label: string): Promise<void> {
  await expect(entrySlot(entry, 'temperament-group')).toContainText(label);
  await expect(entrySlot(entry, 'temperament')).toHaveText(value);
}

Then('it shows {string} under {string}', async ({ memory }, value: string, label: string) => {
  await expectTemperament(currentEntry(memory), value, label);
});

Then('it shows the chronicle {string}', async ({ memory }, chronicle: string) => {
  await expect(entrySlot(currentEntry(memory), 'chronicle')).toHaveText(chronicle);
});

Then('it is not marked {string}', async ({ memory }, marker: string) => {
  await expect(currentEntry(memory)).not.toContainText(marker);
});

Then('the entry is named {string}', async ({ page, memory }, name: string) => {
  await expect(rosterEntries(page)).toHaveCount(1);
  memory.entry = entryNamed(page, name);
  await expect(memory.entry).toHaveCount(1);
});

Then('its monogram is empty', async ({ memory }) => {
  await expect(entrySlot(currentEntry(memory), 'monogram')).toHaveText('');
});

Then('it shows no summary line', async ({ memory }) => {
  await expect(entrySlot(currentEntry(memory), 'summary')).toBeHidden();
});

Then('it shows no summary line and no {string} label', async ({ memory }, label: string) => {
  await expect(entrySlot(currentEntry(memory), 'summary')).toBeHidden();
  await expect(currentEntry(memory).getByText(label)).toBeHidden();
});

Then('it shows no {string}', async ({ memory }, text: string) => {
  await expect(entrySlot(currentEntry(memory), 'temperament')).not.toContainText(text);
});

Then('the entry for {string} shows {string} under {string}', async ({ page, memory }, name: string, value: string, label: string) => {
  memory.entry = entryNamed(page, name);
  await expectTemperament(memory.entry, value, label);
});

Then(
  'the entry for {string} shows the monogram {string}, {string}, {string} and the chronicle {string}',
  async ({ page, memory }, name: string, monogram: string, summary: string, temperament: string, chronicle: string) => {
    memory.entry = entryNamed(page, name);
    await expect(entrySlot(memory.entry, 'monogram')).toHaveText(monogram);
    await expect(entrySlot(memory.entry, 'summary')).toHaveText(summary);
    await expect(entrySlot(memory.entry, 'temperament')).toHaveText(temperament);
    await expect(entrySlot(memory.entry, 'chronicle')).toHaveText(chronicle);
  },
);

Then(
  'the entry for {string} offers {string} and neither {string} nor {string}',
  async ({ page }, name: string, offered: string, first: string, second: string) => {
    const entry = entryNamed(page, name);
    await expect(entryAction(entry, offered)).toHaveCount(1);
    await expect(entryAction(entry, first)).toHaveCount(0);
    await expect(entryAction(entry, second)).toHaveCount(0);
  },
);

Then('the entry shows the text {string}, {string} and {string}', async ({ page, memory }, name: string, clan: string, chronicle: string) => {
  memory.entry = await theEntry(page, memory.entry);
  for (const text of [name, clan, chronicle]) await expect(memory.entry).toContainText(text);
});

Then('the entry contains no bold, italic or underlined element', async ({ page, memory }) => {
  const entry = await theEntry(page, memory.entry);
  await expect(entry.locator('b, i, u, strong, em')).toHaveCount(0);
});

Then('{string} appears nowhere on the page', async ({ page }, text: string) => {
  // Absence only means something once what the scenario saved is on the page.
  await expectStoredEntriesListed(page);
  await expect(page.locator('body')).not.toContainText(new RegExp(escaped(text)));
  expect(await page.locator('body').ariaSnapshot()).not.toContain(text);
});

// Then: the sheet an action opens

Then('the sheet for {string} is shown in play mode', async ({ page }, name: string) => {
  await expect(page).toHaveURL(SHEET_ADDRESS);
  await expect(sheetRoot(page)).toHaveAttribute('data-sheet-mode', 'play');
  await expect(identityName(page)).toHaveText(name);
});

Then('the sheet for {string} is shown in edit mode', async ({ page }, name: string) => {
  await expect(page).toHaveURL(SHEET_ADDRESS);
  await expect(sheetRoot(page)).toHaveAttribute('data-sheet-mode', 'edit');
  await expect(sheetField(page, 'Name')).toHaveValue(name);
});

// Then: actions named for their entry

async function expectFourDifferentActionNames(page: Page): Promise<void> {
  await expect(rosterEntries(page)).toHaveCount(2);
  const names = await linkNames(rosterList(page));
  expect(names).toHaveLength(4);
  expect(new Set(names).size).toBe(4);
}

Then('the open and edit actions of the two entries have four different accessible names', async ({ page }) => {
  await expectFourDifferentActionNames(page);
});

Then("each name includes its character's name", async ({ page }) => {
  await expect(rosterEntries(page)).toHaveCount(2);
  for (const entry of await rosterEntries(page).all()) {
    const name = (await entryHeading(entry).textContent())!;
    const names = await linkNames(entry);
    expect(names).toHaveLength(2);
    for (const linkName of names) expect(linkName).toContain(name);
  }
});

Then('the older entry is named {string} and the newer {string}', async ({ page, memory }, older: string, newer: string) => {
  const [first, second] = memory.saved;
  for (const [character, name] of [[first, older], [second, newer]] as const) {
    const entry = rosterEntries(page).filter({
      has: page.locator(`a[href^="${sheetAddress(character.id)}"]`),
    });
    await expect(entryHeading(entry)).toHaveText(name);
  }
});

Then('their open and edit actions have four different accessible names', async ({ page }) => {
  await expectFourDifferentActionNames(page);
});

// Then: what the roster lists

Then('the roster lists {string}', async ({ page }, name: string) => {
  await expect(entryNamed(page, name)).toHaveCount(1);
});

Then('the roster lists {string} as in progress', async ({ page }, name: string) => {
  await expect(entryNamed(page, name)).toHaveCount(1);
  await expect(entryNamed(page, name)).toContainText('In progress');
});

Then('the roster lists {string} as in progress with clan {string}', async ({ page }, name: string, clan: string) => {
  const entry = entryNamed(page, name);
  await expect(entry).toContainText('In progress');
  await expect(entrySlot(entry, 'summary')).toContainText(clan);
});

Then('the message that there are no characters yet is not shown', async ({ page }) => {
  await expect(page.getByText('No characters yet')).toBeHidden();
});

Then('the roster lists one unreadable character', async ({ page }) => {
  await expect(unreadableEntries(page, 'character')).toHaveCount(1);
});

Then('the roster lists one unreadable build', async ({ page }) => {
  await expect(unreadableEntries(page, 'build')).toHaveCount(1);
});

Then(
  "the roster lists one unreadable character with an explanation that includes its record's id",
  async ({ page, memory }) => {
    const entry = unreadableEntries(page, 'character');
    await expect(entry).toHaveCount(1);
    await expect(entrySlot(entry, 'explanation')).toBeVisible();
    await expect(entrySlot(entry, 'explanation')).toContainText('could not be read');
    await expect(entry).toContainText(memory.damaged!.id);
  },
);

/** An unreadable entry of either kind offers nothing to operate. */
async function expectNoActions(entries: Locator): Promise<void> {
  await expect(entries.locator('a, button, input, select, textarea, [tabindex]')).toHaveCount(0);
}

Then('the unreadable entry offers no action', async ({ page }) => {
  await expectStoredEntriesListed(page);
  const unreadable = [unreadableEntries(page, 'character'), unreadableEntries(page, 'build')];
  const found = (await Promise.all(unreadable.map((entries) => entries.count()))).reduce((a, b) => a + b);
  // Checking nothing would pass for the wrong reason.
  expect(found).toBeGreaterThan(0);
  for (const entries of unreadable) await expectNoActions(entries);
});

Then('the roster lists {int} entries', async ({ page }, count: number) => {
  await expect(rosterEntries(page)).toHaveCount(count);
});

Then('the summary row reads {string}', async ({ page }, text: string) => {
  await expect(summaryRow(page)).toHaveText(text);
});

Then('every stored record is exactly as it was', async ({ page, memory }) => {
  expect(await storedRecords(page)).toEqual(memory.stored);
});

// Then: nothing deletes

Then(
  'no control on the page has {string} or {string} in its accessible name',
  async ({ page }, first: string, second: string) => {
    // Absence only means something once what the scenario saved is on the page.
    await expectStoredEntriesListed(page);
    const names = await controlNames(page);

    // A page with nothing to operate would pass for the wrong reason.
    expect(names.length).toBeGreaterThan(0);
    const words = [first, second].map((word) => word.toLowerCase());
    expect(names.filter((name) => words.some((word) => name.toLowerCase().includes(word)))).toEqual([]);
  },
);

Then('the page contains no dialog', async ({ page }) => {
  await expect(page.locator('dialog, [role="dialog"], [role="alertdialog"]')).toHaveCount(0);
});
