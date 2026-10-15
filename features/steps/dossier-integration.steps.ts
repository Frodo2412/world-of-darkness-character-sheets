import { expect, type Page } from '@playwright/test';
import type { V20Character } from '../../src/domain/v20/character';
import { Given, Then, When, memoryFor, type ScenarioMemory } from './fixtures';
import { announcements, watchAnnouncements } from './support/announcements';
import { addressedTab, asSavedBeforeTheTabs, legacyTextOf, openSheetOn, tabKeys, tabNamed, tabNames, tabs, withLegacyText } from './support/dossier';
import { selectDiscipline } from './support/disciplines';
import { addButton, backgroundsPanel } from './support/backgrounds';
import { awardOnPage } from './support/journal-experience';
import { saveButton, newNoteButton, titleField } from './support/journal-notes';
import { startSessionOnPage, showJournal } from './support/journal';
import { confirmButton, selectTrait } from './support/levelup';
import { characterArranged, givenSaved, saveCharacters } from './support/seed';
import { bloodTotal, card, editButton, enterEditMode, healthBox, identityName, openSavedSheet, savedCharacter, willpowerTotal } from './support/sheet';
import { overwriteRecord } from './support/storage';
import { showTab, tabPanelOf } from './support/tabs';
import { statusRegion } from './support/pages';

// Step phrases for the dossier tabs together. Each is about the sheet as a whole, or names the tab it
// is about, so none overlaps a single tab's.

const NAME = 'Marguerite';

interface IntegrationMemory {
  resource?: string;
  /** What the resource showed after the player's last change. */
  amount?: string;
  scrolled?: number;
  legacy?: V20Character;
}

const integration = (memory: ScenarioMemory): IntegrationMemory => memoryFor<IntegrationMemory>({ memory }, 'dossier-integration', () => ({}));

/** The saved character a scenario arranged, or a plain one saved now. */
async function ensureSaved(page: Page, memory: ScenarioMemory): Promise<V20Character> {
  if (memory.saved.length === 0) {
    memory.saved = [characterArranged({ name: NAME, clan: 'Toreador' }, () => {})];
    await saveCharacters(page, memory.saved);
  }
  return memory.saved[0];
}

/** Opens a sheet on a tab and starts watching what is announced. */
async function open(page: Page, memory: ScenarioMemory, key: string | undefined): Promise<void> {
  const character = await ensureSaved(page, memory);
  await openSheetOn(page, character.id, key);
  await watchAnnouncements(page);
}

// Opening

When('its sheet is opened', async ({ page, memory }) => {
  await open(page, memory, undefined);
});

When('the sheet is opened on the Combat tab and reloaded', async ({ page, memory }) => {
  await open(page, memory, 'combat');
  await page.reload();
});

Given('the player opened Combat from the Character sheet', async ({ page, memory }) => {
  await open(page, memory, undefined);
  await tabNamed(page, 'Combat').click();
  await expect(tabNamed(page, 'Combat')).toHaveAttribute('aria-selected', 'true');
});

When('they press the browser Back button', async ({ page }) => {
  await page.goBack();
});

When('they press Forward', async ({ page }) => {
  await page.goForward();
});

// The bar

Then(/^the tab bar reads (.+)$/, async ({ page }, list: string) => {
  expect(await tabNames(page)).toEqual(list.split(', '));
});

Then('the registered tab keys are disciplines, backgrounds, combat, journal and levelup', async ({ page }) => {
  expect(await tabKeys(page)).toEqual(['sheet', 'disciplines', 'backgrounds', 'combat', 'journal', 'levelup']);
});

// The shell

Then("the character's name, the mode toggle and the save status are shown", async ({ page, memory }) => {
  await expect(identityName(page)).toHaveText(memory.saved[0].header.name);
  await expect(editButton(page)).toBeVisible();
  // The application bar's status is written by the first save, so before one it is there but empty.
  await expect(page.locator('.app-bar #save-status')).toBeAttached();
});

Then(/^the resources row is (shown|not shown)$/, async ({ page }, state: string) => {
  const cards = ['Blood Pool', 'Willpower', 'Health', 'Humanity'];
  for (const name of cards) {
    if (state === 'shown') await expect(card(page, name)).toBeVisible();
    else await expect(card(page, name)).toBeHidden();
  }
});

