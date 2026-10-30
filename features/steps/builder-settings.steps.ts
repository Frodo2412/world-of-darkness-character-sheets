// Creation settings: the dialog that holds base generation and extra freebie points, and the
// builder-wide behaviour that was first described with them (an unknown or damaged build, a
// browser that refuses to save, the roster's build action).

import { expect, type Page } from '@playwright/test';
import { GENERATION_TABLE, STANDARD_FREEBIE_BUDGET } from '../../src/domain/v20/creation/rules';
import { creation, extra, freebie, generation } from '../../src/domain/v20/creation/testing/play';
import { Given, Then, When, memoryFor } from './fixtures';
import { watchWrites, writtenTexts } from './support/announcements';
import { expectUniqueControlNames, violationsOnPage } from './support/accessibility';
import { escaped } from './support/text';
import {
  BUILD_KEY_PREFIX,
  baseGeneration,
  builderAddress,
  builderHeading,
  closeCreationSettings,
  creationSettingsButton,
  enterExtraFreebies,
  extraFreebies,
  openBuildId,
  openCreationSettings,
  openPlayed,
  readout,
  reloadBuilder,
  setBaseGeneration,
  settingsDialog,
  startBuild,
  stepHeading,
  stepLink,
  stepNav,
  storedBuild,
} from './support/builder';
import { expectRated, groupNotice, requestRating, traitRating } from './support/ranked';
import { buildEntries, characterEntries, createAction, horizontalOverflow, openRoster, rosterList } from './support/pages';
import { saveDamagedBuild } from './support/seed';
import {
  acceptWrites,
  refuseWrites,
  storedKeys,
  storedText,
  withholdStorage,
} from './support/storage';

// The top bar's alert; while the settings dialog is open it has an alert of its own as well.
const notSaved = (page: Page) =>
  page.locator('[data-autosave-alert]').filter({ hasText: 'Changes are not being saved' });

// Given

// One way of starting a build, said as each feature words it.
const startedBuild = async ({ page }: { page: Page }): Promise<void> => startBuild(page);

Given('a player who has started building a character', startedBuild);

Given('a saved build whose data has been damaged', async ({ page, memory }) => {
  memory.damaged = await saveDamagedBuild(page);
});

Given('the browser has started refusing to store data', async ({ page }) => {
  await refuseWrites(page);
});

Given('a player whose last change could not be saved', async ({ page }) => {
  await startBuild(page);
  await refuseWrites(page);
  await setBaseGeneration(page, '10th');
  await expect(notSaved(page)).toBeVisible();
});

Given('the browser accepts stored data again', async ({ page }) => {
  await acceptWrites(page);
});

// The record is removed from this page's own storage, so no storage event
// reaches it: the builder learns of the deletion only when it next saves.
Given('the same build has been removed in another tab', async ({ page }) => {
  const key = BUILD_KEY_PREFIX + openBuildId(page);
  await page.evaluate((k) => window.localStorage.removeItem(k), key);
});

Given('a browser that does not allow stored data', async ({ page }) => {
  await withholdStorage(page);
});

// When

When('they start building a character', async ({ page }) => {
  await startBuild(page);
});

When('they set the base generation to {string}', async ({ page }, label: string) => {
  await setBaseGeneration(page, label);
  await closeCreationSettings(page);
});

When('they set the extra freebie points to {int}', async ({ page }, value: number) => {
  await enterExtraFreebies(page, String(value));
  await closeCreationSettings(page);
});

When(
  'their entry {string} as the extra freebie points is rejected',
  async ({ page }, entry: string) => {
    await enterExtraFreebies(page, entry);
    await expect(extraFreebies(page)).toHaveAttribute('aria-invalid', 'true');
  },
);

When('they reload the builder', async ({ page }) => {
  await reloadBuilder(page);
});

When(
  /^they open the builder address (of a build that does not exist|with no build id)$/,
  async ({ page }, address: string) => {
    await page.goto(address === 'with no build id' ? '/build/' : builderAddress('no-such-build'));
  },
);

