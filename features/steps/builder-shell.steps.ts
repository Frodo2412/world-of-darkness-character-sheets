// The builder shell: the top bar, the identity bar, the "Your character" panel and the autosave status
// with Save & exit. Standards (axe, one h1, no sideways scroll) are the shared steps and are not redefined.

import { expect, type Page } from '@playwright/test';
import { CLAN_NAMES, type ConceptKind } from '../../src/domain/v20/creation/rules';
import { creation, rank, type Step } from '../../src/domain/v20/creation/testing/play';
import { Any, Given, Then, When, memoryFor, type ScenarioMemory } from './fixtures';
import { ANNOUNCEMENT_WINDOW_MS, announcements, waitOnPageClock } from './support/announcements';
import { BUILDER_ADDRESS, builderHeading, buildWith, openPlayedFrom, openSavedBuild } from './support/builder';
import { enterConceptField } from './support/concept';
import { entryNamed } from './support/pages';
import { escaped } from './support/text';
import {
  autosaveAlert,
  autosaveStatus,
  characterPanel,
  identityInitials,
  identityName,
  identityNatureDemeanor,
  identitySubtitle,
  panelValue,
  takeClock,
  topBarButton,
  topBarTitle,
} from './support/shell';
import { acceptWrites, refuseWrites } from './support/storage';

/** What the shell steps remember about the scenario: whether the clock is the test's, and how many names were typed. */
interface ShellMemory {
  clock: { value: boolean };
  names: number;
}
const shell = (world: { memory: ScenarioMemory }): ShellMemory =>
  memoryFor(world, 'shell', (): ShellMemory => ({ clock: { value: false }, names: 0 }));

/** Types a new name into the Character concept screen, a different one each time so each is a change. */
async function changeName(page: Page, memory: ScenarioMemory): Promise<void> {
  const remembered = shell({ memory });
  remembered.names += 1;
  await enterConceptField(page, 'Name', `Character ${remembered.names}`);
}

/** Any clan's name, as a step text names a chosen clan. */
const CLAN = `(${CLAN_NAMES.map(escaped).join('|')})`;

// Given

Given(
  new RegExp(`^a build named "([^"]*)" with ${CLAN} chosen, concept "([^"]*)" and chronicle "([^"]*)"$`),
  async ({ page }, name: string, clan: string, concept: string, chronicle: string) => {
    await openSavedBuild(page, buildWith({ clan, concept: { name, concept, chronicle } }));
  },
);

Given(
  /^a build with clan "([^"]*)", concept "([^"]*)" and chronicle "([^"]*)"$/,
  async ({ page }, clan: string, concept: string, chronicle: string) => {
    await openSavedBuild(page, buildWith({ clan, concept: { concept, chronicle } }));
  },
);

Given(/^a build with Nature "([^"]*)" and Demeanor "([^"]*)"$/, async ({ page }, nature: string, demeanor: string) => {
  await openSavedBuild(page, buildWith({ concept: { nature, demeanor } }));
});

Given(/^a build with sample concept "([^"]*)" and concept "([^"]*)"$/, async ({ page }, kind: string, concept: string) => {
  await openSavedBuild(page, buildWith({ concept: { conceptKind: kind as ConceptKind, concept } }));
});

Given(new RegExp(`^a build with ${CLAN} chosen$`), async ({ page }, clan: string) => {
  await openSavedBuild(page, buildWith({ clan }));
});

/** Social 7, Mental 5 and Physical 3 dots, which are the whole of each group's allotment (each Attribute has a free dot). */
const ATTRIBUTES_PLACED: Step[] = [
  rank('social', 'primary'),
  rank('mental', 'secondary'),
  rank('physical', 'tertiary'),
  creation('attribute:charisma', 4),
  creation('attribute:manipulation', 3),
  creation('attribute:appearance', 3),
  creation('attribute:perception', 3),
  creation('attribute:intelligence', 3),
  creation('attribute:wits', 2),
  creation('attribute:strength', 2),
  creation('attribute:dexterity', 2),
  creation('attribute:stamina', 2),
];

Given(
  'Social primary, Mental secondary and Physical tertiary, all additional dots placed',
  async ({ page }) => {
    await openPlayedFrom(page, buildWith(), ...ATTRIBUTES_PLACED);
  },
);

Given('Knowledges 13, Skills 9 and Talents 5 placed', async ({ page }) => {
  await openPlayedFrom(
    page,
    buildWith(),
    rank('knowledges', 'primary'),
    rank('skills', 'secondary'),
    rank('talents', 'tertiary'),
    creation('ability:academics', 3),
    creation('ability:computer', 3),
    creation('ability:finance', 3),
    creation('ability:investigation', 3),
    creation('ability:law', 1),
    creation('ability:animalKen', 3),
    creation('ability:crafts', 3),
    creation('ability:drive', 3),
    creation('ability:alertness', 3),
    creation('ability:athletics', 2),
  );
});

Given('the browser refuses to store data', async ({ page }) => {
  await refuseWrites(page);
});

Given('the browser refused the last save and now accepts storage', async ({ page, memory }) => {
  await refuseWrites(page);
  await changeName(page, memory);
  await expect(autosaveAlert(page)).toBeVisible();
  await acceptWrites(page);
});

Given('the autosave status read {string}', async ({ page, memory }, text: string) => {
  await takeClock(page, shell({ memory }).clock);
  await changeName(page, memory);
  await expect(autosaveStatus(page)).toHaveText(text);
});

// When

When("I change my character's name", async ({ page, memory }) => {
  await changeName(page, memory);
});

When('{int} seconds pass', async ({ page, memory }, seconds: number) => {
  await takeClock(page, shell({ memory }).clock);
  await page.clock.runFor(seconds * 1000);
});

When('I choose {string}', async ({ page }, name: string) => {
  await topBarButton(page, name).click();
});

// Then: the identity bar and the top bar

Then(/^the identity bar reads "([^"]*)" with the initials "([^"]*)"$/, async ({ page }, name: string, initials: string) => {
  await expect(identityName(page)).toHaveText(name);
  await expect(identityInitials(page)).toHaveText(initials);
});

Then(/^the top bar reads "([^"]*)"$/, async ({ page }, text: string) => {
  await expect(topBarTitle(page)).toHaveText(text);
});

