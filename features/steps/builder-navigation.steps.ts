// The builder's sidebar, screen counter, router, Back and Continue: nine screens in five phases,
// opened in any order, with Continue explaining itself while a pool is unfinished.

import { expect, type Locator, type Page } from '@playwright/test';
import {
  attributesRanked,
  bloodPool,
  clan,
  completeBuild,
  creation,
  rank,
  type Step,
} from '../../src/domain/v20/creation/testing/play';
import { PHASES, SCREENS } from '../../src/domain/v20/creation/rules';
import { Given, Then, When, memoryFor, type ScenarioMemory } from './fixtures';
import { expectUniqueControlNames } from './support/accessibility';
import {
  buildWith,
  openPlayed,
  openPlayedFrom,
  openStep,
  rateTrait,
  screenTitle,
  stepHeading,
  stepLink,
  stepNav,
} from './support/builder';
import { expectOnRoster } from './support/pages';
import { expectNoSidewaysScrollAt, expectNoViolationsAt, expectOneH1 } from './support/standards';
import { escaped } from './support/text';

/** What the "I choose it" step chooses: the control an earlier step in the scenario pointed at. */
interface Pointed {
  chosen?: Locator;
}
const pointed = (world: { memory: ScenarioMemory }): Pointed => memoryFor(world, 'navigation', (): Pointed => ({}));

const footer = (page: Page): Locator => page.locator('#builder [data-screen-nav]');
const continueButton = (page: Page): Locator => footer(page).locator('[data-continue]');
const backButton = (page: Page): Locator => footer(page).locator('[data-back]');
const reasonText = (page: Page): Locator => footer(page).locator('[data-continue-reason]');
const goToButton = (page: Page): Locator => footer(page).locator('[data-continue-go]');

/** Any screen's title, for the step texts that name one. */
const SCREEN = `(${SCREENS.map((screen) => escaped(screen.title)).join('|')})`;

/** A step text made of `parts`, with each `SCREEN` placeholder (`%`) a screen's title. */
const saying = (...parts: string[]): RegExp => new RegExp(`^${parts.join(SCREEN)}$`);

/** The sidebar's item for the screen titled `title` (any case for the Concept the old scenarios shorten). */
function screenItem(page: Page, title: string): Locator {
  const wanted = screenTitle(title);
  const id = SCREENS.find((screen) => screen.title === wanted)?.id;
  if (id === undefined) throw new Error(`There is no screen called "${title}"`);
  return stepNav(page).locator(`[data-screen="${id}"]`);
}

/** "A, B and C" as its names. */
const names = (list: string): string[] => list.split(/, | and /);

// Arranged builds. Each is a complete Brujah build with one thing taken away, or a blank build.

const UNFINISHED: Record<string, { build: () => Step[]; blank?: true }> = {
  '1 Physical Attribute dot is unplaced': { build: () => [creation('attribute:strength', 2)] },
  '2 Physical Attribute dots are unplaced': { build: () => [creation('attribute:strength', 1)] },
  '2 Physical and 1 Mental Attribute dots are unplaced': {
    build: () => [creation('attribute:strength', 1), creation('attribute:perception', 1)],
  },
  'no Attribute group has a priority': { build: () => [], blank: true },
  'Social is 4 dots over its allotment': {
    build: () => [
      rank('social', 'primary'),
      rank('physical', 'secondary'),
      rank('mental', 'tertiary'),
      creation('attribute:charisma', 4),
      creation('attribute:manipulation', 4),
      creation('attribute:appearance', 2),
      rank('social', 'tertiary'),
    ],
    blank: true,
  },
  '1 Skill dot is unplaced': { build: () => [creation('ability:drive', 2)] },
  'no clan is chosen': { build: () => [], blank: true },
  '3 Background dots and 1 Virtue dot are unplaced': {
    build: () => [creation('background:Resources', 0), creation('background:Contacts', 0), creation('virtue:conscience', 3)],
  },
};

// Given

const openBlank = async ({ page }: { page: Page }): Promise<void> => {
  await openPlayed(page);
};

Given(new RegExp(`^a build where (${Object.keys(UNFINISHED).map(escaped).join('|')})$`), async ({ page }, unfinished: string) => {
  const arranged = UNFINISHED[unfinished];
  await openPlayedFrom(page, arranged.blank ? buildWith() : completeBuild('Brujah'), ...arranged.build());
});

Given('a build with nothing placed', openBlank);

Given('a build with no name', openBlank);

