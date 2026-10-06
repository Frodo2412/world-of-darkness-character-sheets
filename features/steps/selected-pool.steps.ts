import { expect, type Locator, type Page } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import { characterArranged, saveCharacters } from './support/seed';
import { selectedPoolCard, traitButton, traitRow } from './support/sheet';

const formula = (page: Page): Locator => selectedPoolCard(page).locator('[data-show="pool.formula"]');
const total = (page: Page): Locator => selectedPoolCard(page).locator('[data-show="pool.total"]');

/** Everything on the sheet that reports itself as chosen for the pool. */
const pressed = (page: Page): Locator => page.locator('[aria-pressed="true"]');

// Arranging

Given(
  'a saved character with Intelligence {int}, Strength {int}, Investigation {int}, Brawl {int}, Law {int} and the custom Knowledge {string} rated {int}',
  async (
    { page, memory },
    intelligence: number,
    strength: number,
    investigation: number,
    brawl: number,
    law: number,
    custom: string,
    rated: number,
  ) => {
    memory.saved = [
      characterArranged({ name: 'Lucita', clan: 'Lasombra' }, (character) => {
        character.attributes.intelligence = intelligence;
        character.attributes.strength = strength;
        character.abilities.investigation = investigation;
        character.abilities.brawl = brawl;
        character.abilities.law = law;
        character.customAbilities.knowledges = { name: custom, rating: rated };
      }),
    ];
    await saveCharacters(page, memory.saved);
  },
);

Given('the sheet is shown on a {int} pixel wide screen', async ({ page }, width: number) => {
  await page.setViewportSize({ width, height: 800 });
});

// Acting

When('they select {word}', async ({ page }, name: string) => {
  await traitButton(page, name).click();
});

When('they select {word} again', async ({ page }, name: string) => {
  await traitButton(page, name).click();
});

When('they select {word} and {word}', async ({ page }, first: string, second: string) => {
  await traitButton(page, first).click();
  await traitButton(page, second).click();
});

When('they select {word} and {string}', async ({ page }, first: string, second: string) => {
  await traitButton(page, first).click();
  await traitButton(page, second).click();
});

When(
  'they select {word} and scroll to {word} and select it',
  async ({ page }, first: string, second: string) => {
    await traitButton(page, first).click();
    await traitButton(page, second).scrollIntoViewIfNeeded();
    await traitButton(page, second).click();
  },
);

When(/^they move keyboard focus to (\w+) and press (Enter|Space)$/, async ({ page }, name: string, key: string) => {
  await traitButton(page, name).focus();
  await page.keyboard.press(key);
});

/** Whether the row is under what is held in view over the page: the Selected pool card or the application bar. */
async function isCovered(row: Locator): Promise<boolean> {
  return row.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const held = [document.querySelector('.pool-card'), document.querySelector('.app-bar')]
      .filter((part): part is Element => part !== null && part.checkVisibility())
      .map((part) => part.getBoundingClientRect());
    // A row flush with the bottom edge is in view; allow for the fraction of a pixel it may stand off by.
    const hidden = rect.top < 0 || rect.bottom > window.innerHeight + 1;
    return hidden || held.some((part) => rect.top < part.bottom && rect.bottom > part.top);
  });
}

// Forward, then back: a row reached from below stops at the bottom of the screen, one reached from above at the top.
When('they move keyboard focus through every ability', async ({ page, memory }) => {
  memory.coveredRows = [];
  const abilities = page.locator('section[aria-labelledby="abilities-heading"] .trait-select:visible');
  const count = await abilities.count();
  expect(count).toBeGreaterThan(30);
  await abilities.first().focus();
  for (const key of ['Tab', 'Shift+Tab']) {
    for (let stop = 1; stop < count; stop += 1) {
      await page.keyboard.press(key);
      const focused = page.locator('.trait-select:focus');
      if (await isCovered(focused.locator('xpath=ancestor::*[@data-trait-key][1]'))) {
        memory.coveredRows.push((await focused.textContent()) ?? '');
      }
    }
  }
});

// Reading the card

Then('the Selected pool card says {string}', async ({ page }, text: string) => {
  await expect(selectedPoolCard(page).getByText(text, { exact: true })).toBeVisible();
});

Then('the Selected pool card shows {string}', async ({ page }, text: string) => {
  await expect(formula(page)).toHaveText(text);
});

Then(
  'the Selected pool card shows {string} and says {string}',
  async ({ page }, text: string, prompt: string) => {
    await expect(formula(page)).toHaveText(text);
    await expect(selectedPoolCard(page).getByText(prompt, { exact: true })).toBeVisible();
  },
);

