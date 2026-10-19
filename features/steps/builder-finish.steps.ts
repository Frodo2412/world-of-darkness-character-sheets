import { expect, type Page } from '@playwright/test';
import type { DataTable } from 'playwright-bdd';
import { toCharacter } from '../../src/domain/v20/creation/toCharacter';
import {
  bloodPool,
  completeBuild,
  creation,
  generation,
  play,
  type Step,
} from '../../src/domain/v20/creation/testing/play';
import type { ConceptField } from '../../src/domain/v20/creation/build';
import { createCharacterStore } from '../../src/storage/characterStore';
import { buyDots, leaveFreebies } from './builder-seeding.steps';
import { Given, Then, When } from './fixtures';
import {
  BUILD_KEY_PREFIX,
  BUILDER_ADDRESS,
  activateFinish,
  buildWith,
  builderAddress,
  finishDialog,
  openPlayedFrom,
  openSavedBuild,
  openStep,
  rateTrait,
  saveBuilds,
  shownStep,
  stepHeading,
} from './support/builder';
import {
  SHEET_ADDRESS,
  buildEntries,
  entryNamed,
  openRoster,
  rosterEntries,
  sheetAddress,
  sheetField,
} from './support/pages';
import { expectRating, rating, setRating } from './support/ratings';
import {
  bloodPoolCard,
  bloodTotal,
  ensureEditing,
  humanityCard,
  identityName,
  identitySummary,
  identityTemperament,
  openCharacterId,
  savedCharacter,
  willpowerTotal,
} from './support/sheet';
import { storedKeys } from './support/storage';

const finishButton = (page: Page) => page.getByRole('button', { name: 'Finish', exact: true });
const outstandingItems = (page: Page) => page.locator('[data-outstanding-list] li');

/** One creation dot taken off a complete Brujah build, by the allotment that loses it. */
const ONE_SHORT: Record<string, Step> = {
  Mental: creation('attribute:wits', 1),
  Knowledges: creation('ability:computer', 1),
  Discipline: creation('discipline:Presence', 0),
  Background: creation('background:Resources', 0),
  Virtue: creation('virtue:courage', 2),
};

async function rememberAndOpen(page: Page, memory: { build?: import('../../src/domain/v20/creation/build').V20Build }, ...steps: Step[]) {
  memory.build = await openPlayedFrom(page, completeBuild('Brujah'), ...steps);
}

/** Changes the scenario's build and opens it again as it now is. */
async function change(page: Page, memory: { build?: import('../../src/domain/v20/creation/build').V20Build }, ...steps: Step[]) {
  memory.build = play(memory.build!, ...steps);
  await openSavedBuild(page, memory.build);
}

async function finish(page: Page, accept: boolean): Promise<void> {
  await activateFinish(page);
  if (accept && (await finishDialog(page).isVisible())) {
    await finishDialog(page).getByRole('button', { name: /^Finish with/ }).click();
  }
}

// Given

Given(/^a complete build except for one (\w+) dot$/, async ({ page, memory }, allotment: string) => {
  await rememberAndOpen(page, memory, ONE_SHORT[allotment]);
});

Given(/^a complete build whose Physical group is overspent by (\d+) dots$/, async ({ page, memory }, by: string) => {
  // The rules refuse to overspend a group, so the record is written as stored data.
  const build = { ...completeBuild('Brujah'), id: buildWith().id };
  build.traits = { ...build.traits, 'attribute:strength': { creation: 2 + Number(by), freebie: 0 } };
  memory.build = build;
  await openSavedBuild(page, build);
});

Given(/^a stored 13th generation build whose Strength is rated 6$/, async ({ page, memory }) => {
  const build = { ...completeBuild('Brujah'), id: buildWith().id };
  build.traits = { ...build.traits, 'attribute:strength': { creation: 5, freebie: 0 } };
  memory.build = build;
  await openSavedBuild(page, build);
});

Given('a build with one Virtue dot unplaced and {int} freebie points remaining', async ({ page, memory }, points: number) => {
  await rememberAndOpen(page, memory, ONE_SHORT.Virtue, leaveFreebies(points));
});

Given(
  /^a complete build with base generation "(\d+)th" and these concept details$/,
  async ({ page, memory }, base: string, table: DataTable) => {
    const [details] = table.hashes();
    const build = play({ ...completeBuild(details.Clan), id: buildWith().id }, generation(Number(base)));
    for (const [label, text] of Object.entries(details)) {
      if (label !== 'Clan') build.concept[label.toLowerCase() as ConceptField] = text;
    }
    memory.build = build;
    await openSavedBuild(page, build);
  },
);

