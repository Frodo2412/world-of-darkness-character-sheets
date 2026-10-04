import { expect, type Locator, type Page } from '@playwright/test';
import { Given, Then } from './fixtures';
import { createCharacter, openRoster } from './support/pages';
import { characterWith, saveCharacters } from './support/seed';

const WIDE = { width: 1280, height: 900 };
const PHONE = { width: 375, height: 800 };

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

async function topsAndLefts(items: Locator): Promise<{ top: number; left: number }[]> {
  return items.evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      return { top: Math.round(box.top), left: Math.round(box.left) };
    }),
  );
}

/** Side by side: one row, each further right than the last. */
function expectSideBySide(boxes: { top: number; left: number }[]): void {
  expect(boxes).toHaveLength(3);
  expect(new Set(boxes.map((box) => box.top)).size).toBe(1);
  expect(boxes[0].left).toBeLessThan(boxes[1].left);
  expect(boxes[1].left).toBeLessThan(boxes[2].left);
}

Given("a player viewing a character's sheet on a wide screen", async ({ page }) => {
  await page.setViewportSize(WIDE);
  await createCharacter(page);
});

Given(
  /^a player viewing the (roster|sheet) on a 375 pixel wide screen$/,
  async ({ page }, which: string) => {
    await page.setViewportSize(PHONE);
    if (which === 'sheet') {
      await createCharacter(page);
    } else {
      await saveCharacters(page, SAVED.map(characterWith));
      await openRoster(page);
    }
  },
);

Then(
  'the sections appear in the order header, Attributes, Abilities, Advantages, then notes with Humanity, Willpower, Blood Pool, Health, Weakness and Experience',
  async ({ page }) => {
    const headings = page.locator('#sheet h2');
    await expect(headings).toHaveText([
      'Character',
      'Attributes',
      'Abilities',
      'Advantages',
      'Notes',
      'Humanity / Path',
      'Willpower',
      'Temporary Willpower',
      'Blood Pool',
      'Health',
      'Weakness and Experience',
    ]);

    const boxes = await topsAndLefts(headings);
    const [header, attributes, abilities, advantages, notes, humanity, , , , health] = boxes;
    // The four full-width sections run down the page...
    for (const [above, below] of [
      [header, attributes],
      [attributes, abilities],
      [abilities, advantages],
      [advantages, notes],
    ]) {
      expect(above.top).toBeLessThan(below.top);
    }
    // ...and the foot is three columns: notes, then Humanity/Willpower/Blood Pool, then Health.
    expectSideBySide([notes, humanity, health]);
  },
);

Then(
  'Attributes, Abilities and Advantages are each laid out in three columns',
  async ({ page }) => {
    for (const section of ['Attributes', 'Abilities', 'Advantages']) {
      const groups = page.getByRole('region', { name: section }).getByRole('group');
      expectSideBySide(await topsAndLefts(groups));
    }
  },
);

Then('the page does not scroll sideways', async ({ page }) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

Then('every control is visible and can be activated', async ({ page }) => {
  const all = await controls(page).all();
  // The roster shows a create button and a link and delete button per character;
  // the sheet shows about a hundred fields, ratings and boxes.
  expect(all.length).toBeGreaterThanOrEqual(5);
  for (const control of all) {
    await control.scrollIntoViewIfNeeded();
    await expect(control).toBeEnabled();
    const box = (await control.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(PHONE.width);
    // Fails if something else would receive the click.
    await control.click({ trial: true });
  }
});
