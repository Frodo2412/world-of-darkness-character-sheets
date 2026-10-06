import { expect, type Locator, type Page } from '@playwright/test';
import { ABILITY_GROUPS } from '../../src/domain/v20/traits';
import { Given, Then } from './fixtures';
import { characterArranged, characterWith, saveCharacters } from './support/seed';
import { expectReadAs, openSavedSheet, visibleDots } from './support/sheet';

const section = (page: Page, name: string): Locator => page.getByRole('region', { name, exact: true });

/** Every row the group is showing, fixed and custom, in the order drawn. */
const shownRows = (group: Locator): Locator => group.locator('[data-trait-key]:visible');

const rowName = (row: Locator): Locator => row.locator('[data-show="trait.name"], button');

async function boxOf(locator: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  await expect(locator).toBeVisible();
  return (await locator.boundingBox())!;
}

// Cards

Given(
  "a player viewing a saved character's sheet on a {int} pixel wide screen",
  async ({ page, memory }, width: number) => {
    await page.setViewportSize({ width, height: 900 });
    memory.saved = [characterWith({ name: 'Lucita', clan: 'Lasombra' })];
    await openSavedSheet(page, memory.saved[0]);
  },
);

/** Three cards in one row, left to right, drawn as cards. */
async function expectCardsSideBySide(page: Page, heading: string, names: string[]): Promise<void> {
  const cards = names.map((name) => section(page, heading).getByRole('group', { name, exact: true }));
  const boxes = [];
  for (const card of cards) {
    await expect(card).toHaveCSS('border-radius', '10px');
    boxes.push(await boxOf(card));
  }
  expect(new Set(boxes.map((box) => Math.round(box.y))).size).toBe(1);
  expect(boxes[0].x).toBeLessThan(boxes[1].x);
  expect(boxes[1].x).toBeLessThan(boxes[2].x);
  // Side by side, not overlapping.
  expect(boxes[0].x + boxes[0].width).toBeLessThanOrEqual(boxes[1].x);
  expect(boxes[1].x + boxes[1].width).toBeLessThanOrEqual(boxes[2].x);
}

Then('Attributes shows the cards Physical, Social and Mental side by side', async ({ page }) => {
  await expectCardsSideBySide(page, 'Attributes', ['Physical', 'Social', 'Mental']);
});

Then('Abilities shows the cards Talents, Skills and Knowledges side by side', async ({ page }) => {
  await expectCardsSideBySide(page, 'Abilities', ['Talents', 'Skills', 'Knowledges']);
});

Then('the Abilities heading carries the hint {string}', async ({ page }, hint: string) => {
  const abilities = section(page, 'Abilities');
  const heading = await boxOf(abilities.getByRole('heading', { name: 'Abilities', exact: true }));
  const hinted = await boxOf(abilities.getByText(hint, { exact: true }));
  // On the heading's line, to its right.
  expect(hinted.x).toBeGreaterThanOrEqual(heading.x + heading.width);
  expect(Math.abs(hinted.y + hinted.height / 2 - (heading.y + heading.height / 2))).toBeLessThan(heading.height);
});

// Ratings as dots and a number

/** The row a rating belongs to, found from its accessible name. */
const rowOfRating = (page: Page, name: string): Locator =>
  visibleDots(page, new RegExp(`^${name} \\d+ of \\d+$`)).locator('xpath=ancestor::*[@data-trait-key][1]');

Then(
  '{word} shows {int} filled dots out of {int} and the number {int}',
  async ({ page }, name: string, filled: number, dots: number, number: number) => {
    const row = rowOfRating(page, name);
    const control = row.locator('dot-rating');
    await expect(control.locator('.rating-mark')).toHaveCount(dots);
    await expect(control.locator('.rating-mark.is-filled')).toHaveCount(filled);
    await expect(row.locator('[data-show="trait.number"]')).toHaveText(String(number));
  },
);

Then('{word} reads {string} to assistive technology', async ({ page }, name: string, reads: string) => {
  await expectReadAs(rowOfRating(page, name), name, reads);
});

Given(
  'a saved character whose Strength is rated {int} and whose Dexterity is rated {int}',
  async ({ page, memory }, strength: number, dexterity: number) => {
    memory.saved = [
      characterArranged({ name: 'Lucita' }, (character) => {
        character.attributes.strength = strength;
        character.attributes.dexterity = dexterity;
      }),
    ];
    await saveCharacters(page, memory.saved);
  },
);

