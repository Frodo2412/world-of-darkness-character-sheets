// The Character concept screen: the free-text details of the character, kept as they are typed, the
// sample concepts, and what both become on the finished sheet. Screen standards are the shared steps.

import { expect, type Page } from '@playwright/test';
import type { V20Build } from '../../src/domain/v20/creation/build';
import { CONCEPT_KINDS, type ConceptKind } from '../../src/domain/v20/creation/rules';
import { sampleConceptLine } from '../../src/domain/v20/creation/sampleConcepts';
import { completeBuild } from '../../src/domain/v20/creation/testing/play';
import { Given, Then, When, type ScenarioMemory } from './fixtures';
import { buildWith, openSavedBuild, openStep, reloadBuilder, startBuild } from './support/builder';
import {
  chooseSampleConcept,
  conceptField,
  enterConceptField,
  expectSampleDoesNotRead,
  expectSampleReads,
  openConceptScreen,
  pressSampleConcept,
  sampleChips,
  sampleLine,
} from './support/concept';
import { SHEET_ADDRESS } from './support/pages';
import { openCharacterId, savedCharacter } from './support/sheet';
import { panelValue } from './support/shell';

const DRIVE = 'What keeps you going?';

/** "A, B and C" as its names. */
const names = (list: string): string[] => list.split(/, | and /);

/** A build that can be finished as it is, with the given concept entries. */
async function openFinishable(page: Page, memory: ScenarioMemory, concept: Partial<V20Build['concept']>): Promise<void> {
  const build = { ...completeBuild('Brujah'), id: buildWith().id };
  build.concept = { ...build.concept, ...concept };
  memory.build = build;
  memory.entered.set(DRIVE, build.concept.drive);
  await openSavedBuild(page, build);
}

// Given

Given('I am on the Character concept screen of a new build', async ({ page }) => {
  await startBuild(page);
  await openConceptScreen(page);
});

Given('a build named {string}', async ({ page }, name: string) => {
  await openSavedBuild(page, buildWith({ concept: { name } }));
});

Given('a build named {string} of clan {string}', async ({ page }, name: string, clan: string) => {
  await openSavedBuild(page, buildWith({ concept: { name }, clan }));
});

Given('the sample concept {string} is selected', async ({ page }, name: string) => {
  await chooseSampleConcept(page, name);
});

Given(
  'a finishable build with sample concept {string} and concept text {string}',
  async ({ page, memory }, kind: string, text: string) => {
    await openFinishable(page, memory, { conceptKind: kind as ConceptKind, concept: text });
  },
);

Given(
  'a finishable build with sample concept {string} and the concept text set to spaces only',
  async ({ page, memory }, kind: string) => {
    await openFinishable(page, memory, { conceptKind: kind as ConceptKind, concept: '    ' });
  },
);

Given(/^a finishable build with "([^"]*)" under "What keeps you going\?"$/, async ({ page, memory }, drive: string) => {
  await openFinishable(page, memory, { drive });
});

Given(/^a finishable build with nothing under "What keeps you going\?"$/, async ({ page, memory }) => {
  await openFinishable(page, memory, { drive: '' });
});

// When

When('I enter the name {string} and the concept {string}', async ({ page, memory }, name: string, text: string) => {
  await enterConceptField(page, 'Name', name);
  await enterConceptField(page, 'Concept', text);
  memory.entered.set('Name', name).set('Concept', text);
});

When(/^I enter "([^"]*)" under "What keeps you going\?"$/, async ({ page, memory }, text: string) => {
  await enterConceptField(page, DRIVE, text);
  memory.entered.set(DRIVE, text);
});

When(/^I enter two lines under "What keeps you going\?"$/, async ({ page, memory }) => {
  const text = 'Keep the old stories alive.\nName the one who buried them.';
  await enterConceptField(page, DRIVE, text);
  memory.entered.set(DRIVE, text);
});

When(
  'I enter the player {string}, the chronicle {string} and the sire {string}',
  async ({ page, memory }, player: string, chronicle: string, sire: string) => {
    for (const [label, text] of [['Player', player], ['Chronicle', chronicle], ['Sire', sire]]) {
      await enterConceptField(page, label, text);
      memory.entered.set(label, text);
    }
  },
);

