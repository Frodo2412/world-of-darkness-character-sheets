import { expect } from '@playwright/test';
import type { V20Character } from '../../src/domain/v20/character';
import type { Haven } from '../../src/domain/v20/dossier/types';
import { Given, Then, When } from './fixtures';
import { announcements } from './support/announcements';
import { doneButton, editButton, savedCharacter } from './support/sheet';
import {
  addButton,
  backgroundCard,
  backgroundCards,
  backgroundsMemory,
  backgroundsPanel,
  cardsOf,
  countOf,
  countsShown,
  emptyOf,
  entryCard,
  entryNames,
  featuredEntry,
  field,
  indexEntries,
  indexEntryOf,
  nameField,
  openBackgroundsCharacter,
  playFace,
  reloadSheet,
  removeButton,
  saveBackgroundsCharacter,
  sectionNamed,
  showBackgrounds,
} from './support/backgrounds';

// The steps of the Backgrounds scenarios. Each one that is not shared names the tab ("on the
// Backgrounds tab"), so it never has the same words as a step of another tab.

// Arranging

Given(/^a character with (.+) on the Backgrounds tab$/, async ({ page, memory }, words: string) => {
  await saveBackgroundsCharacter(page, memory, words);
});

Given(/^a character in edit mode with (.+) on the Backgrounds tab$/, async ({ page, memory }, words: string) => {
  await openBackgroundsCharacter(page, memory, words, 'edit');
  const memorable = backgroundsMemory(memory);
  memorable.featured = featuredEntry(words);
  // "a merit of 2 points" is the one entry its section holds, which the steps that follow are about.
  const pointed = words.match(/^an? (merit|flaw) of \d+ points?$/);
  if (pointed !== null) memorable.featured = { section: pointed[1] === 'merit' ? 'Merits' : 'Flaws', name: pointed[1] === 'merit' ? 'Acute Sense' : 'Hunted' };
});

Given(/^a character in play mode with (.+) on the Backgrounds tab$/, async ({ page, memory }, words: string) => {
  await openBackgroundsCharacter(page, memory, words, 'play');
});

// Opening

When('the Backgrounds tab is chosen from the tab bar on the Backgrounds tab', async ({ page, memory }) => {
  await showBackgrounds(page, memory);
});

// What the cards show

Then(
  /^(\w+) shows (\d+) of 5 dots, the summary "([^"]*)" and the note "([^"]*)" on the Backgrounds tab$/,
  async ({ page }, name: string, dots: number, summary: string, note: string) => {
    const card = backgroundCard(page, name);
    await expect(card.getByRole('img', { name: `${name} ${dots} of 5` })).toBeVisible();
    await expect(card.getByText(summary, { exact: true })).toBeVisible();
    await expect(card.getByText(note, { exact: true })).toBeVisible();
  },
);

Then('{word} shows both people with their roles on the Backgrounds tab', async ({ page, memory }, name: string) => {
  const arranged = memory.saved[0].backgrounds.find((row) => row.name === name)?.people ?? [];
  expect(arranged).toHaveLength(2);
  const people = backgroundCard(page, name).getByRole('list', { name: 'People' }).getByRole('listitem');
  await expect(people).toHaveText(arranged.map((person) => `${person.name} ${person.role}`));
});

Then(/^(\w+) background cards are shown on the Backgrounds tab$/, async ({ page }, count: string) => {
  await expect(backgroundCards(page)).toHaveCount(countOf(count));
});

Then(/^the (.+) section shows "([^"]+)" on the Backgrounds tab$/, async ({ page }, section: string, message: string) => {
  await expect(emptyOf(page, section).getByText(message, { exact: true })).toBeVisible();
});

// Havens

/** The haven the scenario arranged, by name. */
const havenArranged = (memory: { saved: V20Character[] }, name: string): Haven =>
  memory.saved[0].havens.find((haven) => haven.name === name)!;

Then(
  /^"([^"]+)" shows its kind "([^"]+)", description, location, access and security on the Backgrounds tab$/,
  async ({ page, memory }, name: string, kind: string) => {
    const card = entryCard(page, 'Havens', name);
    await expect(playFace(card).getByText(kind, { exact: true })).toBeVisible();
    const haven = havenArranged(memory, name);
    for (const [label, value] of [
      ['Description', haven.description],
      ['Location', haven.location],
      ['Access', haven.access],
      ['Security', haven.security],
    ]) {
      expect(value, `the scenario gave ${name} no ${label.toLowerCase()}`).not.toBe('');
      await expect(card.locator('.backgrounds-detail').filter({ has: page.getByText(label, { exact: true }) }).locator('dd')).toHaveText(value);
    }
  },
);

Then(/^"([^"]+)" shows its kind "([^"]+)" on the Backgrounds tab$/, async ({ page }, name: string, kind: string) => {
  await expect(playFace(entryCard(page, 'Havens', name)).getByText(kind, { exact: true })).toBeVisible();
});

// Merits and Flaws

Then(/^the (Merits|Flaws) heading reads "([^"]+)" on the Backgrounds tab$/, async ({ page }, section: string, text: string) => {
  await expect(sectionNamed(page, section).locator('.dossier-heading-count')).toHaveText(text);
});