Given('the build has Strength rated 4 and Brawl rated 3', async ({ page, memory }) => {
  await change(page, memory, creation('attribute:stamina', 3), creation('attribute:strength', 4), creation('ability:empathy', 1), creation('ability:brawl', 3));
});

Given('the build has the Disciplines Dominate rated 2 and Potence rated 1', async ({ page, memory }) => {
  await change(page, memory, creation('discipline:Obtenebration', 0), creation('discipline:Dominate', 2), creation('discipline:Potence', 1));
});

Given('the build has the Backgrounds Resources rated 3 and Generation rated 2', async ({ page, memory }) => {
  await change(
    page,
    memory,
    creation('background:Contacts', 0),
    creation('background:Allies', 0),
    creation('background:Resources', 3),
    creation('background:Generation', 2),
  );
});

Given(
  'the build has Conscience rated 3, Self-Control rated 4 and Courage rated 3 from creation dots',
  async ({ page, memory }) => {
    await change(page, memory, creation('virtue:conscience', 3), creation('virtue:selfControl', 4), creation('virtue:courage', 3));
  },
);

Given('the build has one freebie dot of Courage and one freebie dot of Willpower', async ({ page, memory }) => {
  await change(page, memory, buyDots('virtue:courage', 1), buyDots('willpower', 1));
});

Given('the build has a starting blood pool of {int}', async ({ page, memory }, value: number) => {
  await change(page, memory, bloodPool(value));
});

Given('a player who has just finished a build', async ({ page, memory }) => {
  await rememberAndOpen(page, memory, leaveFreebies(0));
  await finish(page, true);
  await expect(page).toHaveURL(SHEET_ADDRESS);
});

Given('a character finished from a 13th generation build', async ({ page, memory }) => {
  await rememberAndOpen(page, memory, leaveFreebies(0));
  await finish(page, true);
  await expect(page).toHaveURL(SHEET_ADDRESS);
});

Given('a finished character whose build was not removed', async ({ page, memory }) => {
  const build = { ...completeBuild('Brujah'), id: buildWith().id };
  memory.build = build;
  await saveBuilds(page, [build]);
  const records = new Map<string, string>();
  createCharacterStore({
    length: 0,
    key: () => null,
    getItem: () => null,
    setItem: (key, value) => void records.set(key, value),
    removeItem: () => {},
  }).save(toCharacter(build));
  await page.evaluate((entries) => {
    for (const [key, value] of entries) window.localStorage.setItem(key, value);
  }, [...records]);
});

Given('the player has since renamed the character {string} on the sheet', async ({ page, memory }, name: string) => {
  await page.goto(sheetAddress(memory.build!.id));
  await ensureEditing(page);
  await sheetField(page, 'Name').fill(name);
});

// When

When('they follow the outstanding item', async ({ page }) => {
  await openStep(page, 'Finishing touches');
  await outstandingItems(page).getByRole('link').click();
});

When('they place the last Virtue dot and return to the finishing touches step', async ({ page }) => {
  await rateTrait(page, 'Courage', 3);
  await openStep(page, 'Finishing touches');
});

When('they use {string}', async ({ page }, name: string) => {
  await shownStep(page).getByRole('link', { name, exact: true }).click();
});

When('they finish the build', async ({ page }) => {
  await finish(page, true);
});

When('they try to finish the build', async ({ page }) => {
  await activateFinish(page);
});

When('they finish the build and accept the confirmation', async ({ page }) => {
  await activateFinish(page);
  await finishDialog(page).getByRole('button', { name: /^Finish with/ }).click();
});

When('they try to finish the build and choose {string}', async ({ page }, choice: string) => {
  await activateFinish(page);
  await finishDialog(page).getByRole('button', { name: choice }).click();
});

When('they activate Finish twice in quick succession', async ({ page }) => {
  await openStep(page, 'Finishing touches');
  await finishButton(page).evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(page).toHaveURL(SHEET_ADDRESS);
});

When('they go back in the browser', async ({ page }) => {
  await page.goBack();
});

When('they continue the lingering build and finish it', async ({ page }) => {
  await openRoster(page);
  await buildEntries(page).getByRole('link', { name: /^Continue/ }).click();
  await expect(page).toHaveURL(BUILDER_ADDRESS);
  await finish(page, true);
});

