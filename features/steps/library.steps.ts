import { expect } from '@playwright/test';
import { Given, Then } from './fixtures';
import { buildWith, saveBuilds } from './support/builder';
import { characterWith, saveCharacters } from './support/seed';
import { overwriteRecord } from './support/storage';

/** The roles whose accessible name the accessibility tree lists: what a player can operate. */
const CONTROL_ROLES = 'textbox|combobox|slider|button|link|checkbox|radio|spinbutton';
const CONTROL_NAME = new RegExp(`^\\s*- (?:${CONTROL_ROLES}) "([^"]*)"`);

Given(
  'a saved character, a build in progress, an unreadable character and an unreadable build',
  async ({ page }) => {
    const damagedBuild = buildWith();
    await saveBuilds(page, [buildWith({ concept: { name: 'Beckett' }, clan: 'Gangrel' }), damagedBuild]);
    await overwriteRecord(page, damagedBuild.id, 'not a build');

    const damagedCharacter = characterWith({ name: 'Fatima' });
    await saveCharacters(page, [characterWith({ name: 'Lucita', clan: 'Lasombra' }), damagedCharacter]);
    await overwriteRecord(page, damagedCharacter.id, 'not a character');
  },
);

Then(
  'no control on the page has {string} or {string} in its accessible name',
  async ({ page }, first: string, second: string) => {
    const tree = await page.locator('body').ariaSnapshot();
    const names = tree
      .split('\n')
      .map((line) => CONTROL_NAME.exec(line)?.[1])
      .filter((name): name is string => name !== undefined);

    // A page with nothing to operate would pass for the wrong reason.
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((name) => [first, second].some((word) => name.toLowerCase().includes(word)))).toEqual([]);
  },
);

Then('the page contains no dialog', async ({ page }) => {
  await expect(page.locator('dialog')).toHaveCount(0);
});