Then(
  /^the merits show "([^"]+)" and "([^"]+)" and each entry shows its category on the Backgrounds tab$/,
  async ({ page, memory }, first: string, second: string) => {
    const cards = cardsOf(page, 'Merits');
    await expect(cards).toHaveCount(2);
    for (const [place, points] of [first, second].entries()) {
      await expect(playFace(cards.nth(place)).getByText(points, { exact: true })).toBeVisible();
      await expect(playFace(cards.nth(place)).getByText(memory.saved[0].merits[place].category, { exact: true })).toBeVisible();
    }
  },
);

// Other traits and the notes card

Then(
  /^"([^"]+)" shows its kind "([^"]+)" and its note "([^"]+)" without dots on the Backgrounds tab$/,
  async ({ page }, name: string, kind: string, note: string) => {
    const card = playFace(entryCard(page, 'Other traits', name));
    await expect(card.getByText(kind, { exact: true })).toBeVisible();
    await expect(card.getByText(note, { exact: true })).toBeVisible();
    await expect(card.getByRole('img')).toHaveCount(0);
  },
);

Then('the note {string} is shown on the Backgrounds tab', async ({ page }, text: string) => {
  await expect(backgroundsPanel(page).getByText(text, { exact: true })).toBeVisible();
});

// The section index

When(/^the player switches to (play|edit) mode on the Backgrounds tab$/, async ({ page }, mode: string) => {
  await (mode === 'play' ? doneButton(page) : editButton(page)).click();
});

Then(/^the section index reads ((?:"[^"]+"(?:, | and )?)+) on the Backgrounds tab$/, async ({ page }, quoted: string) => {
  for (const [, entry] of quoted.matchAll(/"([^"]+)"/g)) {
    await expect(indexEntries(page).getByText(entry, { exact: true })).toBeVisible();
  }
});

Then('every count in the section index reads 0 on the Backgrounds tab', async ({ page }) => {
  await expect(indexEntries(page)).toHaveCount(5);
  for (const entry of await indexEntries(page).all()) await expect(entry).toHaveText(/ · 0$/);
});

// Editing

/** The section the entry a scenario features is in, and its name. */
const featured = (memory: Parameters<typeof backgroundsMemory>[0]): { section: string; name: string } => {
  const { featured: entry } = backgroundsMemory(memory);
  if (entry === undefined) throw new Error('the scenario featured no entry: its Given must say "one <kind> ... "');
  return entry;
};

/** The card of the background called `name`, in edit mode. */
const backgroundForm = (page: Parameters<typeof removeButton>[0], name: string) =>
  cardsOf(page, 'Backgrounds').filter({ has: removeButton(page, name) });

/** Leaves the field the way a player does, which commits a number. */
const leave = (input: ReturnType<typeof field>) => input.press('Tab');

When(/^the player adds the (merit|flaw) "([^"]+)" of (\d+) points on the Backgrounds tab$/, async ({ page, memory }, kind: string, name: string, points: number) => {
  await showBackgrounds(page, memory);
  const section = kind === 'merit' ? 'Merits' : 'Flaws';
  await addButton(page, section).click();
  const added = cardsOf(page, section).last();
  await nameField(added).fill(name);
  await field(added, /^Points/).fill(String(points));
  await leave(field(added, /^Points/));
});

When('the player adds the entry {string} to {string} on the Backgrounds tab', async ({ page, memory }, name: string, section: string) => {
  await showBackgrounds(page, memory);
  await addButton(page, section).click();
  await nameField(cardsOf(page, section).last()).fill(name);
});

When('the player adds the background {string} on the Backgrounds tab', async ({ page, memory }, name: string) => {
  await showBackgrounds(page, memory);
  await addButton(page, 'Backgrounds').click();
  await nameField(cardsOf(page, 'Backgrounds').last()).fill(name);
});

