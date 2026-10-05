import { expect, type Locator, type Page } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import { announcements } from './support/builder';
import { openRoster, rosterEntries, sheetField } from './support/pages';
import { setRating } from './support/ratings';
import { characterArranged, saveCharacters } from './support/seed';
import {
  bloodPoolCard,
  bloodTotal,
  doneButton,
  editButton,
  enterEditMode,
  openSavedSheet,
  sheetRoot,
  willpowerCard,
  willpowerTotal,
} from './support/sheet';

const button = (page: Page, name: string): Locator => page.getByRole('button', { name, exact: true });

// Arranging

Given(
  'a saved character with generation {string} and {int} blood',
  async ({ page, memory }, generation: string, blood: number) => {
    memory.saved = [
      characterArranged({ name: 'Lucita', generation }, (character) => {
        character.bloodPool.current = blood;
      }),
    ];
    await saveCharacters(page, memory.saved);
  },
);

Given(
  'a saved character with permanent Willpower {int} and temporary Willpower {int}',
  async ({ page, memory }, permanent: number, temporary: number) => {
    memory.saved = [
      characterArranged({ name: 'Lucita' }, (character) => {
        character.willpower = { permanent, temporary };
      }),
    ];
    await saveCharacters(page, memory.saved);
  },
);

Given(
  'a saved character with generation {string}, {int} blood, permanent Willpower {int} and temporary Willpower {int}',
  async ({ page, memory }, generation: string, blood: number, permanent: number, temporary: number) => {
    memory.saved = [
      characterArranged({ name: 'Lucita', generation }, (character) => {
        character.bloodPool.current = blood;
        character.willpower = { permanent, temporary };
      }),
    ];
    await saveCharacters(page, memory.saved);
  },
);

Given(
  'the player is editing a saved character with generation {string} and {int} blood',
  async ({ page, memory }, generation: string, blood: number) => {
    memory.saved = [
      characterArranged({ name: 'Fatima', generation }, (character) => {
        character.bloodPool.current = blood;
      }),
    ];
    await openSavedSheet(page, memory.saved[0]);
    await enterEditMode(page);
  },
);

Given('a saved character whose blood per turn is {string}', async ({ page, memory }, perTurn: string) => {
  memory.saved = [characterArranged({ name: 'Lucita' }, (character) => void (character.bloodPool.perTurn = perTurn))];
  await saveCharacters(page, memory.saved);
});

Given('another saved character with no blood per turn recorded', async ({ page, memory }) => {
  memory.saved.push(characterArranged({ name: 'Ana' }, () => {}));
  await saveCharacters(page, [memory.saved[1]]);
});

// Acting

When('the player opens each character from the roster', async ({ page, memory }) => {
  memory.visited = [];
  for (let position = 0; position < memory.saved.length; position += 1) {
    await openRoster(page);
    await rosterEntries(page).nth(position).getByRole('link').click();
    await expect(editButton(page).or(doneButton(page))).toBeVisible();
    memory.visited.push(await sheetRoot(page).innerText());
  }
});

When('they spend one blood', async ({ page }) => {
  await button(page, 'Spend one blood').click();
});

When('they gain one blood', async ({ page }) => {
  await button(page, 'Gain one blood').click();
});

When('they spend one willpower', async ({ page }) => {
  await button(page, 'Spend one willpower').click();
});

When('they regain one willpower', async ({ page }) => {
  await button(page, 'Regain one willpower').click();
});

When('they spend one blood using the keyboard', async ({ page }) => {
  await button(page, 'Spend one blood').focus();
  await page.keyboard.press('Enter');
});

When(
  'they move keyboard focus to {string} and press Enter twice',
  async ({ page }, name: string) => {
    await button(page, name).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
  },
);

When('they enter {string} as Generation', async ({ page }, text: string) => {
  await sheetField(page, 'Generation').fill(text);
});

When(
  'they enter {string} as Blood per turn and reload the sheet',
  async ({ page }, text: string) => {
    await sheetField(page, 'Blood per turn').fill(text);
    await page.reload();
  },
);

When(
  'they activate {string} and set permanent Willpower to {int}',
  async ({ page }, name: string, value: number) => {
    await button(page, name).click();
    await setRating(page.getByRole('slider', { name: 'Permanent Willpower', exact: true }), value);
  },
);

// Blood Pool

Then('the Blood Pool reads {string}', async ({ page }, reading: string) => {
  await expect(bloodTotal(page)).toHaveText(reading);
});

Then(
  'the Blood Pool reads {string} and is marked {string}',
  async ({ page }, reading: string, mark: string) => {
    await expect(bloodTotal(page)).toHaveText(reading);
    await expect(bloodPoolCard(page).getByText(mark, { exact: true })).toBeVisible();
  },
);

Then('the Blood Pool card says {string}', async ({ page }, text: string) => {
  await expect(bloodPoolCard(page).getByText(text, { exact: true })).toBeVisible();
});

