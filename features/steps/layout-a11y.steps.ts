import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import { startBuild } from './support/builder';
import { SHEET_ADDRESS, createCharacter, openRoster, sheetAddress, sheetField } from './support/pages';
import { expectRating, rating } from './support/ratings';
import { characterWith, saveCharacters } from './support/seed';
import { doneButton, editButton, isEditing } from './support/sheet';

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

Then('the page does not scroll sideways', async ({ page }) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

Then('every control offered in play mode is visible and can be activated', async ({ page }) => {
  // A new character's sheet opens for editing; the controls checked are the ones play mode offers.
  if (SHEET_ADDRESS.test(page.url()) && (await isEditing(page))) {
    await doneButton(page).click();
    await expect(editButton(page)).toBeVisible();
  }
  const all = await controls(page).all();
  // The roster shows a create button and a link and delete button per character;
  // the sheet shows about a hundred fields, ratings and boxes.
  expect(all.length).toBeGreaterThanOrEqual(5);
  const { width } = page.viewportSize()!;
  for (const control of all) {
    await control.scrollIntoViewIfNeeded();
    await expect(control).toBeEnabled();
    const box = (await control.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    // Fails if something else would receive the click.
    await control.click({ trial: true });
  }
});

Given(
  /^a player viewing the (roster|builder|empty roster|roster with characters|sheet|character not found|delete confirmation)$/,
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
        await expect(page.getByRole('link', { name: 'Lucita' })).toBeVisible();
        break;
      case 'sheet':
        await createCharacter(page);
        break;
      case 'character not found':
        await page.goto(sheetAddress('no-such-character'));
        await expect(page.getByRole('heading', { name: 'Character not found' })).toBeVisible();
        break;
      case 'delete confirmation':
        await saveCharacters(page, SAVED.map(characterWith));
        await openRoster(page);
        await page.getByRole('button', { name: 'Delete Lucita', exact: true }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
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

/** Tabs forward to `target`, noting at every stop whether a focus indicator was drawn. */
async function tabTo(
  page: Page,
  target: Locator,
  stops: { control: string; visible: boolean }[],
): Promise<void> {
  for (let presses = 0; presses < 150; presses += 1) {
    await page.keyboard.press('Tab');
    stops.push(
      await page.evaluate(() => {
        const focused = document.activeElement!;
        const style = getComputedStyle(focused);
        const page = getComputedStyle(document.documentElement).backgroundColor;
        return {
          control: focused.getAttribute('aria-label') ?? focused.tagName.toLowerCase(),
          visible:
            focused.matches(':focus-visible') &&
            style.outlineStyle !== 'none' &&
            parseFloat(style.outlineWidth) >= 2 &&
            style.outlineColor !== page &&
            !style.outlineColor.includes('transparent') &&
            !style.outlineColor.endsWith(', 0)'),
        };
      }),
    );
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error('The control was never reached with the Tab key.');
}

When(
  'they use only the keyboard to enter a Name, set Strength to 3, mark 2 Blood Pool and mark bashing damage on Bruised',
  async ({ page, memory }) => {
    await tabTo(page, sheetField(page, 'Name'), memory.focusStops);
    await page.keyboard.type('Lucita');

    await tabTo(page, rating(page, 'Strength'), memory.focusStops);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');

    await tabTo(page, rating(page, 'Blood Pool'), memory.focusStops);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');

    await tabTo(page, page.getByRole('button', { name: /^Bruised, / }), memory.focusStops);
    await page.keyboard.press('Space');
  },
);

Then('those values are shown', async ({ page }) => {
  await expect(sheetField(page, 'Name')).toHaveValue('Lucita');
  await expectRating(rating(page, 'Strength'), 3);
  await expectRating(rating(page, 'Blood Pool'), 2);
  await expect(page.getByRole('button', { name: 'Bruised, bashing', exact: true })).toHaveText('/');
});

Then('keyboard focus was visible at every stop', async ({ memory }) => {
  expect(memory.focusStops.length).toBeGreaterThan(50);
  expect(memory.focusStops.filter((stop) => !stop.visible)).toEqual([]);
});

Then(
  'every text field, rating, tracker and health box has an accessible name unique within the sheet',
  async ({ page }) => {
    // The accessibility tree as assistive technology receives it, one control per line.
    const tree = await page.locator('#sheet').ariaSnapshot();
    const lines = tree.split('\n').filter((line) => /^\s*- (textbox|slider|button)\b/.test(line));
    const names = lines.map((line) => /^\s*- (?:textbox|slider|button) "([^"]+)"/.exec(line)?.[1]);

    // Every control the sheet is presenting is in that tree; none is left unnamed or unlisted.
    const presented = await page
      .locator('#sheet')
      .locator('input, textarea, select, button, [role="slider"]')
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
