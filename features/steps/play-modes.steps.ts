import { expect, type Page } from '@playwright/test';
import type { V20Character } from '../../src/domain/v20/character';
import { Given, Then, When } from './fixtures';
import { announcements } from './support/builder';
import { createCharacter, openRoster, rosterEntries, sheetField } from './support/pages';
import { mark, rating, setRating } from './support/ratings';
import { characterArranged, characterWith, saveCharacters } from './support/seed';
import {
  doneButton,
  editButton,
  enterEditMode,
  expectRatingValue,
  expectReadAs,
  identityMonogram,
  identityName,
  identityRegion,
  identitySummary,
  identityTemperament,
  markDamage,
  openCharacterId,
  openSavedSheet,
  savedCharacter,
  sheetRoot,
} from './support/sheet';
import { acceptWrites, refuseWrites } from './support/storage';

const IDENTITY_FIELDS = ['Name', 'Clan', 'Generation', 'Concept', 'Nature', 'Demeanor'];
const HIDDEN_FIELDS = ['Player', 'Chronicle', 'Sire'];

// Arranging

Given(
  'a saved character named {string} with clan {string}, generation {string}, concept {string}, nature {string} and demeanor {string}',
  async ({ page }, name, clan, generation, concept, nature, demeanor) => {
    await saveCharacters(page, [characterWith({ name, clan, generation, concept, nature, demeanor })]);
  },
);

Given(
  'a saved character with no name, clan, generation, concept, nature or demeanor',
  async ({ page }) => {
    await saveCharacters(page, [characterWith({})]);
  },
);

Given(
  'a saved character with clan {string} and generation {string}',
  async ({ page }, clan: string, generation: string) => {
    await saveCharacters(page, [characterWith({ clan, generation })]);
  },
);

Given("the player has a saved character's sheet open in play mode", async ({ page, memory }) => {
  memory.saved = [characterWith({ name: 'Lucita', clan: 'Lasombra' })];
  await openSavedSheet(page, memory.saved[0]);
});

Given('the player is editing a saved character', async ({ page, memory }) => {
  // Not a name a scenario goes on to enter, so seeing that name proves the edit happened.
  memory.saved = [characterWith({ name: 'Fatima', clan: 'Lasombra' })];
  await openSavedSheet(page, memory.saved[0]);
  await enterEditMode(page);
});