Then('the Blood Pool card shows {string}', async ({ page }, text: string) => {
  await expect(bloodPoolCard(page).getByText(text, { exact: true })).toBeVisible();
});

const tracker = (page: Page): Locator => bloodPoolCard(page).locator('[data-blood-tracker]');

Then(
  'the blood tracker shows {int} segments with {int} filled',
  async ({ page }, segments: number, filled: number) => {
    await expect(tracker(page)).toHaveAttribute('data-form', 'segments');
    await expect(tracker(page).locator('.blood-segment')).toHaveCount(segments);
    await expect(tracker(page).locator('.blood-segment.is-filled')).toHaveCount(filled);
    // Drawn for the eye only: the reading above is what assistive technology gets.
    await expect(tracker(page)).toHaveAttribute('aria-hidden', 'true');
  },
);

/** How much of the bar's length is filled, from 0 to 1. */
async function barFill(page: Page): Promise<number> {
  const bar = (await tracker(page).locator('.blood-bar').boundingBox())!;
  const fill = (await tracker(page).locator('.blood-bar-fill').boundingBox())!;
  return fill.width / bar.width;
}

Then('the blood tracker is one bar filled to half its length', async ({ page }) => {
  await expect(tracker(page)).toHaveAttribute('data-form', 'bar');
  await expect(tracker(page).locator('.blood-segment')).toHaveCount(0);
  expect(await barFill(page)).toBeCloseTo(0.5, 2);
});

Then('the blood tracker is completely filled', async ({ page }) => {
  const segments = tracker(page).locator('.blood-segment');
  if ((await tracker(page).getAttribute('data-form')) === 'bar') {
    expect(await barFill(page)).toBeCloseTo(1, 2);
    return;
  }
  const count = await segments.count();
  expect(count).toBeGreaterThan(0);
  await expect(tracker(page).locator('.blood-segment.is-filled')).toHaveCount(count);
});

Then('assistive technology was told nothing about the Blood Pool', async ({ page }) => {
  expect((await announcements(page)).filter((message) => /Blood Pool/.test(message))).toEqual([]);
});

Then('the first Blood Pool card shows {string}', async ({ memory }, text: string) => {
  expect(memory.visited[0]).toContain(text);
});

Then('the second shows no per-turn text', async ({ memory }) => {
  expect(memory.visited[1]).not.toContain('/ turn');
});

Then('no Blood per turn field is offered', async ({ page }) => {
  await expect(bloodPoolCard(page)).toBeVisible();
  // By role, so a field present in the page but hidden from the player does not count.
  await expect(page.getByRole('textbox', { name: 'Blood per turn', exact: true })).toHaveCount(0);
});

// Willpower

Then('Willpower reads {string}', async ({ page }, reading: string) => {
  await expect(willpowerTotal(page)).toHaveText(reading);
});

Then(
  'Willpower reads {string} with {int} of {int} dots filled',
  async ({ page }, reading: string, filled: number, dots: number) => {
    await expect(willpowerTotal(page)).toHaveText(reading);
    const display = willpowerCard(page).getByRole('img', { name: /^Temporary Willpower \d+ of \d+$/ });
    await expect(display.locator('.rating-mark')).toHaveCount(dots);
    await expect(display.locator('.rating-mark.is-filled')).toHaveCount(filled);
  },
);

Then(
  'Willpower reads {string} and is marked {string}',
  async ({ page }, reading: string, mark: string) => {
    await expect(willpowerTotal(page)).toHaveText(reading);
    await expect(willpowerCard(page).getByText(mark, { exact: true })).toBeVisible();
  },
);

Then('the Blood Pool reads {string} and Willpower reads {string}', async ({ page }, blood: string, will: string) => {
  await expect(bloodTotal(page)).toHaveText(blood);
  await expect(willpowerTotal(page)).toHaveText(will);
});

Then('permanent Willpower cannot be changed', async ({ page }) => {
  await expect(willpowerCard(page)).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Permanent Willpower', exact: true })).toHaveCount(0);
  await expect(willpowerCard(page).getByRole('slider')).toHaveCount(0);
});

// Steppers

const unavailable = (control: Locator) => expect(control).toHaveAttribute('aria-disabled', 'true');

Then('{string} is reported as unavailable', async ({ page }, name: string) => {
  const control = button(page, name);
  await unavailable(control);
  // Never the disabled attribute: that would drop keyboard focus from the button.
  await expect(control).not.toHaveAttribute('disabled');
});

Then('{string} is unavailable', async ({ page }, name: string) => {
  await unavailable(button(page, name));
  await expect(button(page, name)).not.toHaveAttribute('disabled');
});

Then('{string} is available', async ({ page }, name: string) => {
  await expect(button(page, name)).toBeVisible();
  await expect(button(page, name)).not.toHaveAttribute('aria-disabled', 'true');
});

Then('keyboard focus is still on {string}', async ({ page }, name: string) => {
  await expect(button(page, name)).toBeFocused();
});