When('they raise Strength to {int} on the sheet', async ({ page }, value: number) => {
  await ensureEditing(page);
  await setRating(rating(page, 'Strength'), value);
});

// Then

Then('the outstanding list shows exactly', async ({ page }, table: DataTable) => {
  await openStep(page, 'Finishing touches');
  const rows = await outstandingItems(page).evaluateAll((items) =>
    items.map((item) => ({
      item: item.querySelector('a')!.textContent!,
      step: item.querySelector('[data-outstanding-step]')!.textContent!.replace(/^ \((.*)\)$/, '$1'),
    })),
  );
  expect(rows).toEqual(table.hashes());
});

Then(/^the outstanding list shows only "([^"]+)" for the (\w+) step$/, async ({ page }, item: string, step: string) => {
  await expect(outstandingItems(page)).toHaveCount(1);
  await expect(outstandingItems(page).getByRole('link')).toHaveText(item);
  await expect(outstandingItems(page)).toContainText(`(${step})`);
});

Then('the outstanding list shows an item naming Strength for the Attributes step', async ({ page }) => {
  await expect(outstandingItems(page).filter({ hasText: 'Strength' }).filter({ hasText: '(Attributes)' })).not.toHaveCount(0);
});

Then('the build cannot be finished', async ({ page }) => {
  await openStep(page, 'Finishing touches');
  await expect(finishButton(page)).toHaveAttribute('aria-disabled', 'true');
});

Then('the build can be finished', async ({ page }) => {
  await expect(finishButton(page)).toHaveAttribute('aria-disabled', 'false');
});

Then('nothing is outstanding', async ({ page }) => {
  await expect(page.locator('[data-outstanding]')).toContainText('Nothing outstanding.');
  await expect(outstandingItems(page)).toHaveCount(0);
});

Then(
  'the {string} step is shown with keyboard focus on the outstanding list',
  async ({ page }, title: string) => {
    await expect(stepHeading(page, title)).toBeVisible();
    await expect(page.locator('[data-outstanding]')).toBeFocused();
  },
);

Then('no confirmation is asked', async ({ page }) => {
  // An aria-disabled button stays focusable and clickable; Playwright would wait for it to be enabled.
  await finishButton(page).dispatchEvent('click');
  await expect(finishDialog(page)).toBeHidden();
});

Then('the character sheet is shown', async ({ page }) => {
  await expect(page).toHaveURL(SHEET_ADDRESS);
  await expect(page.getByRole('heading', { name: 'Character sheet' })).toBeVisible();
});

Then(/^they are asked whether to finish with (.+) unspent$/, async ({ page }, wording: string) => {
  await expect(finishDialog(page)).toBeVisible();
  await expect(finishDialog(page)).toContainText(`${wording} unspent`);
});

Then(
  /^the choices are "([^"]+)" and "([^"]+)", with "([^"]+)" focused$/,
  async ({ page }, first: string, second: string, focused: string) => {
    await expect(finishDialog(page).getByRole('button', { name: first, exact: true })).toBeVisible();
    await expect(finishDialog(page).getByRole('button', { name: second, exact: true })).toBeVisible();
    await expect(finishDialog(page).getByRole('button', { name: focused, exact: true })).toBeFocused();
  },
);

Then('the builder is still shown with keyboard focus on the Finish button', async ({ page }) => {
  await expect(finishDialog(page)).toBeHidden();
  await expect(page).toHaveURL(BUILDER_ADDRESS);
  await expect(finishButton(page)).toBeFocused();
});

Then('the builder is still shown', async ({ page }) => {
  await expect(page).toHaveURL(BUILDER_ADDRESS);
  await expect(page.getByRole('heading', { name: 'Build a character' })).toBeVisible();
});

Then(
  'the sheet identity shows Name, Clan, Concept, Nature and Demeanor, and the generation {string}',
  async ({ page, memory }, generationText: string) => {
    const { name, nature, demeanor, concept } = memory.build!.concept;
    await expect(identityName(page)).toHaveText(name);
    await expect(identitySummary(page)).toHaveText(`${memory.build!.clan} · ${generationText} generation · ${concept}`);
    await expect(identityTemperament(page)).toHaveText(`${nature} / ${demeanor}`);
  },
);

