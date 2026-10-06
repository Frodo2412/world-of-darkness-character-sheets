import { readFileSync } from 'node:fs';
import { expect, type Locator, type Page } from '@playwright/test';
import type { V20Character } from '../../src/domain/v20/character';
import type { HealthLevelKey } from '../../src/domain/v20/traits';
import { Given, Then, When } from './fixtures';
import { announcements } from './support/announcements';
import { openRoster, rosterEntries, sheetAddress, sheetField } from './support/pages';
import { rating, setRating } from './support/ratings';
import { characterArranged, characterWith, givenSaved, saveCharacters } from './support/seed';
import {
  bloodPoolCard,
  bloodTotal,
  doneButton,
  editButton,
  enterEditMode,
  expectDamage,
  healthCard,
  humanityCard,
  markDamage,
  openSavedSheet,
  willpowerCard,
  willpowerTotal,
} from './support/sheet';

const button = (page: Page, name: string): Locator => page.getByRole('button', { name, exact: true });

// Arranging

Given(
  'a saved character with generation {string} and {int} blood',
  async ({ page, memory }, generation: string, blood: number) => {
    await givenSaved(page, memory, { name: 'Lucita', generation }, (character) => {
      character.bloodPool.current = blood;
    });
  },
);

Given(
  'a saved character with permanent Willpower {int} and temporary Willpower {int}',
  async ({ page, memory }, permanent: number, temporary: number) => {
    await givenSaved(page, memory, { name: 'Lucita' }, (character) => {
      character.willpower = { permanent, temporary };
    });
  },
);

Given(
  'a saved character with generation {string}, {int} blood, permanent Willpower {int} and temporary Willpower {int}',
  async ({ page, memory }, generation: string, blood: number, permanent: number, temporary: number) => {
    await givenSaved(page, memory, { name: 'Lucita', generation }, (character) => {
      character.bloodPool.current = blood;
      character.willpower = { permanent, temporary };
    });
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
  await givenSaved(page, memory, { name: 'Lucita' }, (character) => {
    character.bloodPool.perTurn = perTurn;
  });
});

Given('another saved character with no blood per turn recorded', async ({ page, memory }) => {
  memory.saved.push(characterArranged({ name: 'Ana' }, () => {}));
  await saveCharacters(page, [memory.saved[1]]);
});

Given(/^a saved character with lethal damage on (.+)$/, async ({ page, memory }, levels: string) => {
  await givenSaved(page, memory, { name: 'Lucita' }, (character) => {
    for (const level of levels.split(' and ')) {
      character.health[level.toLowerCase() as HealthLevelKey] = 'lethal';
    }
  });
});

Given("the player has a saved, unwounded character's sheet open in play mode", async ({ page, memory }) => {
  memory.saved = [characterWith({ name: 'Lucita' })];
  await openSavedSheet(page, memory.saved[0]);
});

Given('a saved character with Humanity {int} on the path {string}', async ({ page, memory }, humanity: number, path: string) => {
  await givenSaved(page, memory, { name: 'Lucita' }, (character) => {
    character.humanity.rating = humanity;
    character.humanity.pathName = path;
  });
});

Given('another saved character with Humanity {int} and no path name', async ({ page, memory }, humanity: number) => {
  memory.saved.push(
    characterArranged({ name: 'Ana' }, (character) => {
      character.humanity.rating = humanity;
    }),
  );
  await saveCharacters(page, [memory.saved[1]]);
});

Given('a saved character with Humanity {int}', async ({ page, memory }, humanity: number) => {
  await givenSaved(page, memory, { name: 'Lucita' }, (character) => {
    character.humanity.rating = humanity;
  });
});

// Acting

