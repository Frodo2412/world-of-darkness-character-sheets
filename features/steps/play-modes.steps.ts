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
  identityMonogram,
  identityName,
  identitySummary,
  identityTemperament,
  openCharacterId,
  openSavedSheet,
  savedCharacter,
  sheetRoot,
} from './support/sheet';

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
  memory.saved = [characterWith({ name: 'Lucita', clan: 'Lasombra' })];
  await openSavedSheet(page, memory.saved[0]);
  await enterEditMode(page);
});

Given('the player created a new V20 character', async ({ page }) => {
  await createCharacter(page);
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
  await page.getByRole('button', { name, exact: true }).click();
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
  await expect(identitySummary(page)).toBeHidden();
  await expect(identityTemperament(page)).toBeHidden();
  await expect(page.getByText('Nature / Demeanor', { exact: true })).toBeHidden();
});

Then('no identity text field is offered', async ({ page }) => {
  await expect(page.getByRole('region', { name: 'Character', exact: true }).getByRole('textbox')).toHaveCount(0);
});

// Edit mode

Then(
  'Name, Clan, Generation, Concept, Nature and Demeanor can be edited',
  async ({ page }) => {
    for (const label of IDENTITY_FIELDS) await expect(sheetField(page, label)).toBeEditable();
  },
);

Then('there is no field for Player, Chronicle or Sire', async ({ page }) => {
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

Then('the sheet is in edit mode', async ({ page }) => {
  await expect(sheetRoot(page)).toHaveAttribute('data-sheet-mode', 'edit');
  await expect(doneButton(page)).toBeVisible();
  await expect(sheetField(page, 'Name')).toBeEditable();
});

Then('the sheet is in play mode', async ({ page }) => {
  await expect(sheetRoot(page)).toHaveAttribute('data-sheet-mode', 'play');
  await expect(editButton(page)).toBeVisible();
  await expect(sheetField(page, 'Name')).toBeHidden();
});

Then('assistive technology is told {string}', async ({ page }, message: string) => {
  await expect.poll(() => announcements(page)).toContain(message);
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
  await mark(rating(page, 'Strength'), 4).click();
  await mark(rating(page, 'Brawl'), 4).click();
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
    memory.focusStops = [];
    for (let presses = 0; presses <= tabStops; presses += 1) {
      await page.keyboard.press('Tab');
      const control = await page.evaluate(() => {
        const focused = document.activeElement as HTMLElement;
        return focused.dataset.trait ?? focused.getAttribute('aria-label') ?? focused.tagName.toLowerCase();
      });
      memory.focusStops.push({ control, visible: true });
    }
  },
);

Then('keyboard focus never landed on the Strength or Brawl rating', async ({ memory }) => {
  const stops = memory.focusStops.map((stop) => stop.control);
  expect(stops.length).toBeGreaterThan(10);
  expect(stops).not.toContain('attributes.strength');
  expect(stops).not.toContain('abilities.brawl');
});

Then(
  'Strength reads {string} and Brawl reads {string} to assistive technology',
  async ({ page }, strength: string, brawl: string) => {
    await expect(page.getByRole('img', { name: strength, exact: true })).toBeVisible();
    await expect(page.getByRole('img', { name: brawl, exact: true })).toBeVisible();
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
  await expect(sheetRoot(page).locator(':scope > :visible').last()).toBeInViewport({ ratio: 1 });
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

// What the redesign leaves out

Then('there is no tab bar, session label or settings control', async ({ page }) => {
  await expect(page.getByRole('tablist')).toHaveCount(0);
  await expect(page.getByText(/session/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /settings/i })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /settings/i })).toHaveCount(0);
});

Then('the application bar is shown', async ({ page }) => {
  await expect(page.getByRole('banner')).toBeVisible();
});