When('the player removes the flaw on the Backgrounds tab', async ({ page, memory }) => {
  await showBackgrounds(page, memory);
  await cardsOf(page, 'Flaws').getByRole('button', { name: /^Remove\b/ }).click();
});

When('the player removes it on the Backgrounds tab', async ({ page, memory }) => {
  await showBackgrounds(page, memory);
  await removeButton(page, featured(memory).name).click();
});

When('the player removes {string} on the Backgrounds tab', async ({ page, memory }, name: string) => {
  await showBackgrounds(page, memory);
  await removeButton(page, name).click();
});

When('the player removes the seventh on the Backgrounds tab', async ({ page, memory }) => {
  await showBackgrounds(page, memory);
  await cardsOf(page, 'Backgrounds').nth(6).getByRole('button', { name: /^Remove\b/ }).click();
});

When('the player presses Undo on the Backgrounds tab', async ({ page }) => {
  await backgroundsPanel(page).getByRole('button', { name: 'Undo', exact: true }).click();
});

When(/^the player enters (-?\d+) points on the Backgrounds tab$/, async ({ page, memory }, points: number) => {
  await showBackgrounds(page, memory);
  const points_ = field(cardsOf(page, featured(memory).section).first(), /^Points/);
  await points_.fill(String(points));
  await leave(points_);
});

When(/^the player sets (\w+) to (\d+) on the Backgrounds tab$/, async ({ page, memory }, name: string, rating: number) => {
  await showBackgrounds(page, memory);
  const rated = field(backgroundForm(page, name), /^Rating/);
  await rated.fill(String(rating));
  await leave(rated);
});

When(
  /^the player sets (\w+) to (\d+) and its summary to "([^"]*)" on the Backgrounds tab$/,
  async ({ page, memory }, name: string, rating: number, summary: string) => {
    await showBackgrounds(page, memory);
    const card = backgroundForm(page, name);
    await field(card, /^Rating/).fill(String(rating));
    await leave(field(card, /^Rating/));
    await field(card, 'Summary').fill(summary);
  },
);

When('the sheet is reloaded on the Backgrounds tab', async ({ page }) => {
  await reloadSheet(page);
});

When(/^the player adds the person "([^"]+)" \(([^)]+)\) to (\w+) on the Backgrounds tab$/, async ({ page, memory }, person: string, role: string, name: string) => {
  await showBackgrounds(page, memory);
  const card = backgroundForm(page, name);
  await card.getByRole('button', { name: 'Add person', exact: true }).click();
  const row = card.locator('[data-person-edit]').last();
  await field(row, 'Person name').fill(person);
  await field(row, 'Role').fill(role);
});

When(/^the player takes the person "([^"]+)" off (\w+) on the Backgrounds tab$/, async ({ page }, person: string, name: string) => {
  for (const row of await backgroundForm(page, name).locator('[data-person-edit]').all()) {
    if ((await field(row, 'Person name').inputValue()) === person) await row.getByRole('button', { name: 'Remove person', exact: true }).click();
  }
});

// What editing shows

Then('six background rows are shown, four of them empty on the Backgrounds tab', async ({ page }) => {
  const rows = cardsOf(page, 'Backgrounds');
  await expect(rows).toHaveCount(6);
  const names = await Promise.all((await nameField(rows).all()).map((input) => input.inputValue()));
  expect(names.filter((name) => name === '')).toHaveLength(4);
});

Then(/^(\w+) background rows are shown on the Backgrounds tab$/, async ({ page }, count: string) => {
  await expect(cardsOf(page, 'Backgrounds')).toHaveCount(countOf(count));
});

Then('an {string} control is shown on the Backgrounds tab', async ({ page }, label: string) => {
  await expect(backgroundsPanel(page).getByRole('button', { name: label, exact: true })).toBeVisible();
});

Then('that row says {string} on the Backgrounds tab', async ({ page }, text: string) => {
  await expect(backgroundsPanel(page).getByText(text, { exact: true }).filter({ visible: true })).toHaveCount(1);
});

Then('that row is not shown on the Backgrounds tab', async ({ page }) => {
  await expect(backgroundsPanel(page).getByText('Name needed to show in play mode', { exact: true }).filter({ visible: true })).toHaveCount(0);
  await expect(backgroundCards(page)).toHaveCount(0);
});

Then(
  'the Havens, Merits, Flaws and Other traits sections show the same messages with an Add control on the Backgrounds tab',
  async ({ page }) => {
    for (const [section, message, add] of [
      ['Havens', 'No havens yet.', 'Add haven'],
      ['Merits', 'No merits yet.', 'Add merit'],
      ['Flaws', 'No flaws yet.', 'Add flaw'],
      ['Other traits', 'No other traits yet.', 'Add other trait'],
    ]) {
      await expect(emptyOf(page, section).getByText(message, { exact: true })).toBeVisible();
      await expect(addButton(page, section)).toHaveText(add);
    }
  },
);

