// The Nature & Demeanor screen: two role cards, the role switch, the archetype buttons with their N and D
// marks, a search with its result count and shortcut, and the player's own archetype. Screen standards are
// the shared steps (builder-standards.steps.ts) and are not restated here.

import { expect } from '@playwright/test';
import { ARCHETYPE_KEYS_HELP } from '../../src/domain/v20/creation/archetypes';
import { ARCHETYPES } from '../../src/domain/v20/creation/rules';
import { Given, Then, When, memoryFor, type ScenarioMemory } from './fixtures';
import { ANNOUNCEMENT_WINDOW_MS, announcements, waitOnPageClock, watchWrites, writtenTexts } from './support/announcements';
import { buildWith, openPlayedFrom, reloadBuilder, startBuild } from './support/builder';
import {
  archetypeButton,
  archetypeHeading,
  archetypeList,
  archetypeMarks,
  archetypeResults,
  archetypeSearch,
  archetypeSearchHint,
  assignArchetype,
  assignmentNotice,
  cardValues,
  chooseRole,
  expectArchetypeNotSelected,
  expectArchetypeSelected,
  listedArchetypes,
  listedNames,
  openNatureScreen,
  ownArchetype,
  pressArchetype,
  roleCardValue,
  roleOption,
  roleSwitch,
  type Role,
} from './support/nature';
import { escaped } from './support/text';

const ROLE = '(Nature|Demeanor)';
/** An archetype of the catalogue, by name: narrow enough that no other screen's step text can match it. */
const NAME = `(${ARCHETYPES.map(escaped).join('|')})`;
/** What the scenario's cards held before the step that is about to change one of them. */
const earlier = (memory: ScenarioMemory) => memoryFor({ memory }, 'nature', () => ({ cards: [] as string[] }));
/** A card's text as a step gives it: with or without the quotes around "Not chosen". */
const unquoted = (text: string): string => text.replace(/^"|"$/g, '');

// Given

Given('I am on the Nature & Demeanor screen of a new build', async ({ page }) => {
  await startBuild(page);
  await openNatureScreen(page);
});

Given(new RegExp(`^${NAME} is assigned as ${ROLE}$`), async ({ page }, name: string, role: Role) => {
  await openPlayedFrom(page, buildWith({ concept: { [role.toLowerCase()]: name } }));
  await openNatureScreen(page);
});

Given(new RegExp(`^${ROLE} is the active role$`), async ({ page }, role: Role) => {
  await chooseRole(page, role);
});

// When

When(new RegExp(`^I assign ${NAME} as ${ROLE}$`), async ({ page }, name: string, role: Role) => {
  await assignArchetype(page, name, role);
});

When(new RegExp(`^I switch to ${ROLE} and choose ${NAME}$`), async ({ page }, role: Role, name: string) => {
  await assignArchetype(page, name, role);
});

When(new RegExp(`^I switch to ${ROLE}$`), async ({ page }, role: Role) => {
  await chooseRole(page, role);
});

When(new RegExp(`^I choose ${NAME} again with ${ROLE} active$`), async ({ page }, name: string, role: Role) => {
  await openNatureScreen(page);
  await expect(roleOption(page, role)).toBeChecked();
  await pressArchetype(page, name);
});

When(new RegExp(`^I empty my own archetype with ${ROLE} active$`), async ({ page }, role: Role) => {
  await openNatureScreen(page);
  await expect(roleOption(page, role)).toBeChecked();
  await ownArchetype(page).fill('');
});

When('I search the archetypes for {string}', async ({ page }, query: string) => {
  await openNatureScreen(page);
  await archetypeSearch(page).fill(query);
});

When('I enter {string} as my own archetype', async ({ page, memory }, text: string) => {
  earlier(memory).cards = await cardValues(page);
  await ownArchetype(page).fill(text);
});

// Then

Then('the Nature and Demeanor cards read {string}', async ({ page }, text: string) => {
  await expect(roleCardValue(page, 'Nature')).toHaveText(text);
  await expect(roleCardValue(page, 'Demeanor')).toHaveText(text);
});

Then(new RegExp(`^the role switch has ${ROLE} active$`), async ({ page }, role: Role) => {
  await expect(roleOption(page, role)).toBeChecked();
});