Given('the player created a new V20 character', async ({ page }) => {
  await createCharacter(page);
  // The sheet drops the #edit marker once it has read it; a reload before then would keep it.
  await expect(page).not.toHaveURL(/#edit/);
});

Given(
  'the player created a new V20 character and returned to the roster',
  async ({ page }) => {
    await createCharacter(page);
    await openRoster(page);
  },
);

// Acting

async function openFirstFromRoster(page: Page): Promise<void> {
  await openRoster(page);
  await rosterEntries(page).getByRole('link').first().click();
  await expect(editButton(page).or(doneButton(page))).toBeVisible();
}

When('the player opens that character from the roster', async ({ page }) => {
  await openFirstFromRoster(page);
});

When('they open that character from the roster', async ({ page }) => {
  await openFirstFromRoster(page);
});

When('the player creates a new V20 character from the roster', async ({ page }) => {
  await createCharacter(page);
});

When('they activate {string}', async ({ page }, name: string) => {
  const control = page.getByRole('button', { name, exact: true });
  // An unavailable control (aria-disabled) is still pressed, as a player would; it must do nothing.
  await control.click({ force: (await control.getAttribute('aria-disabled')) === 'true' });
  if (name === 'Edit character') {
    // Ratings become sliders, and focus goes to the first field rather than to a control that changed role.
    await expect(page.getByRole('img', { name: /^Strength \d+ of \d+$/ })).toHaveCount(0);
    await expect(page.getByRole('slider', { name: 'Strength', exact: true })).toBeVisible();
    await expect(sheetField(page, 'Name')).toBeFocused();
  }
});

// Reading the identity

Then(
  'the identity shows the name {string} and the monogram {string}',
  async ({ page }, name: string, letters: string) => {
    await expect(identityName(page)).toHaveText(name);
    await expect(identityMonogram(page)).toHaveText(letters);
  },
);

Then('the identity shows the name {string}', async ({ page }, name: string) => {
  await expect(identityName(page)).toHaveText(name);
});

Then(
  'the identity shows the name {string} and no monogram letters',
  async ({ page }, name: string) => {
    await expect(identityName(page)).toHaveText(name);
    await expect(identityMonogram(page)).toHaveText('');
  },
);

Then('the identity summary reads {string}', async ({ page }, summary: string) => {
  await expect(identitySummary(page)).toHaveText(summary);
});

Then(
  'the identity shows nature and demeanor as {string}',
  async ({ page }, text: string) => {
    await expect(identityTemperament(page)).toHaveText(text);
  },
);

Then('the identity shows no summary and no nature or demeanor', async ({ page }) => {
  await expect(identityRegion(page)).toBeVisible();
  await expect(identitySummary(page)).toBeHidden();
  await expect(identityTemperament(page)).toBeHidden();
  await expect(page.getByText('Nature / Demeanor', { exact: true })).toBeHidden();
});

Then('no identity text field is offered', async ({ page }) => {
  const identity = identityRegion(page);
  await expect(identity).toBeVisible();
  await expect(identity.getByRole('textbox')).toHaveCount(0);
});

// Edit mode

Then(
  'Name, Clan, Generation, Concept, Nature and Demeanor can be edited',
  async ({ page }) => {
    for (const label of IDENTITY_FIELDS) await expect(sheetField(page, label)).toBeEditable();
  },
);

Then('there is no field for Player, Chronicle or Sire', async ({ page }) => {
  await expect(identityRegion(page)).toBeVisible();
  for (const label of HIDDEN_FIELDS) await expect(sheetField(page, label)).toHaveCount(0);
});

Then('the sheet is marked {string}', async ({ page }, badge: string) => {
  await expect(page.getByText(badge, { exact: true })).toBeVisible();
});

Then('the edit button now reads {string}', async ({ page }, label: string) => {
  await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
  await expect(editButton(page)).toBeHidden();
});

Then('keyboard focus is on the Name field', async ({ page }) => {
  await expect(sheetField(page, 'Name')).toBeFocused();
});

Then('keyboard focus is on the {string} button', async ({ page }, name: string) => {
  await expect(page.getByRole('button', { name, exact: true })).toBeFocused();
});

Then('the sheet is in play mode', async ({ page }) => {
  await expect(sheetRoot(page)).toHaveAttribute('data-sheet-mode', 'play');
  await expect(editButton(page)).toBeVisible();
  await expect(identityRegion(page)).toBeVisible();
  await expect(sheetField(page, 'Name')).toBeHidden();
});

const times = async (page: Page, message: string): Promise<number> =>
  (await announcements(page)).filter((entry) => entry === message).length;

// Once, not just at least once: a repeat would be read out twice. A repeat can arrive a
// moment after the first, so the page is given a moment to make one before it is counted.
Then('assistive technology is told {string}', async ({ page }, message: string) => {
  await expect.poll(() => times(page, message)).toBeGreaterThan(0);
  await page.evaluate(() => new Promise((settled) => setTimeout(settled, 150)));
  expect(await times(page, message)).toBe(1);
});

Then("that character's sheet is in edit mode", async ({ page }) => {
  await expect(sheetRoot(page)).toHaveAttribute('data-sheet-mode', 'edit');
  await expect(doneButton(page)).toBeVisible();
  await expect(sheetField(page, 'Name')).toBeEditable();
});

// Ratings

Given(
  'a saved character whose Strength is rated {int} and whose Brawl is rated {int}',
  async ({ page, memory }, strength: number, brawl: number) => {
    memory.saved = [
      characterArranged({}, (character) => {
        character.attributes.strength = strength;
        character.abilities.brawl = brawl;
      }),
    ];
    await saveCharacters(page, memory.saved);
  },
);

Given('a saved character whose Strength is rated {int}', async ({ page, memory }, strength: number) => {
  memory.saved = [
    characterArranged({}, (character) => {
      character.attributes.strength = strength;
    }),
  ];
  await saveCharacters(page, memory.saved);
});

Given("the player has that character's sheet open in play mode", async ({ page, memory }) => {
  await openSavedSheet(page, memory.saved[0]);
});

When('the player clicks the fourth Strength dot and the fourth Brawl dot', async ({ page }) => {
  // The row's name button lies over its dots, so the click lands on it: forced, as a player's would be.
  await mark(rating(page, 'Strength'), 4).click({ force: true });
  await mark(rating(page, 'Brawl'), 4).click({ force: true });
});

When(
  'the player presses the Tab key until focus has gone round the whole page once',
  async ({ page, memory }) => {
    const tabStops = await page.evaluate(
      () =>
        [...document.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input, textarea, select, [tabindex]')]
          .filter((element) => element.tabIndex >= 0 && element.checkVisibility())
          .length,
    );
    memory.tabbedControls = [];
    for (let presses = 0; presses <= tabStops; presses += 1) {
      await page.keyboard.press('Tab');
      const control = await page.evaluate(() => {
        const focused = document.activeElement as HTMLElement;
        return focused.dataset.trait ?? focused.getAttribute('aria-label') ?? focused.tagName.toLowerCase();
      });
      memory.tabbedControls.push(control);
    }
  },
);

Then('keyboard focus never landed on the Strength or Brawl rating', async ({ page, memory }) => {
  const stops = memory.tabbedControls;
  expect(stops.length).toBeGreaterThan(10);
  expect(stops).not.toContain('attributes.strength');
  expect(stops).not.toContain('abilities.brawl');
  // Not merely skipped on this run: neither rating, nor anything inside it, is in the tab order.
  for (const name of ['Strength', 'Brawl']) {
    const tabIndexes = await rating(page, name).evaluate((element) =>
      [element, ...element.querySelectorAll<HTMLElement>('*')].map((node) => (node as HTMLElement).tabIndex),
    );
    expect(tabIndexes.filter((tabIndex) => tabIndex >= 0)).toEqual([]);
  }
});

Then(
  'Strength reads {string} and Brawl reads {string} to assistive technology',
  async ({ page }, strength: string, brawl: string) => {
    await expectReadAs(rating(page, 'Strength').locator('xpath=ancestor::*[@data-trait-key][1]'), 'Strength', strength);
    await expectReadAs(rating(page, 'Brawl').locator('xpath=ancestor::*[@data-trait-key][1]'), 'Brawl', brawl);
  },
);

Then(
  'after reloading the sheet Strength is rated {int} and Brawl is rated {int}',
  async ({ page }, strength: number, brawl: number) => {
    await page.reload();
    await expectRatingValue(rating(page, 'Strength'), strength);
    await expectRatingValue(rating(page, 'Brawl'), brawl);
  },
);

When('they set {word} to {int}', async ({ page }, name: string, value: number) => {
  await setRating(page.getByRole('slider', { name, exact: true }), value);
});

When(
  'they enter {string} as Name and set Strength to {int}',
  async ({ page }, name: string, value: number) => {
    await sheetField(page, 'Name').fill(name);
    await setRating(page.getByRole('slider', { name: 'Strength', exact: true }), value);
  },
);

// Staying within reach

Given(
  'the player is editing a saved character on a {int} by {int} pixel screen',
  async ({ page, memory }, width: number, height: number) => {
    await page.setViewportSize({ width, height });
    memory.saved = [characterWith({ name: 'Lucita', clan: 'Lasombra' })];
    await openSavedSheet(page, memory.saved[0]);
    await enterEditMode(page);
  },
);

When('they scroll to the bottom of the sheet', async ({ page }) => {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect
    .poll(() =>
      page.evaluate(
        () => Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight,
      ),
    )
    .toBe(true);
});

Then('the {string} button is still visible', async ({ page }, name: string) => {
  const button = page.getByRole('button', { name, exact: true });
  await expect(button).toBeInViewport({ ratio: 1 });
  // Visible and not under something else: a click would reach it.
  await button.click({ trial: true });
});

Then('the last card on the sheet is fully visible', async ({ page }) => {
  // The last card in the page, not the paragraph that follows the cards. A card can be taller
  // than a phone screen, so what must be in view is its end: nothing cuts the page short.
  const last = sheetRoot(page).locator('section:visible').last();
  const lastEdge = () => last.evaluate((card) => card.getBoundingClientRect().bottom - window.innerHeight);
  await expect.poll(lastEdge).toBeLessThanOrEqual(0);
});

// A long name

When(
  'the player opens that character on a {int} pixel wide screen',
  async ({ page }, width: number) => {
    await page.setViewportSize({ width, height: 800 });
    await openFirstFromRoster(page);
  },
);

Then('the whole name can be read', async ({ page }) => {
  const fit = await identityName(page).evaluate((name) => ({
    clipped: name.scrollWidth > name.clientWidth,
    left: name.getBoundingClientRect().left,
    right: name.getBoundingClientRect().right,
    screen: document.documentElement.clientWidth,
  }));
  expect(fit.clipped).toBe(false);
  expect(fit.left).toBeGreaterThanOrEqual(0);
  expect(fit.right).toBeLessThanOrEqual(fit.screen);
});

// Values the play view does not show

const HIDDEN_VALUES = {
  notes: '  First line\n    second line, indented\n\tthird line',
  weakness: 'Casts no reflection',
  experience: '12 (3 unspent)',
  bearing: 'Cold',
  bearingModifier: '+1',
};

Given(
  'a saved character with {string} as Player, {string} as Chronicle, {string} as Sire, three lines of Notes with leading spaces, a Weakness, an Experience value, a Bearing, a Bearing modifier and a Background {string} rated {int}',
  async ({ page, memory }, player: string, chronicle: string, sire: string, background: string, rated: number) => {
    memory.saved = [
      characterArranged({ name: 'Fatima', player, chronicle, sire }, (character) => {
        character.notes = HIDDEN_VALUES.notes;
        character.weakness = HIDDEN_VALUES.weakness;
        character.experience = HIDDEN_VALUES.experience;
        character.humanity.bearing = HIDDEN_VALUES.bearing;
        character.humanity.bearingModifier = HIDDEN_VALUES.bearingModifier;
        character.backgrounds[0] = { name: background, rating: rated };
      }),
    ];
    await saveCharacters(page, memory.saved);
  },
);

When(
  'the player opens that character and marks bashing damage on Bruised',
  async ({ page, memory }) => {
    await openSavedSheet(page, memory.saved[0]);
    await page.getByRole('button', { name: /^Bruised, / }).click();
    await expect(page.getByRole('button', { name: 'Bruised, bashing', exact: true })).toBeVisible();
  },
);

When(
  'they enter edit mode, enter {string} as Name and reload the sheet',
  async ({ page }, name: string) => {
    await enterEditMode(page);
    await sheetField(page, 'Name').fill(name);
    await page.reload();
  },
);

Then('the saved character still holds every one of those values exactly', async ({ page, memory }) => {
  const [arranged] = memory.saved;
  const expected: V20Character = {
    ...arranged,
    header: { ...arranged.header, name: 'Lucita' },
    health: { ...arranged.health, bruised: 'bashing' },
  };
  await expect.poll(() => savedCharacter(page, openCharacterId(page))).toEqual(expected);
});

// Save status

const saveStatus = (page: Page) => page.getByRole('banner').locator('#save-status');

Given('the browser begins refusing to store changes', async ({ page }) => {
  await refuseWrites(page);
});

When('the browser accepts changes again', async ({ page }) => {
  await acceptWrites(page);
});

When(
  /^they mark (bashing|lethal|aggravated) damage on ([A-Z][a-z]+)$/,
  async ({ page }, damage: string, level: string) => {
    await markDamage(page, level, damage);
  },
);

Then('the application bar shows no save status', async ({ page }) => {
  await expect(saveStatus(page)).toBeEmpty();
  await expect(saveStatus(page)).toBeHidden();
});

Then('the application bar shows {string}', async ({ page }, text: string) => {
  await expect(saveStatus(page)).toHaveText(text);
  await expect(saveStatus(page)).toBeVisible();
});

Then(
  'assistive technology is alerted that the browser refused to store the latest changes',
  async ({ page }) => {
    await expect
      .poll(() => announcements(page))
      .toEqual(
        expect.arrayContaining([expect.stringMatching(/This browser refused to store your latest changes/)]),
      );
  },
);

// What the redesign leaves out

Then('there is no tab bar, session label or settings control', async ({ page }) => {
  await expect(identityRegion(page)).toBeVisible();
  await expect(page.getByRole('tablist')).toHaveCount(0);
  await expect(page.getByText(/session/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /settings/i })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /settings/i })).toHaveCount(0);
});

Then('the application bar is shown', async ({ page }) => {
  await expect(page.getByRole('banner')).toBeVisible();
});