Then('the Backgrounds section shows six empty rows on the Backgrounds tab', async ({ page }) => {
  const rows = cardsOf(page, 'Backgrounds');
  await expect(rows).toHaveCount(6);
  for (const input of await nameField(rows).all()) await expect(input).toHaveValue('');
});

Then('{string} lists two entries on the Backgrounds tab', async ({ page, memory }, section: string) => {
  await expect(cardsOf(page, section)).toHaveCount(2);
  backgroundsMemory(memory).before = await entryNames(page, section);
});

Then(
  '{string} lists the same two entries and the index reads {string} after a reload on the Backgrounds tab',
  async ({ page, memory }, section: string, index: string) => {
    const { before } = backgroundsMemory(memory);
    await reloadSheet(page);
    expect(await entryNames(page, section)).toEqual(before);
    await expect(indexEntries(page).getByText(index, { exact: true })).toBeVisible();
  },
);

Then('the {word} heading and the section index are the same after a reload on the Backgrounds tab', async ({ page }, section: string) => {
  const before = await countsShown(page, section);
  expect(before.every((shown) => shown !== '')).toBe(true);
  await reloadSheet(page);
  expect(await countsShown(page, section)).toEqual(before);
});

Then(
  'seven rows, {string} among them, and the index are the same after a reload on the Backgrounds tab',
  async ({ page }, name: string) => {
    const before = await entryNames(page, 'Backgrounds');
    expect(before).toHaveLength(7);
    expect(before).toContain(name);
    const index = await indexEntryOf(page, 'Expanded backgrounds');
    await reloadSheet(page);
    expect(await entryNames(page, 'Backgrounds')).toEqual(before);
    expect(await indexEntryOf(page, 'Expanded backgrounds')).toEqual(index);
  },
);

// Removing and putting back

Then('the section shows {string} on the Backgrounds tab', async ({ page, memory }, message: string) => {
  await expect(emptyOf(page, featured(memory).section).getByText(message, { exact: true })).toBeVisible();
});

Then('{string} is announced and focus is on the Undo button on the Backgrounds tab', async ({ page }, text: string) => {
  await expect.poll(() => announcements(page)).toContain(text);
  await expect(backgroundsPanel(page).getByRole('button', { name: 'Undo', exact: true })).toBeFocused();
});

Then('the flaw {string} is back with its category, 1 point and note, and focus is on it on the Backgrounds tab', async ({ page, memory }, name: string) => {
  const arranged = memory.saved[0].flaws.find((flaw) => flaw.name === name)!;
  const card = cardsOf(page, 'Flaws').filter({ has: removeButton(page, name) });
  await expect(card).toHaveCount(1);
  await expect(field(card, /^Category/)).toHaveValue(arranged.category);
  await expect(field(card, /^Points/)).toHaveValue(String(arranged.points));
  await expect(field(card, 'Note')).toHaveValue(arranged.note);
  await expect(nameField(card)).toBeFocused();
});

Then('the entry is back with every field and focus is on it on the Backgrounds tab', async ({ page, memory }) => {
  const { section, name } = featured(memory);
  const card = cardsOf(page, section).filter({ has: removeButton(page, name) });
  await expect(card).toHaveCount(1);
  const saved = memory.saved[0];
  const arranged: Record<string, string> = Object.fromEntries(
    Object.entries(
      [...saved.havens, ...saved.merits, ...saved.otherTraits].find((entry) => entry.name === name)!,
    ).map(([key, value]) => [key, String(value)]),
  );
  for (const [key, value] of Object.entries(arranged)) {
    await expect(card.locator(`[data-edit="${key}"]`), `the field "${key}" of ${name}`).toHaveValue(value);
  }
  await expect(nameField(card)).toBeFocused();
});

Then('the section index reads {string} and it is the same after a reload on the Backgrounds tab', async ({ page }, entry: string) => {
  await expect(indexEntries(page).getByText(entry, { exact: true })).toBeVisible();
  await reloadSheet(page);
  await expect(indexEntries(page).getByText(entry, { exact: true })).toBeVisible();
});