When('the player opens that build', async ({ page, memory }) => {
  await page.goto(builderAddress(memory.damaged!.id));
});

// Then

Then('the base generation is {string}', async ({ page }, label: string) => {
  await openCreationSettings(page);
  await expect(baseGeneration(page).locator('option:checked')).toHaveText(label);
});

Then('reloading the builder shows the base generation {string}', async ({ page }, label: string) => {
  await reloadBuilder(page);
  await openCreationSettings(page);
  await expect(baseGeneration(page).locator('option:checked')).toHaveText(label);
});

// Captured numbers arrive as numbers, whatever the parameter's declared type.
Then(/^the freebie budget is (?:still )?(\d+)$/, async ({ page }, budget: number) => {
  await openCreationSettings(page);
  await expect(readout(page, 'Freebie pool')).toHaveText(String(budget));
});

Then('the blood points per turn are {int}', async ({ page }, value: number) => {
  await openCreationSettings(page);
  await expect(readout(page, 'Blood points per turn')).toHaveText(String(value));
});

Then('they can still set the extra freebie points to {int}', async ({ page }, value: number) => {
  await enterExtraFreebies(page, String(value));
  await expect(readout(page, 'Freebie pool')).toHaveText(String(STANDARD_FREEBIE_BUDGET + value));
  await closeCreationSettings(page);
});

Then('the roster lists no characters', async ({ page }) => {
  await openRoster(page);
  // Anchor first: a page still loading shows no entry either.
  await expect(page.getByRole('heading', { level: 1, name: 'Characters' })).toBeVisible();
  // The page keeps the list or the empty message in the markup and shows one of them.
  await expect(rosterList(page).or(page.getByText('No characters yet')).filter({ visible: true })).toBeVisible();
  // A build in progress is an entry of its own, so the library is not empty; it holds no character.
  await expect(characterEntries(page)).toHaveCount(0);
});

Then('they see a way to build a character', async ({ page }) => {
  await expect(createAction(page, 'Start character creator')).toBeEnabled();
});

Then('they see a "build not found" message with a link to the roster', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Build not found' })).toBeVisible();
  await expect(builderHeading(page)).toBeHidden();
  await expect(page.getByRole('link', { name: 'Go to your characters' })).toBeVisible();
  // A modal dialog left open behind the message would make the link unreachable.
  await page.getByRole('link', { name: 'Go to your characters' }).click({ trial: true });
});

Then('no build has been saved', async ({ page }) => {
  expect(await storedKeys(page, BUILD_KEY_PREFIX)).toEqual([]);
});

Then('they are told the build could not be read and has not been changed', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Build could not be read' })).toBeVisible();
  await expect(page.getByText('It has not been changed.')).toBeVisible();
  await expect(builderHeading(page)).toBeHidden();
});

