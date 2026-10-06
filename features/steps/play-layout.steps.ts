import { expect } from '@playwright/test';
import { Given, Then } from './fixtures';
import { horizontalOverflow } from './support/pages';
import { crowdedCharacter } from './support/seed';
import { boxOf, card, enterEditMode, identityRegion, openSavedSheet } from './support/sheet';

const SCREEN_HEIGHT = 900;

/** The nine cards of the sheet, in reading order. */
const CARDS = [
  'Blood Pool',
  'Willpower',
  'Health',
  'Humanity',
  'Selected pool',
  'Attributes',
  'Abilities',
  'Disciplines',
  'Virtues',
];

// Arranging

Given(
  /^a player viewing a saved character's sheet in (play|edit) mode on a (\d+) pixel wide screen$/,
  async ({ page, memory }, mode: string, width: string) => {
    await page.setViewportSize({ width: Number(width), height: SCREEN_HEIGHT });
    // Names and ratings long enough to crowd a narrow card.
    memory.saved = [
      crowdedCharacter({
        name: 'Fatima al-Faqadi of the Web of Knives',
        clan: 'Assamite',
        concept: 'Antiquarian',
        nature: 'Visionary',
        demeanor: 'Bon Vivant',
      }),
    ];
    await openSavedSheet(page, memory.saved[0]);
    if (mode === 'edit') await enterEditMode(page);
  },
);

// The wide layout

Then(
  'the application bar, character identity, live resources and workspace appear in that order from the top',
  async ({ page }) => {
    const parts = [
      page.locator('header'),
      identityRegion(page),
      page.locator('.resources-row'),
      page.locator('.workspace'),
    ];
    const boxes = await Promise.all(parts.map(boxOf));
    boxes.forEach((box, index) => {
      if (index > 0) expect(box.y).toBeGreaterThanOrEqual(boxes[index - 1].y + boxes[index - 1].height - 1);
    });
    expect(boxes[0].y).toBe(0);
  },
);

Then('Blood Pool, Willpower, Health and Humanity sit side by side in one row', async ({ page }) => {
  const boxes = await Promise.all(
    ['Blood Pool', 'Willpower', 'Health', 'Humanity'].map((name) => boxOf(card(page, name))),
  );
  expect(new Set(boxes.map((box) => Math.round(box.y))).size).toBe(1);
  boxes.forEach((box, index) => {
    if (index > 0) expect(box.x).toBeGreaterThanOrEqual(boxes[index - 1].x + boxes[index - 1].width);
  });
});

Then(
  'Selected pool, Disciplines and Virtues are stacked in a column to the right of the traits',
  async ({ page }) => {
    const column = await Promise.all(
      ['Selected pool', 'Disciplines', 'Virtues'].map((name) => boxOf(card(page, name))),
    );
    expect(new Set(column.map((box) => Math.round(box.x))).size).toBe(1);
    column.forEach((box, index) => {
      if (index > 0) expect(box.y).toBeGreaterThanOrEqual(column[index - 1].y + column[index - 1].height);
    });
    // Right of every trait card, none of which is wider than the space left for it.
    for (const traitCard of await page.locator('.trait-card').all()) {
      const box = await boxOf(traitCard);
      expect(box.x + box.width).toBeLessThanOrEqual(column[0].x);
    }
  },
);

Then(
  'the application bar is {int} pixels high, the identity {int} pixels high, the right column {int} pixels wide and a trait row {int} pixels high',
  async ({ page }, bar: number, identity: number, column: number, row: number) => {
    expect((await boxOf(page.locator('header'))).height).toBe(bar);
    expect((await boxOf(identityRegion(page))).height).toBe(identity);
    expect((await boxOf(card(page, 'Selected pool'))).width).toBe(column);
    expect((await boxOf(page.locator('.trait-row:visible').first())).height).toBe(row);
  },
);

// Fitting the screen

Then('the page is no wider than the screen', async ({ page }) => {
  expect(await horizontalOverflow(page)).toBe(0);
});

Then("every card's box lies within the screen width", async ({ page }) => {
  const { width } = page.viewportSize()!;
  // The nine named cards, not a count that a missing card could still reach.
  for (const name of CARDS) {
    const box = await boxOf(card(page, name));
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
  }
});

Then(
  'the cards come in the order Blood Pool, Willpower, Health, Humanity, Selected pool, Attributes, Abilities, Disciplines, Virtues',
  async ({ page }) => {
    // In the page's own order, which is the reading order; on one column that is also the order down the screen.
    const drawn = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('#sheet section[aria-labelledby]')]
        .filter((section) => section.checkVisibility())
        .map((section) => ({
          name: document.getElementById(section.getAttribute('aria-labelledby')!)!.textContent,
          top: section.getBoundingClientRect().top + window.scrollY,
        }))
        .filter(({ name }) => name !== 'Character'),
    );
    expect(drawn.map(({ name }) => name)).toEqual(CARDS);
    const tops = drawn.map(({ top }) => top);
    expect(tops).toEqual([...tops].sort((a, b) => a - b));
  },
);

Then('the health levels are listed one per line', async ({ page }) => {
  const levels = await page.locator('.health-levels > li').all();
  expect(levels).toHaveLength(7);
  const boxes = await Promise.all(levels.map(boxOf));
  boxes.forEach((box, index) => {
    if (index > 0) {
      expect(box.y).toBeGreaterThanOrEqual(boxes[index - 1].y + boxes[index - 1].height - 1);
      expect(Math.round(box.x)).toBe(Math.round(boxes[0].x));
    }
  });
});

Then('no text on the sheet is wider than the element that holds it', async ({ page }) => {
  const overflowing = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('#sheet *')]
      .filter((element) => {
        const { display } = getComputedStyle(element);
        // Inline boxes have no width of their own; a box a pixel wide is one hidden on purpose.
        return display !== 'inline' && display !== 'contents' && element.clientWidth > 1 && element.checkVisibility();
      })
      // A text field scrolls a value longer than itself by design; its box is checked below instead.
      .filter((element) => !(element instanceof HTMLInputElement) && element.scrollWidth > element.clientWidth)
      .map((element) => `${element.tagName.toLowerCase()}.${element.className}`),
  );
  expect(overflowing).toEqual([]);

  // A text field holding a long value stays inside the card that holds it.
  const spilling = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLInputElement>('#sheet input')]
      .filter((input) => input.checkVisibility())
      .filter((input) => input.getBoundingClientRect().right > input.closest('.card, .identity-fields')!.getBoundingClientRect().right)
      .map((input) => input.getAttribute('aria-label') ?? input.dataset.text),
  );
  expect(spilling).toEqual([]);
});

// Touch targets

Then('every stepper button, health box and selectable row is at least 44 pixels high', async ({ page }) => {
  for (const selector of ['.stepper-button', '.health-box', '.trait-row:has(.trait-select)']) {
    const controls = await page.locator(selector).filter({ visible: true }).all();
    expect(controls.length).toBeGreaterThan(0);
    for (const control of controls) {
      expect((await control.boundingBox())!.height, selector).toBeGreaterThanOrEqual(44);
    }
  }
});