Then(
  'the second row is blank: no name, rating 0, no summary, no note and no people on the Backgrounds tab',
  async ({ page, memory }) => {
    const row = cardsOf(page, 'Backgrounds').nth(1);
    await expect(nameField(row)).toHaveValue('');
    await expect(field(row, /^Rating/)).toHaveValue('0');
    await expect(field(row, 'Summary')).toHaveValue('');
    await expect(field(row, 'Note')).toHaveValue('');
    await expect(row.locator('[data-person-edit]')).toHaveCount(0);
    expect((await savedCharacter(page, memory.saved[0].id)).backgrounds[1]).toEqual({ name: '', rating: 0 });
  },
);

Then('five background cards are shown and none of them is {string} on the Backgrounds tab', async ({ page }, name: string) => {
  await expect(backgroundCards(page)).toHaveCount(5);
  await expect(backgroundCard(page, name)).toHaveCount(0);
});

Then(
  'the second row holds {string}, rating {int}, the summary, the note and the person {string} \\({word}) again on the Backgrounds tab',
  async ({ page, memory }, name: string, rating: number, person: string, role: string) => {
    const row = cardsOf(page, 'Backgrounds').nth(1);
    const arranged = memory.saved[0].backgrounds[1];
    await expect(nameField(row)).toHaveValue(name);
    await expect(field(row, /^Rating/)).toHaveValue(String(rating));
    await expect(field(row, 'Summary')).toHaveValue(arranged.summary!);
    await expect(field(row, 'Note')).toHaveValue(arranged.note!);
    await expect(row.locator('[data-person-edit]')).toHaveCount(1);
    await expect(field(row.locator('[data-person-edit]'), 'Person name')).toHaveValue(person);
    await expect(field(row.locator('[data-person-edit]'), 'Role')).toHaveValue(role);
  },
);

Then('focus is on that row on the Backgrounds tab', async ({ page }) => {
  await expect(nameField(cardsOf(page, 'Backgrounds').nth(1))).toBeFocused();
});

Then('six rows are stored before and after a reload on the Backgrounds tab', async ({ page, memory }) => {
  const stored = async (): Promise<number> => (await savedCharacter(page, memory.saved[0].id)).backgrounds.length;
  expect(await stored()).toBe(6);
  await reloadSheet(page);
  expect(await stored()).toBe(6);
});

Then('the seventh is as it was on the Backgrounds tab', async ({ page, memory }) => {
  const arranged = memory.saved[0].backgrounds[6];
  const row = cardsOf(page, 'Backgrounds').nth(6);
  await expect(nameField(row)).toHaveValue(arranged.name);
  await expect(field(row, /^Rating/)).toHaveValue(String(arranged.rating));
});

// Corrections

Then('the points show 0 and {string} is shown on the Backgrounds tab', async ({ page, memory }, message: string) => {
  const card = cardsOf(page, featured(memory).section).first();
  await expect(field(card, /^Points/)).toHaveValue('0');
  await expect(card.getByText(message, { exact: true })).toBeVisible();
});

Then('the points are still 0 after a reload on the Backgrounds tab', async ({ page, memory }) => {
  await reloadSheet(page);
  expect((await savedCharacter(page, memory.saved[0].id))[featured(memory).section === 'Merits' ? 'merits' : 'flaws'][0].points).toBe(0);
  await expect(cardsOf(page, featured(memory).section).first().getByText('0 pts', { exact: true })).toBeVisible();
});

Then(/^(\w+) shows its rating as (\d+) and "([^"]+)" is shown on the Backgrounds tab$/, async ({ page }, name: string, rating: number, message: string) => {
  const card = cardsOf(page, 'Backgrounds').filter({ has: removeButton(page, name) });
  await expect(field(card, /^Rating/)).toHaveValue(String(rating));
  await expect(card.getByText(message, { exact: true })).toBeVisible();
});

Then(/^(\w+) shows (\d+) of 5 dots and the summary "([^"]*)" on the Backgrounds tab$/, async ({ page }, name: string, dots: number, summary: string) => {
  const card = backgroundCard(page, name);
  await expect(card.getByRole('img', { name: `${name} ${dots} of 5` })).toBeVisible();
  await expect(card.getByText(summary, { exact: true })).toBeVisible();
});

Then(/^(\w+) shows the person "([^"]+)" \(([^)]+)\) on the Backgrounds tab$/, async ({ page }, name: string, person: string, role: string) => {
  await expect(backgroundCard(page, name).getByRole('listitem').filter({ hasText: person })).toHaveText(`${person} ${role}`);
});

Then('{word} shows no people on the Backgrounds tab', async ({ page }, name: string) => {
  await expect(backgroundCard(page, name).getByRole('list', { name: 'People' })).toBeHidden();
});
