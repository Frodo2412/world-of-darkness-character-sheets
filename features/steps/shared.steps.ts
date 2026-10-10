import { expect, type Locator, type Page } from '@playwright/test';
import type { V20Character } from '../../src/domain/v20/character';
import { Given, Then, When } from './fixtures';
import { scanTab } from './support/accessibility';
import { horizontalOverflow } from './support/pages';
import { characterArranged, crowdedCharacter, saveCharacters } from './support/seed';
import { enterEditMode, openSavedSheet } from './support/sheet';
import { activePanel, openSheetTab } from './support/tabs';

// The phrases every tab's scenarios share, defined once. A step that is specific to one tab is written
// in that tab's step file and names the tab ("on the Combat tab"), so no phrase has two definitions.

const SCREEN_HEIGHT = 800;

/** The saved character a scenario arranged, or a plain one saved now. */
async function savedCharacter(page: Page, memory: { saved: V20Character[] }): Promise<V20Character> {
  if (memory.saved.length === 0) {
    memory.saved = [characterArranged({ name: 'Marguerite', clan: 'Toreador' }, () => {})];
    await saveCharacters(page, memory.saved);
  }
  return memory.saved[0];
}

// Arranging

Given('a saved character', async ({ page, memory }) => {
  memory.saved = [characterArranged({ name: 'Marguerite', clan: 'Toreador' }, () => {})];
  await saveCharacters(page, memory.saved);
});

Given('a character in play mode', async ({ page, memory }) => {
  memory.saved = [characterArranged({ name: 'Marguerite', clan: 'Toreador' }, () => {})];
  await openSavedSheet(page, memory.saved[0]);
});

Given('a character in edit mode', async ({ page, memory }) => {
  memory.saved = [characterArranged({ name: 'Marguerite', clan: 'Toreador' }, () => {})];
  await openSavedSheet(page, memory.saved[0]);
  await enterEditMode(page);
});

// A character with no session is a character the journal has never touched: a new one has none.
Given('a character with no session', async ({ page, memory }) => {
  memory.saved = [characterArranged({ name: 'Marguerite', clan: 'Toreador' }, () => {})];
  await openSavedSheet(page, memory.saved[0]);
});

// Opening a tab

When(/^the (.+) tab is opened$/, async ({ page, memory }, name: string) => {
  await openSheetTab(page, (await savedCharacter(page, memory)).id, name);
});

When(/^the (.+) tab is opened at 320 pixels wide with crowded content$/, async ({ page, memory }, name: string) => {
  await page.setViewportSize({ width: 320, height: SCREEN_HEIGHT });
  if (memory.saved.length === 0) {
    memory.saved = [crowdedCharacter({ name: 'Marguerite', clan: 'Toreador' })];
    await saveCharacters(page, memory.saved);
  }
  await openSheetTab(page, memory.saved[0].id, name);
  // The sheet stays hidden until its tab is drawn, and a hidden sheet is 0 wide: measuring it then
  // would pass without testing anything.
  await expect(activePanel(page)).toBeVisible();
});

When(/^the (.+) tab is scanned for accessibility problems$/, async ({ page, memory }, name: string) => {
  // A scenario that has not opened the sheet yet gets it opened on the tab asked for.
  if (!/\/sheet\//.test(page.url())) await openSheetTab(page, (await savedCharacter(page, memory)).id, name);
  memory.violations = await scanTab(page, name);
});

// What a tab shows

/** The words that say a tab cannot be edited in play mode. */
const READ_ONLY_HINT = 'Read-only in play · edit character to change';

Then('the read-only hint is shown', async ({ page }) => {
  await expect(activePanel(page).getByText(READ_ONLY_HINT, { exact: true })).toBeVisible();
});

/** Anything a player could type into or change the contents of the tab with. */
const editors = (panel: Locator): Locator =>
  panel
    .locator('input, textarea, select, [contenteditable]:not([contenteditable="false"])')
    .or(panel.getByRole('button', { name: /^(Add|Remove)\b/ }))
    .filter({ visible: true });

Then('nothing on the tab can be edited', async ({ page }) => {
  await expect(activePanel(page)).toBeVisible();
  await expect(editors(activePanel(page))).toHaveCount(0);
});

Then('the start-a-session prompt is shown', async ({ page }) => {
  const panel = activePanel(page);
  await expect(panel.getByRole('heading', { name: 'Start a session first', exact: true })).toBeVisible();
  await expect(panel.getByText('Notes, experience and level-ups are recorded in a session.', { exact: true })).toBeVisible();
  await expect(panel.getByRole('textbox', { name: /title/i })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Start session', exact: true })).toBeVisible();
});

Then('no problems are reported', async ({ memory }) => {
  // A scenario that never scanned has nothing to report, which is not the same as nothing wrong.
  expect(memory.violations, 'no tab was scanned: a "scanned for accessibility problems" step must come first').toBeDefined();
  expect(memory.violations).toEqual([]);
});

Then('the page does not scroll sideways', async ({ page }) => {
  expect(await horizontalOverflow(page)).toBe(0);
});