Then('the role switch offers {string} and {string}', async ({ page }, first: string, second: string) => {
  await expect(roleSwitch(page).getByRole('radio')).toHaveCount(2);
  await expect(roleSwitch(page).locator('label')).toHaveText([first, second]);
});

Then(/^the Nature card reads (.+) and the Demeanor card reads (.+)$/, async ({ page }, nature: string, demeanor: string) => {
  await expect(roleCardValue(page, 'Nature')).toHaveText(unquoted(nature));
  await expect(roleCardValue(page, 'Demeanor')).toHaveText(unquoted(demeanor));
});

Then(new RegExp(`^the ${ROLE} card reads (?!.* and the (?:Nature|Demeanor) card )(.+)$`), async ({ page }, role: Role, text: string) => {
  await expect(roleCardValue(page, role)).toHaveText(unquoted(text));
});

Then(new RegExp(`^both cards read ${NAME}$`), async ({ page }, text: string) => {
  await expect(roleCardValue(page, 'Nature')).toHaveText(text);
  await expect(roleCardValue(page, 'Demeanor')).toHaveText(text);
});

Then(
  new RegExp(`^the ${ROLE} card reads (.+) and the ${ROLE} card is unchanged$`),
  async ({ page, memory }, role: Role, text: string, other: Role) => {
    await expect(roleCardValue(page, role)).toHaveText(text);
    const before = earlier(memory).cards;
    expect(before).toHaveLength(2);
    const index = other === 'Nature' ? 0 : 1;
    await expect(roleCardValue(page, other)).toHaveText(before[index]);
  },
);

Then('after reloading the builder it is unchanged', async ({ page }) => {
  const shown = await cardValues(page);
  await reloadBuilder(page);
  expect(await cardValues(page)).toEqual(shown);
});

Then(
  new RegExp(`^after reloading the builder the Nature card reads (.+) and the Demeanor card reads (.+)$`),
  async ({ page }, nature: string, demeanor: string) => {
    await reloadBuilder(page);
    await openNatureScreen(page);
    await expect(roleCardValue(page, 'Nature')).toHaveText(nature);
    await expect(roleCardValue(page, 'Demeanor')).toHaveText(demeanor);
  },
);

Then(new RegExp(`^${NAME} is marked "([^"]*)"$`), async ({ page }, name: string, marks: string) => {
  await expect(archetypeMarks(page, name)).toHaveText(marks);
  const roles = marks.split(' ').map((mark) => (mark === 'N' ? 'Nature' : 'Demeanor'));
  await expect(archetypeButton(page, name)).toHaveAccessibleDescription(`Assigned as ${roles.join(' and ')}`);
});

Then(new RegExp(`^${NAME} is marked "([^"]*)" and ${NAME} is marked "([^"]*)"$`), async ({ page }, first: string, firstMarks: string, second: string, secondMarks: string) => {
  await expect(archetypeMarks(page, first)).toHaveText(firstMarks);
  await expect(archetypeMarks(page, second)).toHaveText(secondMarks);
});

Then(new RegExp(`^${NAME} has no mark$`), async ({ page }, name: string) => {
  await expect(archetypeMarks(page, name)).toHaveText('');
  await expect(archetypeButton(page, name)).toHaveAccessibleDescription('');
});

Then(new RegExp(`^${NAME} reads "Selected" while ${ROLE} is active$`), async ({ page }, name: string, role: Role) => {
  await expect(roleOption(page, role)).toBeChecked();
  await expectArchetypeSelected(page, name);
});

Then(new RegExp(`^${NAME} does not read "Selected"$`), async ({ page }, name: string) => {
  await expectArchetypeNotSelected(page, name);
});

Then('the assignment {string} is announced', async ({ page }, text: string) => {
  await expect(assignmentNotice(page)).toHaveAttribute('role', 'status');
  await expect(assignmentNotice(page)).toHaveText(text);
  await expect.poll(() => announcements(page)).toContain(text);
});

Then(new RegExp(`^only the archetype ${NAME} is listed$`), async ({ page }, name: string) => {
  await expect(listedArchetypes(page)).toHaveCount(1);
  await expect(archetypeButton(page, name)).toBeVisible();
});

Then('the archetype count heading reads {string}', async ({ page }, heading: string) => {
  await expect(archetypeHeading(page)).toHaveText(heading);
});