Given('a build with Visionary as Nature', async ({ page }) => {
  await openPlayedFrom(page, buildWith({ concept: { nature: 'Visionary' } }));
});

Given('a build with a recorded Blood Pool of {int}', async ({ page }, value: number) => {
  await openPlayed(page, bloodPool(value));
});

Given('a build with no Blood Pool recorded', openBlank);

Given('a build with nothing outstanding', async ({ page }) => {
  await openPlayedFrom(page, completeBuild('Brujah'));
});

Given('a build with items outstanding', openBlank);

Given('every Attribute dot is placed and no Ability dot is placed and a clan is chosen', async ({ page }) => {
  await openPlayed(
    page,
    clan('Brujah'),
    ...attributesRanked,
    creation('attribute:strength', 3),
    creation('attribute:dexterity', 3),
    creation('attribute:stamina', 4),
    creation('attribute:charisma', 3),
    creation('attribute:manipulation', 3),
    creation('attribute:appearance', 2),
    creation('attribute:perception', 2),
    creation('attribute:intelligence', 2),
    creation('attribute:wits', 2),
  );
});

Given('a build where the last Physical Attribute dot has just been placed', async ({ page }) => {
  await openPlayedFrom(page, completeBuild('Brujah'), creation('attribute:strength', 2));
  await openStep(page, 'Attributes');
  await rateTrait(page, 'Strength', 3);
  await openStep(page, 'Character concept');
});

Given(saying('I am on the ', ' screen'), async ({ page }, title: string) => {
  await openStep(page, title);
});

// When

When(saying('I open the ', ' screen'), async ({ page }, title: string) => {
  await openStep(page, title);
});

When(saying('I choose ', ' in the sidebar'), async ({ page }, title: string) => {
  await stepLink(page, title).click();
});

When(saying('I choose ', ' in the sidebar and then ', ''), async ({ page }, first: string, second: string) => {
  await stepLink(page, first).click();
  await expect(stepHeading(page, first)).toBeVisible();
  await stepLink(page, second).click();
  await expect(stepHeading(page, second)).toBeVisible();
});

When('I use the browser Back button', async ({ page }) => {
  await page.goBack();
});

When('I choose Back', async ({ page }) => {
  await backButton(page).click();
});

When('I choose it', async ({ memory }) => {
  const { chosen } = pointed({ memory });
  if (chosen === undefined) throw new Error('No control was pointed at before "I choose it"');
  await chosen.click();
});

When('I focus Continue with the keyboard and press Enter', async ({ page }) => {
  await continueButton(page).focus();
  await page.keyboard.press('Enter');
});

When('I open the builder with {string} as its screen', async ({ page }, address: string) => {
  const url = new URL(page.url());
  url.hash = address;
  // From a blank page, so the builder starts on that address rather than being moved to it.
  await page.goto('about:blank');
  await page.goto(url.toString());
  await expect(page.getByRole('heading', { name: 'Build a character' })).toBeVisible();
});

// Then

Then('the sidebar lists five phases', async ({ page }) => {
  const phases = await stepNav(page).locator('[data-phase]').evaluateAll((items) => items.map((item) => (item as HTMLElement).dataset.phase));
  expect(phases).toEqual([...PHASES]);
});

Then(/^it lists (.+)$/, async ({ page }, list: string) => {
  const titles = await stepNav(page)
    .locator('[data-screen]')
    .evaluateAll((items) => items.map((item) => item.querySelector('a, .builder-screen-title')!.textContent!.trim()));
  expect(titles).toEqual(names(list));
});

Then('the current screen is marked {string}', async ({ page }, mark: string) => {
  const current = stepNav(page).locator('[data-screen-current]:not([hidden])');
  await expect(current).toHaveCount(1);
  await expect(current).toHaveText(mark);
  await expect(stepNav(page).locator('a[aria-current="step"]')).toHaveCount(1);
});

Then('the screen counter reads {string}', async ({ page }, text: string) => {
  await expect(stepNav(page).locator('[data-screen-counter]')).toHaveText(text);
});

Then(new RegExp(`^(?:the sidebar|it) marks ${SCREEN} "(Done|To do|Optional)"$`), async ({ page }, title: string, status: string) => {
  await expect(screenItem(page, title).locator('[data-screen-state]')).toHaveText(status);
});