Then('the Strength and Dexterity numbers line up', async ({ page }) => {
  const rows = ['Strength', 'Dexterity'].map((name) => rowOfRating(page, name));
  const [strength, dexterity] = await Promise.all(
    rows.map((row) => boxOf(row.locator('[data-show="trait.number"]'))),
  );
  expect(Math.round(strength.x + strength.width)).toBe(Math.round(dexterity.x + dexterity.width));
  expect(strength.y).toBeLessThan(dexterity.y);
  // The dots of a five-dot and a ten-dot rating share one slot, so nothing else shifts either.
  const [strengthDots, dexterityDots] = await Promise.all(rows.map((row) => boxOf(row.locator('dot-rating'))));
  expect(Math.round(strengthDots.width)).toBe(Math.round(dexterityDots.width));
  expect(Math.round(strengthDots.x)).toBe(Math.round(dexterityDots.x));
});

// Custom abilities

Given(
  'a saved character with the custom Talent {string} rated {int}, a custom Skill named with only spaces and no custom Knowledge',
  async ({ page, memory }, name: string, rated: number) => {
    memory.saved = [
      characterArranged({ name: 'Lucita' }, (character) => {
        character.customAbilities.talents = { name, rating: rated };
        // A rating on a row with no name is not enough to list it, nor to widen its card's dot slot.
        character.customAbilities.skills = { name: '   ', rating: 8 };
      }),
    ];
    await saveCharacters(page, memory.saved);
  },
);

Then('the Talents list ends with {string} rated {int}', async ({ page }, name: string, rated: number) => {
  const rows = shownRows(page.getByRole('group', { name: 'Talents', exact: true }));
  await expect(rows).toHaveCount(11);
  const last = rows.last();
  await expect(rowName(last)).toHaveText(name);
  await expectReadAs(last, name, `${name} ${rated} of 5`);
  await expect(last.locator('[data-show="trait.number"]')).toHaveText(String(rated));
});

/** No shown row is rated above five, so a card's dot slot is five dots wide, not ten. */
async function expectFiveDotSlot(group: Locator): Promise<void> {
  const slot = await group.locator('.trait-row:visible dot-rating').first().evaluate((dots) => {
    const marks = [...dots.querySelectorAll('.rating-mark')];
    const gap = parseFloat(getComputedStyle(dots).columnGap);
    return {
      marks: marks.length,
      width: dots.getBoundingClientRect().width,
      drawn: marks.length * marks[0].getBoundingClientRect().width + (marks.length - 1) * gap,
    };
  });
  expect(slot.marks).toBe(5);
  expect(slot.width).toBeCloseTo(slot.drawn, 1);
}

Then('the Skills and Knowledges lists show only their ten fixed abilities', async ({ page }) => {
  for (const name of ['Skills', 'Knowledges']) {
    const group = page.getByRole('group', { name, exact: true });
    await expect(shownRows(group)).toHaveCount(10);
    await expect(group.locator('[data-trait-key^="customAbilities."]:visible')).toHaveCount(0);
    await expectFiveDotSlot(group);
  }
});

Then(
  'each of Talents, Skills and Knowledges offers a write-in ability with a name and a rating',
  async ({ page }) => {
    for (const group of ABILITY_GROUPS) {
      const card = page.getByRole('group', { name: group.label, exact: true });
      await expect(card.getByLabel(`${group.customLabel} name`, { exact: true })).toBeVisible();
      await expect(card.getByRole('slider', { name: new RegExp(`^${group.customLabel}(: |$)`) })).toBeVisible();
    }
  },
);

// What the play view no longer shows

Then('there is no field for Notes, Weakness or Experience', async ({ page }) => {
  for (const label of ['Notes', 'Weakness', 'Experience']) {
    await expect(page.getByLabel(label)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: new RegExp(label) })).toHaveCount(0);
  }
});

Then('no creation reminder is shown', async ({ page }) => {
  await expect(page.getByText(/Freebie Points/)).toHaveCount(0);
  await expect(page.getByText(/Attributes: 7\/5\/3/)).toHaveCount(0);
});