Then('the Combat tab is shown', async ({ page }) => {
  await expect(tabNamed(page, 'Combat')).toHaveAttribute('aria-selected', 'true');
  await expect(tabPanelOf(page, 'combat')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Combat', exact: true })).toBeVisible();
  expect(addressedTab(page)).toBe('combat');
});

Then('the Character sheet is shown and the address names no tab', async ({ page }) => {
  await expect(tabPanelOf(page, 'sheet')).toBeVisible();
  await expect(tabNamed(page, 'Character sheet')).toHaveAttribute('aria-selected', 'true');
  expect(addressedTab(page)).toBeNull();
});

// Mode and uncommitted input

Given('a character in edit mode with a name field containing text not yet committed', async ({ page, memory }) => {
  await givenSaved(page, memory, { name: NAME, clan: 'Toreador' });
  await openSavedSheet(page, memory.saved[0]);
  await enterEditMode(page);
  await page.getByLabel('Name', { exact: true }).fill('Typed but not committed');
});

When('the player switches to Journal and back', async ({ page }) => {
  await showTab(page, 'Journal');
  await showTab(page, 'Character sheet');
});

Then('they are still in edit mode and the typed text is there', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Done editing', exact: true })).toBeVisible();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Typed but not committed');
});

Then(/^"([^"]*)" was announced once, on entering edit mode, and not on switching$/, async ({ page }, text: string) => {
  const heard = await announcements(page);
  expect(heard.filter((said) => said === text)).toHaveLength(1);
  expect(heard.filter((said) => said === 'Play mode')).toHaveLength(0);
});

// Resources

type Resource = 'Blood Pool' | 'Willpower' | 'Health';

Given(/^a character with (Blood Pool|Willpower|Health) to spend$/, async ({ page, memory }, resource: Resource) => {
  integration(memory).resource = resource;
  await givenSaved(page, memory, { name: NAME, clan: 'Toreador', generation: '10th' }, (character) => {
    character.bloodPool.current = 10;
    character.willpower = { permanent: 6, temporary: 6 };
  });
});

/** The change the player makes to a resource where it is shown. */
async function change(page: Page, resource: Resource): Promise<void> {
  if (resource === 'Blood Pool') await page.getByRole('button', { name: 'Spend one blood', exact: true }).click();
  else if (resource === 'Willpower') await page.getByRole('button', { name: 'Spend one willpower', exact: true }).click();
  else await healthBox(page, 'Bruised').click();
}

/** What the resource reads. */
async function reading(page: Page, resource: Resource): Promise<string> {
  if (resource === 'Blood Pool') return ((await bloodTotal(page).textContent()) ?? '').trim();
  if (resource === 'Willpower') return ((await willpowerTotal(page).textContent()) ?? '').trim();
  return (await healthBox(page, 'Bruised').getAttribute('data-damage')) ?? '';
}

When('the player changes it on the Combat tab and opens the Character sheet tab', async ({ page, memory }) => {
  const resource = integration(memory).resource as Resource;
  await open(page, memory, 'combat');
  const before = await reading(page, resource);
  await change(page, resource);
  await expect.poll(() => reading(page, resource)).not.toBe(before);
  integration(memory).amount = await reading(page, resource);
  await showTab(page, 'Character sheet');
});

Then(/^the (Blood Pool|Willpower|Health) shows the new amount$/, async ({ page, memory }, resource: Resource) => {
  await expect.poll(() => reading(page, resource)).toBe(integration(memory).amount);
});

When('the player changes it there and opens the Combat tab', async ({ page, memory }) => {
  const resource = integration(memory).resource as Resource;
  const before = await reading(page, resource);
  await change(page, resource);
  await expect.poll(() => reading(page, resource)).not.toBe(before);
  integration(memory).amount = await reading(page, resource);
  await showTab(page, 'Combat');
});

Then('the Combat tab shows that amount', async ({ page, memory }) => {
  await expect(tabPanelOf(page, 'combat')).toBeVisible();
  await expect.poll(() => reading(page, integration(memory).resource as Resource)).toBe(integration(memory).amount);
});

// The keyboard

Given('the tab bar has focus on Disciplines', async ({ page, memory }) => {
  await open(page, memory, undefined);
  await tabNamed(page, 'Disciplines').focus();
  await expect(tabNamed(page, 'Disciplines')).toBeFocused();
});

When('the player presses the right arrow, then Space', async ({ page, memory }) => {
  integration(memory).scrolled = await page.evaluate(() => window.scrollY);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
});