Then('it shows no dice total', async ({ page }) => {
  await expect(selectedPoolCard(page)).toBeVisible();
  await expect(total(page)).toBeHidden();
  await expect(total(page)).toHaveText('');
});

Then('the dice total is {string}', async ({ page }, text: string) => {
  await expect(total(page)).toHaveText(text);
  // What is said matches what is shown, also after a health change moves the total.
  await expect(page.locator('[data-live="pool"]')).toHaveText(`Dice pool: ${await formula(page).textContent()}, ${text}`);
});

Then('the Attributes heading carries the hint {string}', async ({ page }, hint: string) => {
  const heading = page.locator('.trait-section-head').filter({
    has: page.getByRole('heading', { name: 'Attributes', exact: true }),
  });
  await expect(heading.getByText(hint, { exact: true })).toBeVisible();
});

Then('the Selected pool card is visible without scrolling', async ({ page }) => {
  await expect(selectedPoolCard(page)).toBeInViewport({ ratio: 1 });
});

Then(
  'no focused row is covered by the Selected pool card or the application bar',
  async ({ memory }) => {
    expect(memory.coveredRows).toEqual([]);
  },
);

// Reading the rows

Then('{word} is marked as selected', async ({ page }, name: string) => {
  await expect(traitButton(page, name)).toHaveAttribute('aria-pressed', 'true');
  await expect(traitRow(page, name)).toHaveClass(/is-selected/);
});

Then('{word} is not marked as selected', async ({ page }, name: string) => {
  await expect(traitButton(page, name)).toHaveAttribute('aria-pressed', 'false');
  await expect(traitRow(page, name)).not.toHaveClass(/is-selected/);
});

Then('{word} is marked as selected and {word} is not', async ({ page }, selected: string, other: string) => {
  await expect(traitButton(page, selected)).toHaveAttribute('aria-pressed', 'true');
  await expect(traitRow(page, selected)).toHaveClass(/is-selected/);
  await expect(traitButton(page, other)).toHaveAttribute('aria-pressed', 'false');
  await expect(traitRow(page, other)).not.toHaveClass(/is-selected/);
});

Then('no trait is marked as selected', async ({ page }) => {
  await expect(selectedPoolCard(page)).toBeVisible();
  await expect(pressed(page)).toHaveCount(0);
  await expect(page.locator('.trait-row.is-selected')).toHaveCount(0);
});

Then('no trait offers selection and the Selected pool card is not shown', async ({ page }) => {
  await expect(selectedPoolCard(page)).toBeHidden();
  await expect(page.locator('.trait-select:visible')).toHaveCount(0);
  await expect(page.locator('[aria-pressed]:visible')).toHaveCount(0);
  await expect(traitButton(page, 'Intelligence')).toHaveCount(0);
});

Then('no Virtue row and no Discipline row offers selection', async ({ page }) => {
  for (const name of ['Virtues', 'Disciplines']) {
    const side = page.getByRole('region', { name, exact: true });
    await expect(side).toBeVisible();
    await expect(side.getByRole('button')).toHaveCount(0);
    await expect(side.locator('[aria-pressed], .trait-select')).toHaveCount(0);
  }
});

Then(
  '{word} and {word} are reported as pressed to assistive technology',
  async ({ page }, first: string, second: string) => {
    await expect(page.getByRole('button', { name: first, exact: true, pressed: true })).toBeVisible();
    await expect(page.getByRole('button', { name: second, exact: true, pressed: true })).toBeVisible();
  },
);

Then('the {word} button is described as {string}', async ({ page }, name: string, description: string) => {
  await expect(traitButton(page, name)).toHaveAccessibleDescription(description);
});

// How much a color stands out from another, as WCAG measures it.
const channels = (color: string): number[] => color.match(/[\d.]+/g)!.slice(0, 3).map(Number);

function luminance(color: string): number {
  const [red, green, blue] = channels(color).map((channel) => {
    const unit = channel / 255;
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

const contrast = (first: string, second: string): number => {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
};

Then(
  'the {word} row carries a selection edge that contrasts at least 3 to 1 with an unselected row',
  async ({ page }, name: string) => {
    const edge = await traitRow(page, name).evaluate((row) => {
      const style = getComputedStyle(row);
      return { color: style.borderInlineStartColor, width: parseFloat(style.borderInlineStartWidth) };
    });
    // Any other row is unselected: this scenario selects nothing else.
    const other = await traitRow(page, name === 'Strength' ? 'Dexterity' : 'Strength').evaluate(
      (row) => getComputedStyle(row).backgroundColor,
    );
    expect(edge.width).toBeGreaterThanOrEqual(2);
    expect(contrast(edge.color, other)).toBeGreaterThanOrEqual(3);
  },
);