Then('the saved character holds Player, Chronicle and Sire as entered', async ({ page, memory }) => {
  const { player, chronicle, sire } = memory.build!.concept;
  const { header } = await savedCharacter(page, openCharacterId(page));
  expect({ player: header.player, chronicle: header.chronicle, sire: header.sire }).toEqual({ player, chronicle, sire });
});

const SHEET_LABELS: Record<string, string> = { Conscience: 'Conscience/Conviction', 'Self-Control': 'Self-Control/Instinct' };

Then(/^the sheet shows ((?:[A-Z][\w-]* \d+(?:, | and )?)+)$/, async ({ page }, list: string) => {
  for (const [, name, value] of list.matchAll(/([A-Z][\w-]*) (\d+)/g)) {
    await expectRating(rating(page, SHEET_LABELS[name] ?? name), Number(value));
  }
});

Then('the sheet shows the path {string} at {int}', async ({ page }, path: string, value: number) => {
  await expect(humanityCard(page).locator('[data-show="humanity.path"]')).toHaveText(path);
  await expectRating(rating(page, 'Humanity'), value);
});

Then('the sheet shows permanent Willpower {int} and temporary Willpower {int}', async ({ page }, permanent: number, temporary: number) => {
  await expect(willpowerTotal(page)).toHaveText(`${temporary} / ${permanent}`);
});

Then(
  'the saved character has the Backgrounds {string} at {int} and {string} at {int}',
  async ({ page }, first: string, a: number, second: string, b: number) => {
    const { backgrounds } = await savedCharacter(page, openCharacterId(page));
    expect(backgrounds.slice(0, 2)).toEqual([
      { name: first, rating: a },
      { name: second, rating: b },
    ]);
    expect(backgrounds.slice(2).every((row) => row.name === '' && row.rating === 0)).toBe(true);
  },
);

Then('the sheet shows a blood pool of {int} and {string} blood per turn', async ({ page }, pool: number, perTurn: string) => {
  await expect(bloodTotal(page)).toHaveText(new RegExp(`^${pool} / `));
  await expect(bloodPoolCard(page).getByText(`${perTurn} blood / turn`, { exact: true })).toBeVisible();
});

Then('the saved character has no Weakness', async ({ page }) => {
  expect((await savedCharacter(page, openCharacterId(page))).weakness).toBe('');
});

Then('the sheet shows the generation {string} and {string} blood per turn', async ({ page }, generationText: string, perTurn: string) => {
  await expect(identitySummary(page)).toContainText(`${generationText} generation`);
  await expect(bloodPoolCard(page).getByText(`${perTurn} blood / turn`, { exact: true })).toBeVisible();
});

Then(`opening the build's builder address shows "build not found"`, async ({ page, memory }) => {
  await page.goto(builderAddress(memory.build!.id));
  await expect(page.getByRole('heading', { name: 'Build not found' })).toBeVisible();
});

Then('the roster lists one character and no builds in progress', async ({ page }) => {
  await openRoster(page);
  await expect(rosterEntries(page)).toHaveCount(1);
  await expect(buildEntries(page)).toHaveCount(0);
  expect(await storedKeys(page, BUILD_KEY_PREFIX)).toEqual([]);
});

Then('the roster lists one character', async ({ page }) => {
  await openRoster(page);
  await expect(rosterEntries(page)).toHaveCount(1);
});

Then('they are told the character could not be saved and the build has been kept', async ({ page }) => {
  await expect(page.getByRole('alert')).toContainText('The character could not be saved');
  await expect(page.getByRole('alert')).toContainText('Your build has been kept.');
});

Then('the build is still stored', async ({ page, memory }) => {
  expect(await storedKeys(page, BUILD_KEY_PREFIX)).toEqual([BUILD_KEY_PREFIX + memory.build!.id]);
});

Then('they are told the build was already finished and has been removed', async ({ page }) => {
  await expect(page.locator('[data-finish-notice]')).toContainText('This build was already finished and has been removed.');
});

Then(
  'the roster lists one character named {string} and no builds in progress',
  async ({ page }, name: string) => {
    await openRoster(page);
    await expect(rosterEntries(page)).toHaveCount(1);
    await expect(entryNamed(page, name)).toBeVisible();
    await expect(buildEntries(page)).toHaveCount(0);
  },
);

Then('no message is shown', async ({ page }) => {
  await expect(page.getByRole('alert')).toHaveCount(0);
});
