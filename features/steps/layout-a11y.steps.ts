import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';
import type { V20Character } from '../../src/domain/v20/character';
import { Given, Then, When } from './fixtures';
import { startBuild } from './support/builder';
import {
  SHEET_ADDRESS,
  createCharacter,
  entryNamed,
  openRoster,
  sheetAddress,
  sheetField,
} from './support/pages';
import { expectRating, rating } from './support/ratings';
import { characterArranged, characterWith, givenSaved, saveCharacters } from './support/seed';
import {
  bloodTotal,
  doneButton,
  editButton,
  enterEditMode,
  expectDamage,
  healthBox,
  identityName,
  isEditing,
  openSavedSheet,
  selectedPoolCard,
  traitButton,
} from './support/sheet';

const SCREEN_HEIGHT = 800;

const SAVED = [
  { name: 'Lucita', clan: 'Lasombra', player: 'Ana' },
  { name: 'Fatima al-Faqadi of the Web of Knives', clan: 'Assamite', player: 'Benedict' },
];

/** The controls the page is presenting; a closed dialog or an unused page state has none. */
const controls = (page: Page): Locator =>
  page
    .locator('main')
    .locator('a, button, input, textarea, [role="slider"]')
    .filter({ visible: true });

Given(
  /^a player viewing the (roster|builder|sheet) on a (\d+) pixel wide screen$/,
  async ({ page }, which: string, width: string) => {
    await page.setViewportSize({ width: Number(width), height: SCREEN_HEIGHT });
    if (which === 'sheet') {
      await createCharacter(page);
    } else if (which === 'builder') {
      await startBuild(page);
    } else {
      await saveCharacters(page, SAVED.map(characterWith));
      await openRoster(page);
    }
  },
);

Then('every control offered in play mode is visible and can be activated', async ({ page }) => {
  // A new character's sheet opens for editing; the controls checked are the ones play mode offers.
  if (SHEET_ADDRESS.test(page.url()) && (await isEditing(page))) {
    await doneButton(page).click();
    await expect(editButton(page)).toBeVisible();
  }
  const all = await controls(page).all();
  // The roster shows two create buttons and, for each of its two characters, the links
  // "Edit character" and "Open sheet"; the sheet shows about a hundred fields, ratings and boxes.
  expect(all.length).toBeGreaterThanOrEqual(6);
  const { width } = page.viewportSize()!;
  for (const control of all) {
    await control.scrollIntoViewIfNeeded();
    // A stepper at its bound (aria-disabled) is offered but does nothing; it is still reachable.
    const atBound = (await control.getAttribute('aria-disabled')) === 'true';
    if (!atBound) await expect(control).toBeEnabled();
    const box = (await control.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    // Fails if something else would receive the click.
    if (atBound) {
      const reached = await control.evaluate((element) => {
        const { x, y, width, height } = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(x + width / 2, y + height / 2));
      });
      expect(reached).toBe(true);
    } else {
      await control.click({ trial: true });
    }
  }
});

Given(
  /^a player viewing the (roster|builder|empty roster|roster with characters|sheet|character not found)$/,
  async ({ page }, state: string) => {
    switch (state) {
      case 'roster':
        await openRoster(page);
        break;
      case 'builder':
        await startBuild(page);
        break;
      case 'empty roster':
        await openRoster(page);
        await expect(page.getByText('No characters yet')).toBeVisible();
        break;
      case 'roster with characters':
        await saveCharacters(page, SAVED.map(characterWith));
        await openRoster(page);
        await expect(entryNamed(page, 'Lucita')).toBeVisible();
        break;
      case 'sheet':
        await createCharacter(page);
        break;
      case 'character not found':
        await page.goto(sheetAddress('no-such-character'));
        await expect(page.getByRole('heading', { name: 'Character not found' })).toBeVisible();
        break;
    }
  },
);

When('the page is checked against WCAG 2.1 AA', async ({ page, memory }) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  memory.violations = results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.help} — ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
  );
});