Then(/^(?:its|the) subtitle reads "([^"]*)"$/, async ({ page }, subtitle: string) => {
  await expect(identitySubtitle(page)).toHaveText(subtitle);
});

Then(/^the (?:Nature \/ Demeanor )?readout reads "([^"]*)"$/, async ({ page }, readout: string) => {
  await expect(identityNatureDemeanor(page)).toHaveText(readout);
});

// Then: the panel

Then(/^the "Your character" panel row (.+) reads "([^"]*)"$/, async ({ page }, row: string, text: string) => {
  await expect(panelValue(page, row)).toHaveText(text);
});

Then('the panel shows Humanity and Willpower with their dots', async ({ page }) => {
  for (const label of ['Humanity', 'Willpower']) {
    const value = panelValue(page, label);
    await expect(value).toBeVisible();
    // The number is the text; the dots beside it are drawn from it and left out of the reading.
    const dots = value.locator('xpath=following-sibling::*[@data-panel-dots]');
    const rating = Number(await value.textContent());
    await expect(dots).toHaveText(new RegExp(`^●{${rating}}○*$`));
  }
});

// Then: the autosave status

// The same words check the status as an outcome and, after a failed save, as an arrangement: one definition.
Any('the autosave status reads {string}', async ({ page }, text: string) => {
  await expect(autosaveStatus(page)).toHaveText(text);
});

Then('it reads {string}', async ({ page }, text: string) => {
  await expect(autosaveStatus(page)).toHaveText(text);
});

Then('nothing is announced to assistive technology', async ({ page }) => {
  // An announcement comes after a pause, so an absence is only an absence once the pause has passed.
  await waitOnPageClock(page, ANNOUNCEMENT_WINDOW_MS);
  expect(await announcements(page)).toEqual([]);
});

Then('the autosave status reads {string} and says what to do', async ({ page }, text: string) => {
  await expect(autosaveStatus(page)).toHaveText(text);
  await expect(autosaveAlert(page)).toContainText('Free up space, then choose Try saving again');
});

Then(/^the failure alert has been announced (\d+) times?$/, async ({ page }, count: string) => {
  const times = async (): Promise<number> =>
    (await announcements(page)).filter((text) => text.includes('Changes are not being saved')).length;
  // A repeat is written on the frame after it is cleared, so it is waited for rather than read once...
  await expect.poll(times).toBeGreaterThanOrEqual(Number(count));
  // ...and then given the time a further one would take, so "exactly" is not read before it arrives.
  await waitOnPageClock(page, ANNOUNCEMENT_WINDOW_MS);
  expect(await times()).toBe(Number(count));
});

Then('it is announced as an alert', async ({ page }) => {
  await expect(autosaveAlert(page)).toHaveAttribute('role', 'alert');
  await expect(autosaveAlert(page)).toBeVisible();
  expect(await announcements(page)).toContainEqual(expect.stringContaining('Changes are not being saved'));
});

Then('I can still edit the build', async ({ page, memory }) => {
  await changeName(page, memory);
  await expect(identityName(page)).toHaveText(`Character ${shell({ memory }).names}`);
});

Then('the failure alert is gone', async ({ page }) => {
  await expect(autosaveAlert(page)).toBeHidden();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(topBarButton(page, 'Try saving again')).toBeHidden();
});

// Then: Save & exit

Then('{string} is listed as in progress', async ({ page }, name: string) => {
  await expect(entryNamed(page, name)).toContainText('In progress');
});

Then('I am told the changes were not saved', async ({ page }) => {
  await expect(autosaveAlert(page)).toContainText('were not saved');
  await expect(autosaveStatus(page)).toHaveText('Changes not saved');
});

Then('I stay on the builder', async ({ page }) => {
  await expect(page).toHaveURL(BUILDER_ADDRESS);
  await expect(builderHeading(page)).toBeVisible();
  await expect(characterPanel(page)).toBeVisible();
});