Then('each state is present as text, not only as colour', async ({ page }) => {
  const items = stepNav(page).locator('[data-screen]').filter({ has: page.locator('a') });
  expect(await items.count()).toBe(SCREENS.length - 1);
  for (const item of await items.all()) {
    const state = item.locator('[data-screen-state]');
    await expect(state).toHaveText(/^(Done|To do|Optional)$/);
    // The words reach assistive technology too, and the icon beside them is only a mark.
    await expect(item.getByRole('link')).toHaveAccessibleDescription(/(Done|To do|Optional)$/);
    await expect(item.locator('.builder-screen-icon')).toHaveAttribute('aria-hidden', 'true');
  }
});

Then('the primary button reads {string}', async ({ page }, label: string) => {
  await expect(continueButton(page)).toHaveText(label);
});

Then('Continue is disabled', async ({ page }) => {
  await expect(continueButton(page)).toHaveAttribute('aria-disabled', 'true');
});

Then('the text beside it reads {string}', async ({ page }, reason: string) => {
  await expect(reasonText(page)).toBeVisible();
  await expect(reasonText(page)).toHaveText(reason);
  await expect(continueButton(page)).toHaveAccessibleDescription(reason);
});

Then('Continue can be reached with the keyboard', async ({ page }) => {
  const button = continueButton(page);
  // aria-disabled, not the disabled attribute, so it stays in the tab order.
  expect(await button.evaluate((element: HTMLButtonElement) => element.disabled)).toBe(false);
  await button.focus();
  await expect(button).toBeFocused();
});

Then(saying('I am still on the ', ' screen'), async ({ page }, title: string) => {
  await expect(stepHeading(page, title)).toBeVisible();
  await expect(stepLink(page, title)).toHaveAttribute('aria-current', 'step');
});

Then('the reason text is still visible', async ({ page }) => {
  await expect(reasonText(page)).toBeVisible();
  // Trying it said the reason, politely, in a region of its own.
  await expect(footer(page).locator('[data-continue-announce]')).toHaveText((await reasonText(page).textContent())!);
});

Then('the reason has a button {string}', async ({ page, memory }, name: string) => {
  const button = footer(page).getByRole('button', { name, exact: true });
  await expect(button).toBeVisible();
  pointed({ memory }).chosen = button;
});

Then(new RegExp(`^the ${SCREEN} screen (?:opens|is shown)$`), async ({ page }, title: string) => {
  await expect(stepHeading(page, title)).toBeVisible();
  await expect(stepLink(page, title)).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('#builder [data-step]:visible')).toHaveCount(1);
});

Then('Continue is enabled', async ({ page }) => {
  await expect(continueButton(page)).toBeVisible();
  await expect(continueButton(page)).toHaveAttribute('aria-disabled', 'false');
});

Then('Continue reads {string} and is enabled', async ({ page }, label: string) => {
  await expect(continueButton(page)).toHaveText(label);
  await expect(continueButton(page)).toHaveAttribute('aria-disabled', 'false');
});

Then('no reason text is shown', async ({ page }) => {
  await expect(reasonText(page)).toBeHidden();
  await expect(goToButton(page)).toBeHidden();
});

Then(saying('focus is on the ', ' heading'), async ({ page }, title: string) => {
  await expect(stepHeading(page, title)).toBeFocused();
});

Then(saying('the page title names ', ''), async ({ page }, title: string) => {
  await expect(page).toHaveTitle(new RegExp(`^${escaped(screenTitle(title))} – `));
});

Then('the Back button reads {string}', async ({ page, memory }, label: string) => {
  await expect(backButton(page)).toHaveText(label);
  pointed({ memory }).chosen = backButton(page);
});

Then('I am on the character roster', async ({ page }) => {
  await expectOnRoster(page);
});

Then('the Character sheet item in the sidebar is not navigable', async ({ page }) => {
  const item = screenItem(page, 'Character sheet');
  await expect(item.getByRole('link')).toHaveCount(0);
  await expect(item.getByText('Character sheet', { exact: true })).toBeVisible();
});

Then('it says it is available after Finish', async ({ page }) => {
  await expect(screenItem(page, 'Character sheet')).toContainText('Available after Finish');
});

// The shell's screen standards (features/character-builder/builder-shell-standards.feature)

Then('the shell has no WCAG 2.1 AA violations at {int} pixels wide', async ({ page }, width: number) => {
  await expectNoViolationsAt(page, width);
});

Then('the shell does not scroll horizontally at {int} pixels wide', async ({ page }, width: number) => {
  await expectNoSidewaysScrollAt(page, width);
});

Then('the shell has exactly one level 1 heading', async ({ page }) => {
  await expectOneH1(page);
});

Then('every shell control has a unique accessible name', async ({ page }) => {
  await expectUniqueControlNames(page.locator('main'));
});