Then('no violations are reported', async ({ memory }) => {
  expect(memory.violations).toEqual([]);
});

/**
 * Presses `key` (Tab, or Shift+Tab to go back) until `target` has focus, noting at every stop
 * whether a focus indicator was drawn: an outline of some width, in a colour the page is not.
 */
async function tabTo(
  page: Page,
  target: Locator,
  stops: { control: string; visible: boolean }[],
  key = 'Tab',
): Promise<void> {
  for (let presses = 0; presses < 150; presses += 1) {
    await page.keyboard.press(key);
    stops.push(
      await page.evaluate(() => {
        const focused = document.activeElement!;
        const style = getComputedStyle(focused);
        const page = getComputedStyle(document.documentElement).backgroundColor;
        const outlined =
          style.outlineStyle !== 'none' &&
          parseFloat(style.outlineWidth) > 0 &&
          style.outlineColor !== page &&
          !style.outlineColor.includes('transparent') &&
          !style.outlineColor.endsWith(', 0)');
        return {
          control: focused.getAttribute('aria-label') ?? focused.textContent?.trim() ?? focused.tagName.toLowerCase(),
          visible: focused.matches(':focus-visible') && outlined,
        };
      }),
    );
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error('The control was never reached with the keyboard.');
}

// The play view's accessibility pages

/** A character with the frame's kind of numbers, for scenarios that need something to read and press. */
const playable = (): V20Character =>
  characterArranged({ name: 'Lucita', clan: 'Lasombra', generation: '10th' }, (character) => {
    character.bloodPool.current = 8;
    character.willpower = { permanent: 6, temporary: 4 };
    character.humanity.rating = 7;
    character.attributes.intelligence = 4;
    character.abilities.investigation = 3;
  });

Given(
  /^a player viewing the (sheet in play mode with a pool selected|sheet in edit mode|sheet of a wounded character over its blood maximum)$/,
  async ({ page }, state: string) => {
    const character = playable();
    if (state.startsWith('sheet of a wounded')) {
      character.bloodPool.current = 20;
      character.health.bruised = 'aggravated';
      character.health.hurt = 'lethal';
      character.health.injured = 'bashing';
    }
    await openSavedSheet(page, character);
    if (state === 'sheet in edit mode') await enterEditMode(page);
    if (state.startsWith('sheet in play')) {
      await traitButton(page, 'Intelligence').click();
      await traitButton(page, 'Investigation').click();
      await expect(selectedPoolCard(page)).toContainText('Intelligence 4 + Investigation 3');
    }
  },
);

// Playing from the keyboard

Given(
  'a saved character with generation {string}, {int} blood, Intelligence {int} and Investigation {int}',
  async ({ page, memory }, generation: string, blood: number, intelligence: number, investigation: number) => {
    await givenSaved(page, memory, { name: 'Lucita', generation }, (character) => {
      character.bloodPool.current = blood;
      character.attributes.intelligence = intelligence;
      character.abilities.investigation = investigation;
    });
  },
);

When(
  'they use only the keyboard to spend one blood, mark bashing damage on Bruised and select Intelligence and Investigation',
  async ({ page, memory }) => {
    await tabTo(page, page.getByRole('button', { name: 'Spend one blood', exact: true }), memory.focusStops);
    await page.keyboard.press('Enter');

    await tabTo(page, healthBox(page, 'Bruised'), memory.focusStops);
    await page.keyboard.press('Space');

    await tabTo(page, traitButton(page, 'Intelligence'), memory.focusStops);
    await page.keyboard.press('Enter');
    await tabTo(page, traitButton(page, 'Investigation'), memory.focusStops);
    await page.keyboard.press('Enter');
  },
);

Then(
  'the Blood Pool reads {string}, Bruised shows bashing damage and the dice total is {string}',
  async ({ page }, blood: string, dice: string) => {
    await expect(bloodTotal(page)).toHaveText(blood);
    await expectDamage(page, 'Bruised', 'bashing');
    await expect(selectedPoolCard(page).locator('[data-show="pool.total"]')).toHaveText(dice);
  },
);

// Editing from the keyboard

When(
  'they use only the keyboard to enter edit mode, enter a Name, set Strength to 3 and leave edit mode',
  async ({ page, memory }) => {
    await tabTo(page, editButton(page), memory.focusStops);
    await page.keyboard.press('Enter');
    // Entering edit mode puts focus in the Name field, which already holds a name.
    await expect(sheetField(page, 'Name')).toBeFocused();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('Valeria');

    await tabTo(page, rating(page, 'Strength'), memory.focusStops);
    // Strength starts at 1, so two presses; the bound is a few more, not a loop that could run for ever.
    for (let presses = 0; presses < 5; presses += 1) {
      if ((await rating(page, 'Strength').getAttribute('aria-valuenow')) === '3') break;
      await page.keyboard.press('ArrowRight');
    }
    await expect(rating(page, 'Strength')).toHaveAttribute('aria-valuenow', '3');

    // Done editing is at the top of the page, behind the Name: back to it.
    await tabTo(page, doneButton(page), memory.focusStops, 'Shift+Tab');
    await page.keyboard.press('Enter');
    await expect(editButton(page)).toBeVisible();
  },
);

Then('the identity shows that name and Strength is rated {int}', async ({ page }, value: number) => {
  await expect(identityName(page)).toHaveText('Valeria');
  await expectRating(rating(page, 'Strength'), value);
});

Then('keyboard focus was visible at every stop', async ({ memory }) => {
  expect(memory.focusStops.length).toBeGreaterThan(0);
  expect(memory.focusStops.filter((stop) => !stop.visible)).toEqual([]);
});

// Names

Given(
  /^a player viewing a saved character's sheet in (play|edit) mode$/,
  async ({ page }, mode: string) => {
    await openSavedSheet(page, playable());
    if (mode === 'edit') await enterEditMode(page);
  },
);

Then(
  'every button, text field, rating and health box that is offered has an accessible name unique within the sheet',
  async ({ page }) => {
    // The accessibility tree as assistive technology receives it, one control per line.
    const tree = await page.locator('#sheet').ariaSnapshot();
    const lines = tree.split('\n').filter((line) => /^\s*- (textbox|slider|button|img)\b/.test(line));
    const names = lines.map((line) => /^\s*- (?:textbox|slider|button|img) "([^"]+)"/.exec(line)?.[1]);

    // Every control, and every rating drawn read-only, that the sheet is presenting is in that tree; none is left unnamed or unlisted.
    const presented = await page
      .locator('#sheet')
      .locator('input, textarea, select, button, [role="slider"], [role="img"]:not([aria-hidden="true"])')
      .filter({ visible: true })
      .count();
    expect(presented).toBeGreaterThan(0);
    expect(lines).toHaveLength(presented);
    expect(lines.filter((_, index) => names[index] === undefined)).toEqual([]);
    // A health box is named "<level>, <damage>"; its level is what must be unique.
    const identities = names.map((name) => name!.replace(/, (empty|bashing|lethal|aggravated)$/, ''));
    expect(identities.filter((name, index) => identities.indexOf(name) !== index)).toEqual([]);
  },
);

// Out of reach

Then('keyboard focus never landed on a text field or an editable rating', async ({ page, memory }) => {
  const stops = memory.tabbedControls;
  expect(stops.length).toBeGreaterThan(10);
  // A stop is named for its rating reference, its label or its tag: none is a field or a rating's reference.
  expect(stops.filter((stop) => ['input', 'textarea', 'select'].includes(stop) || /^[a-zA-Z]+\.[\w.]+$/.test(stop))).toEqual([]);
  // Nor is any of them left in the tab order, only passed over this time.
  const reachable = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('input, textarea, select, [role="slider"], dot-rating:not([readonly])')]
      .filter((element) => element.checkVisibility() && element.tabIndex >= 0)
      .map((element) => element.tagName.toLowerCase()),
  );
  expect(reachable).toEqual([]);
});