Then('Backgrounds opens, is marked selected in text, and the page has not scrolled', async ({ page, memory }) => {
  const tab = tabNamed(page, 'Backgrounds');
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await expect(tabPanelOf(page, 'backgrounds')).toBeVisible();
  // Selected is said in more than colour: the tab is bold and underlined.
  const style = await tab.evaluate((element) => ({ weight: Number(getComputedStyle(element).fontWeight), decoration: getComputedStyle(element).textDecorationLine }));
  expect(style.weight).toBeGreaterThanOrEqual(600);
  expect(style.decoration).toContain('underline');
  expect(await page.evaluate(() => window.scrollY)).toBe(integration(memory).scrolled);
});

When('the player presses End, then Enter', async ({ page }) => {
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
});

Then('the last tab opens', async ({ page }) => {
  const names = await tabNames(page);
  const last = names.at(-1)!;
  await expect(tabNamed(page, last)).toHaveAttribute('aria-selected', 'true');
  await expect(tabPanelOf(page, 'levelup')).toBeVisible();
});

When('the player presses Home', async ({ page }) => {
  await page.keyboard.press('Home');
});

Then('focus is on the Character sheet tab', async ({ page }) => {
  await expect(tabNamed(page, 'Character sheet')).toBeFocused();
});

// A record saved before the dossier tabs

Given('a character saved before the dossier tabs with every legacy text field filled', async ({ page, memory }) => {
  const character = withLegacyText(characterArranged({}, () => {}));
  memory.saved = [character];
  integration(memory).legacy = structuredClone(character);
  await saveCharacters(page, memory.saved);
  await overwriteRecord(page, character.id, asSavedBeforeTheTabs(character));
});

When(
  'every tab is opened in turn, a Discipline is viewed, a background is added in edit mode, a note is written and an advancement is confirmed',
  async ({ page, memory }) => {
    const id = memory.saved[0].id;
    await openSheetOn(page, id, undefined);
    await watchAnnouncements(page);

    await showTab(page, 'Disciplines');
    await selectDiscipline(page, 'Presence');

    await enterEditMode(page);
    await showTab(page, 'Backgrounds');
    await addButton(page, 'Add background').click();
    const added = backgroundsPanel(page).getByRole('textbox', { name: /^Background \d+ name$/ }).last();
    await added.fill('Allies');

    await showTab(page, 'Combat');

    await showJournal(page, id);
    await startSessionOnPage(page, 'Session 1');
    await awardOnPage(page, '10', 'First award');
    await newNoteButton(page).click();
    await titleField(page).fill('First note');
    await saveButton(page).click();

    await showTab(page, 'Level up');
    await selectTrait(page, 'Stealth');
    await confirmButton(page).click();
    await expect(tabPanelOf(page, 'levelup').locator('[data-applied]')).toBeVisible();
  },
);

Then("each tab shows its empty state or the character's data and no error", async ({ page }) => {
  for (const name of await tabNames(page)) {
    await showTab(page, name);
    await expect(page.locator('[data-tab-panel]:not([hidden])')).toBeVisible();
    await expect(statusRegion(page)).toBeHidden();
    await expect(page.getByText(/could not be loaded|could not be read/i).filter({ visible: true })).toHaveCount(0);
  }
  await showTab(page, 'Journal');
  await expect(page.getByRole('heading', { name: 'Journal', exact: true })).toBeVisible();
  await expect(tabPanelOf(page, 'journal').getByText('Session 1', { exact: false }).first()).toBeVisible();
  await showTab(page, 'Backgrounds');
  await expect(backgroundsPanel(page).getByRole('textbox', { name: /^Background \d+ name$/ }).last()).toHaveValue('Allies');
});

Then('every legacy text field is exactly as it was saved', async ({ page, memory }) => {
  const legacy = integration(memory).legacy!;
  const stored = await savedCharacter(page, memory.saved[0].id);
  expect(legacyTextOf(stored)).toEqual(legacyTextOf(legacy));
  // What the player did is there too, and the record kept its unrelated ratings.
  expect(stored.abilities.stealth).toBe(1);
  expect(stored.journal.sessions.map((session) => session.title)).toEqual(['Session 1']);
  expect(stored.journal.notes.map((note) => note.title)).toEqual(['First note']);
  expect(stored.backgrounds.some((row) => row.name === 'Allies')).toBe(true);
  expect(stored.disciplines[0]).toEqual({ name: 'Presence', rating: 3 });
});