Then(
  'they are offered a link to the roster to build a new one',
  async ({ page }) => {
    await expect(page.getByText(/You can build a new character/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Go to your characters' })).toBeVisible();
  },
);

Then('the damaged data is exactly as it was', async ({ page, memory }) => {
  expect(await storedText(page, memory.damaged!.key)).toBe(memory.damaged!.text);
});

Then(
  'they are told changes are not being saved and not to close or reload the page',
  async ({ page }) => {
    await expect(notSaved(page)).toBeVisible();
    await expect(notSaved(page)).toContainText('Do not close or reload this page');
  },
);

Then('the not-saved message is still shown', async ({ page }) => {
  await expect(notSaved(page)).toBeVisible();
});

Then('the not-saved message is gone', async ({ page }) => {
  await expect(notSaved(page)).toBeHidden();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

Then('the roster lists no builds in progress', async ({ page }) => {
  await openRoster(page);
  // Anchor first: a page still loading shows no entry either.
  await expect(page.getByRole('heading', { level: 1, name: 'Characters' })).toBeVisible();
  await expect(rosterList(page).or(page.getByText('No characters yet')).filter({ visible: true })).toBeVisible();
  await expect(buildEntries(page)).toHaveCount(0);
  expect(await storedKeys(page, BUILD_KEY_PREFIX)).toEqual([]);
});

Then('the build action cannot be used', async ({ page }) => {
  await expect(createAction(page, 'Start character creator')).toBeDisabled();
});

Then('they are told characters cannot be saved in this browser', async ({ page }) => {
  await expect(page.getByRole('alert')).toContainText('cannot be saved in this browser');
});

// The Creation settings dialog

const EXTRA_FREEBIES_RANGE_MESSAGE = 'Extra freebie points must be a whole number from 0 to 999.';

/** What this slice's steps remember between one another. */
interface SettingsDialogMemory {
  /** The freebie pool as it read before the last entry. */
  poolBefore: string;
  /** The base generation the scenario last asked for, offered or not. */
  asked: string;
  /** Whether the dialog offered it. */
  offered: boolean;
  /** The trait the scenario put above its future maximum. */
  trait: string;
  /** What was last typed as extra freebie points. */
  entered: string;
  /** The extra freebie points stored before the last entry. */
  extraBefore: number;
  /** The base generation the scenario last chose. */
  chosen?: number;
}

const dialogMemory = (world: Parameters<typeof memoryFor>[0]): SettingsDialogMemory =>
  memoryFor<SettingsDialogMemory>(world, 'settings-dialog', () => ({ poolBefore: '', asked: '', trait: '', entered: '', extraBefore: 0, offered: false }));

/** The dialog's own status region that holds the refusal for the extra freebie points field. */
const extraFreebiesNotice = (page: Page) => settingsDialog(page).locator('#settings-extra-freebies-notice');

/** The dialog's status regions, however many it has. */
const dialogRefusals = (page: Page) => settingsDialog(page).locator('[data-notice]');

/** Those that hold a refusal right now. */
const shownRefusals = (page: Page) => dialogRefusals(page).filter({ hasText: /\S/ });

const expectNoRefusals = (page: Page) => expect(shownRefusals(page)).toHaveCount(0);

/** The freebie pool as the dialog reads it, once it has been drawn. */
async function poolReading(page: Page): Promise<string> {
  await expect(readout(page, 'Freebie pool')).not.toHaveText('');
  return (await readout(page, 'Freebie pool').textContent())!;
}

async function enterExtraFreebiesWithMemory(page: Page, memory: SettingsDialogMemory, entry: string): Promise<void> {
  await openCreationSettings(page);
  memory.poolBefore = await poolReading(page);
  memory.extraBefore = (await storedBuild(page)).settings.extraFreebies;
  memory.entered = entry;
  await enterExtraFreebies(page, entry);
}

/** The generation table's row for the generation the scenario chose, which fixes the limits the dialog shows. */
function chosenRow(memory: SettingsDialogMemory) {
  const row = GENERATION_TABLE.find((entry) => entry.generation === memory.chosen);
  if (!row) throw new Error('No generation was chosen in this scenario.');
  return row;
}

/** Everything the dialog offers for the base generation: 4th through 13th, in order. */
const EVERY_GENERATION = ['4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th', '13th'];

const expectEveryGenerationOffered = async (page: Page): Promise<void> => {
  expect(await baseGeneration(page).getByRole('option').allTextContents()).toEqual(EVERY_GENERATION);
};

/** A stored value that is not zero, so a refused entry has something to leave unchanged. */
const NONZERO_EXTRA = 20;

async function chooseGeneration(page: Page, label: string): Promise<void> {
  await openCreationSettings(page);
  await baseGeneration(page).selectOption({ label });
}

async function expectExtraFreebiesRefused(page: Page, memory: SettingsDialogMemory): Promise<void> {
  await expect(extraFreebies(page)).toHaveAttribute('aria-invalid', 'true');
  // The refused entry stays beside its message, as typed.
  await expect(extraFreebies(page)).toHaveValue(memory.entered);
  await expect(extraFreebies(page)).toHaveAccessibleDescription(new RegExp(escaped(EXTRA_FREEBIES_RANGE_MESSAGE)));
  await expect(extraFreebiesNotice(page)).toHaveText(EXTRA_FREEBIES_RANGE_MESSAGE);
}

/** The dialog states a refusal in its own status region, never in the page behind it. */
async function expectDialogRefusal(page: Page, message: RegExp): Promise<void> {
  await expect(dialogRefusals(page).filter({ hasText: message })).toHaveCount(1);
  await expect(dialogRefusals(page).filter({ hasText: message })).toBeVisible();
}

/** The dialog's pool and the stored build agree that the extra freebie points are `value`. */
async function expectStoredExtraFreebies(page: Page, value: number): Promise<void> {
  await openCreationSettings(page);
  await expect(readout(page, 'Freebie pool')).toHaveText(String(STANDARD_FREEBIE_BUDGET + value));
  expect((await storedBuild(page)).settings.extraFreebies).toBe(value);
}

/** The field, even in a dialog that is closed, reads the stored value: a refused entry was dropped. */
async function expectFieldDroppedRefusedEntry(page: Page, value: number): Promise<void> {
  await expect(page.locator('#settings-extra-freebies')).toHaveValue(String(value));
  await expect(page.locator('#settings-extra-freebies')).not.toHaveAttribute('aria-invalid', 'true');
}

/** Opens the dialog with `value` stored as the extra freebie points. */
async function openWithExtraFreebies(page: Page, value: number): Promise<void> {
  await enterExtraFreebies(page, String(value));
  await expect(readout(page, 'Freebie pool')).toHaveText(String(STANDARD_FREEBIE_BUDGET + value));
}

// Given

Given('I have just started a build', startedBuild);

Given('the Creation settings dialog is open', async ({ page }) => {
  await openCreationSettings(page);
  // So a later step can tell what the dialog's own alert was given, apart from the page's.
  await watchWrites(page, '[data-dialog-alert]');
});

Given(
  /^a build at (\d+)th generation with (\d+) dots? of the Generation Background$/,
  async ({ page }, base: string, dots: string) => {
    await openPlayed(page, generation(Number(base)), creation('background:Generation', Number(dots)));
  },
);

Given(/^a build at (\d+)th generation with a trait at (\d+)$/, async ({ page, memory }, base: string, value: string) => {
  dialogMemory({ memory }).trait = 'Strength';
  // Freebie dots take a trait past what creation allows, so the future maximum can be below it.
  await openPlayed(page, generation(Number(base)), extra(30), freebie('attribute:strength', Number(value)));
});

Given(
  'the Creation settings dialog is open and extra freebie points read {int}',
  async ({ page }, value: number) => openWithExtraFreebies(page, value),
);

Given(
  'extra freebie points read {int} and the Creation settings dialog is open',
  async ({ page }, value: number) => openWithExtraFreebies(page, value),
);

// When

When('I open Creation settings', async ({ page }) => {
  await openCreationSettings(page);
});

When(
  'I choose {int}th generation and {int} extra freebie points',
  async ({ page, memory }, generation: number, points: number) => {
    dialogMemory({ memory }).chosen = generation;
    await chooseGeneration(page, `${generation}th`);
    await enterExtraFreebiesWithMemory(page, dialogMemory({ memory }), String(points));
  },
);

When('I choose {int}th generation', async ({ page }, generation: number) => {
  await chooseGeneration(page, `${generation}th`);
});

When('I choose {int}th generation and press Escape', async ({ page }, generation: number) => {
  await chooseGeneration(page, `${generation}th`);
  await page.keyboard.press('Escape');
});

When('I choose {string} as the base generation', async ({ page, memory }, label: string) => {
  const remembered = dialogMemory({ memory });
  remembered.asked = label;
  await openCreationSettings(page);
  // A generation the dialog does not offer cannot be chosen, and the scenario goes on to say it is not offered.
  remembered.offered = (await baseGeneration(page).getByRole('option', { name: label, exact: true }).count()) > 0;
  if (!remembered.offered) return;
  await chooseGeneration(page, label);
  await expect(baseGeneration(page).locator('option:checked')).toHaveText(label);
});

When('I choose {string} and {string} extra freebie points', async ({ page, memory }, label: string, points: string) => {
  dialogMemory({ memory }).chosen = parseInt(label, 10);
  await chooseGeneration(page, label);
  await enterExtraFreebiesWithMemory(page, dialogMemory({ memory }), points);
});

When('I choose Done', async ({ page }) => {
  await settingsDialog(page).getByRole('button', { name: 'Done', exact: true }).click();
});

/**
 * The creation settings feature enters invalid extra freebie points into a dialog opened on the defaults
 * and checks that nothing changed. With a stored 0 an entry that wrongly reset the field to 0 would look
 * unchanged, so a stored value that is not zero is put there first, unless the scenario already did.
 */
async function ensureNonZeroExtraFreebies(page: Page): Promise<void> {
  await openCreationSettings(page);
  if ((await storedBuild(page)).settings.extraFreebies === 0) await openWithExtraFreebies(page, NONZERO_EXTRA);
}

When('I enter {string} as extra freebie points', async ({ page, memory }, entry: string) => {
  await ensureNonZeroExtraFreebies(page);
  await enterExtraFreebiesWithMemory(page, dialogMemory({ memory }), entry);
});

When('I enter {int} as extra freebie points', async ({ page, memory }, value: number) => {
  await enterExtraFreebiesWithMemory(page, dialogMemory({ memory }), String(value));
});

When('I enter {string} as extra freebie points and press Escape', async ({ page, memory }, entry: string) => {
  const remembered = dialogMemory({ memory });
  await enterExtraFreebiesWithMemory(page, remembered, entry);
  await page.keyboard.press('Escape');
  await expect(settingsDialog(page)).toBeHidden();
});

When(
  'I type {string} and then {string} without leaving the field',
  async ({ page, memory }, first: string, second: string) => {
    await openCreationSettings(page);
    dialogMemory({ memory }).poolBefore = await poolReading(page);
    const field = extraFreebies(page);
    await field.selectText();
    await field.pressSequentially(first);
    // The second entry is the first carried on; one that is not is typed over it.
    if (second.startsWith(first)) {
      await field.pressSequentially(second.slice(first.length));
    } else {
      await field.selectText();
      await field.pressSequentially(second);
    }
  },
);

When('I leave the field', async ({ page }) => {
  await extraFreebies(page).blur();
});

When('I press Escape', async ({ page }) => {
  await page.keyboard.press('Escape');
});

When('I open it again and choose the close button', async ({ page }) => {
  await creationSettingsButton(page).click();
  await settingsDialog(page).getByRole('button', { name: 'Close', exact: true }).click();
});

// Then

Then(
  'base generation is {int}th and extra freebie points are {int}',
  async ({ page }, generation: number, points: number) => {
    await openCreationSettings(page);
    await expect(baseGeneration(page).locator('option:checked')).toHaveText(`${generation}th`);
    await expect(extraFreebies(page)).toHaveValue(String(points));
  },
);

Then('base generation is still {int}th', async ({ page }, generation: number) => {
  await expect(baseGeneration(page).locator('option:checked')).toHaveText(`${generation}th`);
  expect((await storedBuild(page)).settings.baseGeneration).toBe(generation);
});

Then('the base generation reads {int}th', async ({ page, memory }, generation: number) => {
  expect(dialogMemory({ memory }).offered, `${dialogMemory({ memory }).asked} was offered`).toBe(true);
  await expect(baseGeneration(page).locator('option:checked')).toHaveText(`${generation}th`);
  await expectEveryGenerationOffered(page);
});

Then('it is not offered', async ({ page, memory }) => {
  expect(dialogMemory({ memory }).offered, `${dialogMemory({ memory }).asked} was offered`).toBe(false);
  await expectEveryGenerationOffered(page);
  expect(EVERY_GENERATION).not.toContain(dialogMemory({ memory }).asked);
});

Then('the freebie pool reads {int}', async ({ page }, pool: number) => {
  await openCreationSettings(page);
  await expect(readout(page, 'Freebie pool')).toHaveText(String(pool));
});

Then('the freebie pool is unchanged', async ({ page, memory }) => {
  const remembered = dialogMemory({ memory });
  await expect(readout(page, 'Freebie pool')).toHaveText(remembered.poolBefore);
  // The refused entry was not stored either.
  expect((await storedBuild(page)).settings.extraFreebies).toBe(remembered.extraBefore);
});

Then('the dialog shows a freebie pool of {int}', async ({ page, memory }, pool: number) => {
  await expect(readout(page, 'Freebie pool')).toHaveText(String(pool));
  // The generation chosen alongside it fixes the rate at which blood is spent.
  await expect(readout(page, 'Blood points per turn')).toHaveText(String(chosenRow(dialogMemory({ memory })).bloodPerTurn));
});

Then('the effective generation reads {int}th', async ({ page }, generation: number) => {
  await openCreationSettings(page);
  await expect(readout(page, 'Effective generation')).toHaveText(`${generation}th`);
});

Then('focus is on the Creation settings button', async ({ page }) => {
  await expect(creationSettingsButton(page)).toBeFocused();
});

Then('I am told extra freebie points must be a whole number from 0 to 999', async ({ page, memory }) => {
  await expectExtraFreebiesRefused(page, dialogMemory({ memory }));
});

Then('I am told to lower the Generation Background first', async ({ page }) => {
  await expectDialogRefusal(page, /Lower the Generation background to \d+ first\./);
});

Then('I am told to lower that trait first', async ({ page, memory }) => {
  await expectDialogRefusal(page, new RegExp(`Lower ${dialogMemory({ memory }).trait} to \\d+ first\\.`));
});

Then('I am told to undo purchases first', async ({ page }) => {
  await expectDialogRefusal(page, /points of purchases must be removed first\./);
});

Then('extra freebie points still read {int}', async ({ page }, value: number) => {
  // After Escape the dialog is closed, and the field it held must already show the stored value, not the refused entry.
  if (await settingsDialog(page).isHidden()) await expectFieldDroppedRefusedEntry(page, value);
  await expectStoredExtraFreebies(page, value);
});

Then('after reloading the builder extra freebie points read {int}', async ({ page }, value: number) => {
  await reloadBuilder(page);
  await openCreationSettings(page);
  await expect(extraFreebies(page)).toHaveValue(String(value));
});

Then('no refusal is shown while typing', async ({ page, memory }) => {
  await expect(extraFreebies(page)).not.toHaveAttribute('aria-invalid', 'true');
  await expectNoRefusals(page);
  // Nothing was applied by a half-typed entry either.
  await expect(readout(page, 'Freebie pool')).toHaveText(dialogMemory({ memory }).poolBefore);
});

Then('the message is gone', async ({ page, memory }) => {
  await expectNoRefusals(page);
  await expect(extraFreebies(page)).not.toHaveAttribute('aria-invalid', 'true');
  // The corrected entry took effect: the pool follows it.
  await expect(readout(page, 'Freebie pool')).toHaveText(
    String(STANDARD_FREEBIE_BUDGET + Number(dialogMemory({ memory }).entered)),
  );
});

Then(
  'the maximum trait rating reads {int}, the blood pool maximum {int} and the freebie pool {int}',
  async ({ page, memory }, trait: number, pool: number, freebies: number) => {
    await expect(readout(page, 'Maximum trait rating')).toHaveText(String(trait));
    await expect(readout(page, 'Blood Pool maximum')).toHaveText(String(pool));
    await expect(readout(page, 'Freebie pool')).toHaveText(String(freebies));
    // The table of generations is the source of every limit the dialog shows.
    const row = chosenRow(dialogMemory({ memory }));
    expect([row.maxTrait, row.bloodPoolMax]).toEqual([trait, pool]);
    await expect(readout(page, 'Blood points per turn')).toHaveText(String(row.bloodPerTurn));
  },
);

Then('the Generation Background cannot be raised above {int} dots', async ({ page }, max: number) => {
  const control = await traitRating(page, 'Generation');
  await requestRating(control, max + 1);
  await expectRated(control, max);
  await expect(await groupNotice(page, 'Backgrounds')).toContainText('The effective generation cannot be better than 4th.');
});

Then('it says changes apply immediately', async ({ page }) => {
  await expect(settingsDialog(page).getByText('Changes apply immediately.', { exact: true })).toBeVisible();
});

Then(
  'the dialog closes, focus is on the Creation settings button and base generation is {int}th',
  async ({ page }, generation: number) => {
    await expect(settingsDialog(page)).toBeHidden();
    await expect(creationSettingsButton(page)).toBeFocused();
    expect((await storedBuild(page)).settings.baseGeneration).toBe(generation);
  },
);

Then('the dialog closes and focus is on the Creation settings button', async ({ page }) => {
  await expect(settingsDialog(page)).toBeHidden();
  await expect(creationSettingsButton(page)).toBeFocused();
});

Then('it has a labelled title and a close button named {string}', async ({ page }, name: string) => {
  const dialog = settingsDialog(page);
  await expect(dialog.getByRole('heading', { name: 'Creation settings', level: 2 })).toBeVisible();
  await expect(dialog.getByRole('button', { name, exact: true })).toBeVisible();
  await expectUniqueControlNames(dialog);
});

Then('axe reports no violations at 1512 px and 375 px, also with a refusal shown', async ({ page, memory }) => {
  for (const width of [1512, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await enterExtraFreebiesWithMemory(page, dialogMemory({ memory }), '');
    await expectExtraFreebiesRefused(page, dialogMemory({ memory }));
    expect(await violationsOnPage(page), `refusal shown at ${width} px`).toEqual([]);
    await enterExtraFreebies(page, '0');
    await expectNoRefusals(page);
    expect(await violationsOnPage(page), `no refusal at ${width} px`).toEqual([]);
  }
});

Then('it does not scroll the page horizontally at 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  expect(await horizontalOverflow(page)).toBe(0);
  const box = (await settingsDialog(page).boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);
});

Then('the step navigation has no Settings step', async ({ page }) => {
  await expect(stepNav(page).getByRole('link', { name: 'Settings' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Settings', level: 2 })).toHaveCount(0);
});

Then('the builder opens on the concept step', async ({ page }) => {
  await expect(stepHeading(page, 'Concept')).toBeVisible();
  await expect(stepLink(page, 'Concept')).toHaveAttribute('aria-current', 'step');
});

When(
  /^they follow the link to the (Attributes|Abilities|Advantages|Finishing touches) step$/,
  async ({ page }, step: string) => {
    await settingsDialog(page).getByRole('link', { name: `Go to ${step}`, exact: true }).click();
  },
);

Then('the dialog is closed and the {string} step is shown with keyboard focus on its heading', async ({ page }, step: string) => {
  await expect(settingsDialog(page)).toBeHidden();
  await expect(stepHeading(page, step)).toBeFocused();
});

Then('the dialog has its own alert saying changes are not being saved', async ({ page }) => {
  // The page's own alert is inert behind a modal dialog, so the dialog must say it itself.
  const alert = settingsDialog(page).getByRole('alert');
  await expect(alert).toContainText('Changes are not being saved');
  expect(await writtenTexts(page)).toContainEqual(expect.stringContaining('Changes are not being saved'));
});

Then('the dialog has no alert', async ({ page }) => {
  await expect(settingsDialog(page).getByRole('alert')).toHaveCount(0);
});

Then('the extra freebie points field reads {int} and is not marked invalid', async ({ page }, value: number) => {
  await expect(extraFreebies(page)).toHaveValue(String(value));
  await expect(extraFreebies(page)).not.toHaveAttribute('aria-invalid', 'true');
});