When('I enter the concept {string}', async ({ page }, text: string) => {
  await enterConceptField(page, 'Concept', text);
});

When('I choose the sample concept {string}', async ({ page }, name: string) => {
  await pressSampleConcept(page, name);
});

When('I choose {string} again', async ({ page }, name: string) => {
  await pressSampleConcept(page, name);
});

When('they clear the Name', async ({ page }) => {
  await enterConceptField(page, 'Name', '');
});

When('they open the {string} step', async ({ page }, title: string) => {
  await openStep(page, title);
});

// Then

/** The entries a scenario made are in their fields after the builder is opened again. */
async function expectEntriesKept(page: Page, memory: ScenarioMemory, count: number): Promise<void> {
  expect(memory.entered.size).toBe(count);
  await reloadBuilder(page);
  await openConceptScreen(page);
  for (const [label, text] of memory.entered) await expect(conceptField(page, label)).toHaveValue(text);
}

Then('after reloading the builder all three entries are unchanged', async ({ page, memory }) => {
  await expectEntriesKept(page, memory, 3);
});

Then('after reloading the builder both lines are present', async ({ page, memory }) => {
  expect(memory.entered.get(DRIVE)).toContain('\n');
  await expectEntriesKept(page, memory, 1);
});

Then(/^the sample concepts are (.+)$/, async ({ page }, list: string) => {
  const expected = names(list);
  expect(expected).toEqual([...CONCEPT_KINDS]);
  await expect(sampleChips(page)).toHaveCount(expected.length);
  for (const [index, name] of expected.entries()) await expect(sampleChips(page).nth(index)).toHaveAccessibleName(name);
});

Then(/^"([^"]*)" (?:still )?reads "([^"]*)"$/, async ({ page }, name: string, state: string) => {
  await expectSampleReads(page, name, state);
});

Then(/^"([^"]*)" does not read "[^"]*"$/, async ({ page }, name: string) => {
  await expectSampleDoesNotRead(page, name);
});

Then(/^a short description of (\w+) is shown$/, async ({ page }, name: string) => {
  const line = sampleConceptLine(name);
  expect(line, `${name} is a sample concept`).toBeDefined();
  await expect(sampleLine(page)).toBeVisible();
  await expect(sampleLine(page)).toHaveText(line!);
});

Then(/^the character panel's Concept row reads "([^"]*)"$/, async ({ page }, text: string) => {
  await expect(panelValue(page, 'Concept')).toHaveText(text);
});

Then('no sample concept is selected', async ({ page }) => {
  await expect(sampleChips(page).and(page.locator('[aria-pressed="true"]'))).toHaveCount(0);
  await expect(sampleLine(page)).toBeHidden();
});

Then('the concept field holds {string}', async ({ page }, text: string) => {
  await expect(conceptField(page, 'Concept')).toHaveValue(text);
});

Then('the Name is empty', async ({ page }) => {
  await openConceptScreen(page);
  await expect(conceptField(page, 'Name')).toHaveValue('');
});

Then('the page title is {string}', async ({ page }, title: string) => {
  await expect(page).toHaveTitle(title);
});

Then(/^the sheet's Concept reads "([^"]*)"$/, async ({ page }, concept: string) => {
  await expect(page).toHaveURL(SHEET_ADDRESS);
  expect((await savedCharacter(page, openCharacterId(page))).header.concept).toBe(concept);
});

Then('the character\'s notes contain that text', async ({ page, memory }) => {
  await expect(page).toHaveURL(SHEET_ADDRESS);
  const drive = memory.entered.get(DRIVE)!;
  expect(drive).not.toBe('');
  expect((await savedCharacter(page, openCharacterId(page))).notes).toContain(drive);
});

Then('the character\'s notes are empty', async ({ page }) => {
  await expect(page).toHaveURL(SHEET_ADDRESS);
  expect((await savedCharacter(page, openCharacterId(page))).notes).toBe('');
});