Then('the archetype result count {string} is announced', async ({ page }, text: string) => {
  await expect(archetypeResults(page)).toHaveAttribute('role', 'status');
  await expect(archetypeResults(page)).toHaveText(text);
  await expect.poll(() => announcements(page)).toContain(text);
});

Then('no archetypes are listed', async ({ page }) => {
  await expect(listedArchetypes(page)).toHaveCount(0);
});

Then('I am told no archetype matches and it is announced', async ({ page }) => {
  await expect(archetypeResults(page)).toContainText('No archetype matches');
  const told = (await archetypeResults(page).textContent())!.trim();
  await expect.poll(() => announcements(page)).toContain(told);
});

Then('no archetype shows a description line', async ({ page }) => {
  expect(await listedNames(page)).toEqual([...ARCHETYPES]);
  // A button says its name and nothing else: no line of description beneath it.
  const lines = await listedArchetypes(page).evaluateAll((buttons) =>
    buttons.map((button) => (button as HTMLElement).innerText.split('\n').map((line) => line.trim()).filter(Boolean)),
  );
  expect(lines).toEqual(ARCHETYPES.map((name) => [name]));
});

Then(
  'the role switch is described as arrow keys switch role, Tab moves between archetypes, Space or Enter assigns',
  async ({ page }) => {
    expect(ARCHETYPE_KEYS_HELP).toBe('Arrow keys switch role; Tab moves between archetypes; Space or Enter assigns.');
    await expect(roleSwitch(page)).toHaveAccessibleDescription(ARCHETYPE_KEYS_HELP);
  },
);

Then('the archetype list is not described by that line', async ({ page }) => {
  // The arrow keys do nothing on the list, so the line that names them is not its description.
  await expect(archetypeList(page)).toHaveAccessibleDescription('');
});

Then('focus is in the archetype search field', async ({ page }) => {
  await expect(archetypeSearch(page)).toBeFocused();
});

Then('the archetype search hint is hidden', async ({ page }) => {
  await expect(archetypeSearchHint(page)).toBeHidden();
});

Then('the archetype search hint is shown', async ({ page }) => {
  await expect(archetypeSearchHint(page)).toBeVisible();
});

Then('the archetype search hint reads {string}', async ({ page }, hint: string) => {
  await expect(page.locator('[data-nd-search-hint]')).toHaveText(hint);
});

// The edges: focus, the search and the notice as the build changes

When(new RegExp(`^I focus ${NAME} and press Enter$`), async ({ page }, name: string) => {
  await openNatureScreen(page);
  await archetypeButton(page, name).focus();
  await page.keyboard.press('Enter');
});

Then(new RegExp(`^focus is still on ${NAME}$`), async ({ page }, name: string) => {
  await expect(archetypeButton(page, name)).toBeFocused();
});

When(new RegExp(`^I focus the ${ROLE} option and press (\\w+)$`), async ({ page }, role: Role, key: string) => {
  await openNatureScreen(page);
  await roleOption(page, role).focus();
  await page.keyboard.press(key);
});

Then('the archetype search still reads {string}', async ({ page }, text: string) => {
  await expect(archetypeSearch(page)).toHaveValue(text);
});

When('I type {string} into the archetype search one key at a time', async ({ page }, text: string) => {
  await openNatureScreen(page);
  await watchWrites(page, '[data-nd-results]');
  await archetypeSearch(page).pressSequentially(text);
});

When('I empty the archetype search', async ({ page }) => {
  await openNatureScreen(page);
  await archetypeSearch(page).fill('');
});

Then('the archetype result count {string} is announced once', async ({ page }, text: string) => {
  // Said after the pause, and only once however many keys were pressed.
  await waitOnPageClock(page, ANNOUNCEMENT_WINDOW_MS);
  expect(await writtenTexts(page)).toEqual([text]);
});

Then('my own archetype field is labelled {string}', async ({ page }, label: string) => {
  await expect(ownArchetype(page)).toHaveAccessibleName(label);
});

Then('the assignment notice is empty', async ({ page }) => {
  await expect(assignmentNotice(page)).toBeEmpty();
});

Then('my own archetype field reads {string}', async ({ page }, text: string) => {
  await expect(ownArchetype(page)).toHaveValue(text);
});