When('the player opens each character from the roster', async ({ page, memory }) => {
  memory.visited = [];
  for (let position = 0; position < memory.saved.length; position += 1) {
    await openRoster(page);
    await rosterEntries(page).nth(position).getByRole('link').click();
    await expect(editButton(page).or(doneButton(page))).toBeVisible();
    memory.visited.push(await bloodPoolCard(page).innerText());
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

When(/^they mark ([A-Z][a-z]+) until it is empty$/, async ({ page }, level: string) => {
  await markDamage(page, level, 'empty');
});

When(
  'they spend one blood, spend one willpower, mark bashing damage on Bruised, lethal on Hurt and aggravated on Injured',
  async ({ page }) => {
    await button(page, 'Spend one blood').click();
    await button(page, 'Spend one willpower').click();
    await markDamage(page, 'Bruised', 'bashing');
    await markDamage(page, 'Hurt', 'lethal');
    await markDamage(page, 'Injured', 'aggravated');
  },
);

When('they spend one blood and mark bashing damage on Bruised', async ({ page }) => {
  await button(page, 'Spend one blood').click();
  await markDamage(page, 'Bruised', 'bashing');
});

When(
  'they activate {string}, set Humanity to {int} and enter {string} as the path name',
  async ({ page }, name: string, value: number, path: string) => {
    await button(page, name).click();
    await setRating(rating(page, 'Humanity'), value);
    await sheetField(page, 'Path name').fill(path);
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

Then(/^the Blood Pool card (?:says|shows) "([^"]*)"$/, async ({ page }, text: string) => {
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
  expect((await announcements(page)).filter((message) => /blood pool/i.test(message))).toEqual([]);

  // Positive control: the watcher does hear the Blood Pool's live region, so the silence above means something.
  const region = page.locator('[data-live="blood"]');
  await region.evaluate((element) => void (element.textContent = 'Watcher check'));
  await expect.poll(() => announcements(page)).toContain('Watcher check');
  await region.evaluate((element) => void (element.textContent = ''));
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

Then(/^"([^"]*)" is (?:reported as )?unavailable$/, async ({ page }, name: string) => {
  const control = button(page, name);
  await unavailable(control);
  // Never the disabled attribute: that would drop keyboard focus from the button.
  await expect(control).not.toHaveAttribute('disabled');
});

Then('{string} is available', async ({ page }, name: string) => {
  await expect(button(page, name)).toBeVisible();
  await expect(button(page, name)).not.toHaveAttribute('aria-disabled', 'true');
});

Then('keyboard focus is still on {string}', async ({ page }, name: string) => {
  await expect(button(page, name)).toBeFocused();
});

// Health

/** The wound beside the Health heading, which is absent while the character is not wounded. */
const woundReadout = (page: Page): Locator => healthCard(page).locator('[data-show="health.wound"]');

Then('the Health heading shows {string}', async ({ page }, wound: string) => {
  if (wound === '') {
    await expect(woundReadout(page)).toBeHidden();
    return;
  }
  await expect(woundReadout(page)).toHaveText(wound);
  await expect(healthCard(page).getByRole('heading', { name: 'Health' })).toBeVisible();
});

Then('the Health heading shows no wound', async ({ page }) => {
  await expect(woundReadout(page)).toBeHidden();
});

Then(
  'the health legend lists {string}, {string} and {string} in that order',
  async ({ page }, first: string, second: string, third: string) => {
    await expect(healthCard(page).locator('.health-marks > li')).toHaveText([first, second, third]);
    await expect(healthCard(page).getByText('Select a box to cycle', { exact: true })).toBeVisible();
  },
);

Then('each legend entry shows its own mark image, and no two entries share one', async ({ page }) => {
  const entries = healthCard(page).locator('.health-marks > li');
  await expect(entries).toHaveCount(3);
  const sources: string[] = [];
  for (const label of ['Bashing', 'Lethal', 'Aggravated']) {
    const image = entries.filter({ hasText: label }).locator('img');
    await expect(image).toHaveCount(1);
    const { source, drawn } = await image.evaluate((element) => {
      const loaded = element as HTMLImageElement;
      return { source: loaded.currentSrc, drawn: loaded.complete && loaded.naturalWidth > 0 };
    });
    expect(drawn).toBe(true);
    // The file served is the one for this label: the same bytes as the icon the boxes are drawn from.
    const served = await (await page.request.get(source)).text();
    expect(served).toBe(readFileSync(`src/assets/icons/${label.toLowerCase()}.svg`, 'utf8'));
    sources.push(source);
  }
  expect(new Set(sources).size).toBe(3);
});

Then(
  'Bruised shows bashing, Hurt shows lethal and Injured shows aggravated damage',
  async ({ page }) => {
    await expectDamage(page, 'Bruised', 'bashing');
    await expectDamage(page, 'Hurt', 'lethal');
    await expectDamage(page, 'Injured', 'aggravated');
  },
);

Then(
  'the Blood Pool reads {string} and Bruised shows bashing damage',
  async ({ page }, reading: string) => {
    await expect(bloodTotal(page)).toHaveText(reading);
    await expectDamage(page, 'Bruised', 'bashing');
  },
);

// Humanity

/** Opens a saved character's sheet, so each Humanity card is read in a page of its own. */
async function openSaved(page: Page, character: V20Character): Promise<void> {
  await page.goto(sheetAddress(character.id));
  await expect(editButton(page)).toBeVisible();
}

const pathName = (page: Page): Locator => humanityCard(page).locator('[data-show="humanity.path"]');

Then(
  'the first Humanity card shows the number {int}, {int} of 10 dots filled and {string}',
  async ({ page, memory }, number: number, filled: number, path: string) => {
    await openSaved(page, memory.saved[0]);
    await expect(humanityCard(page).locator('[data-show="humanity.number"]')).toHaveText(String(number));
    const dots = rating(page, 'Humanity');
    await expect(dots.locator('.rating-mark')).toHaveCount(10);
    await expect(dots.locator('.rating-mark.is-filled')).toHaveCount(filled);
    await expect(pathName(page)).toHaveText(path);
  },
);

Then('the second shows the number {int} and no path name', async ({ page, memory }, number: number) => {
  await openSaved(page, memory.saved[1]);
  await expect(humanityCard(page).locator('[data-show="humanity.number"]')).toHaveText(String(number));
  await expect(pathName(page)).toBeHidden();
});

Then('the Humanity rating cannot be changed and no path name field is offered', async ({ page }) => {
  await expect(humanityCard(page)).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Humanity', exact: true })).toHaveCount(0);
  await expect(humanityCard(page).getByRole('slider')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Path name', exact: true })).toHaveCount(0);
});

Then('no field for Bearing or Bearing modifier is offered', async ({ page }) => {
  await expect(page.getByRole('textbox', { name: /Bearing/ })).toHaveCount(0);
  await expect(page.getByLabel(/Bearing/)).toHaveCount(0);
});

Then('the Humanity card shows the number {int} and {string}', async ({ page }, number: number, path: string) => {
  await expect(humanityCard(page).locator('[data-show="humanity.number"]')).toHaveText(String(number));
  await expect(pathName(page)).toHaveText(path);
});
