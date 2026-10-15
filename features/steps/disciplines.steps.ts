import { expect } from '@playwright/test';
import { Given, Then, When, memoryFor, type ScenarioMemory } from './fixtures';
import { addDiscipline, arrangeTraits } from './support/arrange';
import {
  disciplineDetail,
  disciplineItem,
  disciplineList,
  disciplineOfPower,
  disciplinesPanel,
  expandPower,
  listedPowers,
  powerRow,
  powerSummary,
  ruleValue,
  selectDiscipline,
  showDisciplines,
} from './support/disciplines';
import { characterArranged, givenSaved } from './support/seed';
import { openSavedSheet, selectedPoolCard } from './support/sheet';

// Step phrases for the Disciplines tab. Each names the tab, so none overlaps another tab's.

interface DisciplinesMemory {
  /** The power the scenario last expanded: "it" in the steps that follow. */
  power?: string;
  /** Whether the power was open after each key the keyboard scenario pressed. */
  openAfter: boolean[];
}

const disciplines = (memory: ScenarioMemory): DisciplinesMemory =>
  memoryFor<DisciplinesMemory>({ memory }, 'disciplines', () => ({ openAfter: [] }));

const HEADER = { name: 'Marguerite', clan: 'Toreador' };

/** The long Discipline name a crowded sheet carries, so the list is tried with a name that does not fit. */
const CROWDED_DISCIPLINE = 'Thaumaturgical Sanguinary Dominationesque';

/** "Awe, Dread Gaze and Entrancement" as names. */
const namesIn = (text: string): string[] => text.split(/, | and /);

/** The power "it" the scenario expanded last. */
const currentPower = (page: Parameters<typeof powerRow>[0], memory: ScenarioMemory) => {
  const name = disciplines(memory).power;
  if (name === undefined) throw new Error('no power expanded yet: an "expanded" step must come first');
  return powerRow(page, name);
};

// Arranging

Given(
  /^a character with a Discipline named "([^"]+)" rated (\d+) and (.+) rated (\d+)$/,
  async ({ page, memory }, first: string, firstRating: string, second: string, secondRating: string) => {
    await givenSaved(page, memory, HEADER, (character) => {
      addDiscipline(character, first, Number(firstRating));
      addDiscipline(character, second, Number(secondRating));
    });
  },
);

Given('a character with no named Disciplines', async ({ page, memory }) => {
  await givenSaved(page, memory, HEADER);
});

Given(/^a character with (.+) viewing the (.+) power on the Disciplines tab$/, async ({ page, memory }, traits: string, power: string) => {
  memory.saved = [characterArranged(HEADER, (character) => arrangeTraits(character, traits))];
  await openSavedSheet(page, memory.saved[0]);
  await showDisciplines(page, memory.saved[0].id);
  await expandPower(page, power);
  disciplines(memory).power = power;
});

Given(/^a character with (.+) and the (.+) power expanded on the Disciplines tab$/, async ({ page, memory }, traits: string, power: string) => {
  memory.saved = [
    characterArranged(HEADER, (character) => {
      arrangeTraits(character, traits);
      addDiscipline(character, CROWDED_DISCIPLINE, 5);
    }),
  ];
  await openSavedSheet(page, memory.saved[0]);
  await showDisciplines(page, memory.saved[0].id);
  await expandPower(page, power);
  disciplines(memory).power = power;
});

// Using the tab

When(/^the (.+) power is expanded on the Disciplines tab$/, async ({ page, memory }, power: string) => {
  await showDisciplines(page, memory.saved[0].id);
  await expandPower(page, power);
  disciplines(memory).power = power;
});

When(/^(.+) is selected on the Disciplines tab$/, async ({ page, memory }, name: string) => {
  await showDisciplines(page, memory.saved[0].id);
  await selectDiscipline(page, name);
});

When(
  /^the player focuses the (.+) heading on the Disciplines tab and presses Enter, then Space$/,
  async ({ page, memory }, power: string) => {
    await showDisciplines(page, memory.saved[0].id);
    await selectDiscipline(page, disciplineOfPower(power));
    const row = powerRow(page, power);
    await powerSummary(page, power).focus();
    const { openAfter } = disciplines(memory);
    for (const key of ['Enter', 'Space']) {
      await page.keyboard.press(key);
      openAfter.push(await row.evaluate((details) => (details as HTMLDetailsElement).open));
    }
    disciplines(memory).power = power;
  },
);

const searchBox = (page: Parameters<typeof disciplinesPanel>[0]) =>
  disciplinesPanel(page).getByRole('searchbox', { name: 'Search disciplines or powers', exact: true });

When(/^the player searches "([^"]+)" on the Disciplines tab$/, async ({ page, memory }, query: string) => {
  if (!(await disciplinesPanel(page).isVisible())) await showDisciplines(page, memory.saved[0].id);
  await searchBox(page).fill(query);
});

When(/^the player chooses "([^"]+)" on the Disciplines tab$/, async ({ page }, name: string) => {
  const choice = disciplinesPanel(page)
    .getByRole('group', { name: 'Disciplines shown', exact: true })
    .getByRole('button', { name: new RegExp(`^${name}`) });
  await choice.click();
  await expect(choice).toHaveAttribute('aria-pressed', 'true');
});

When('the player presses "Build pool" on the Disciplines tab', async ({ page, memory }) => {
  await currentPower(page, memory).getByRole('button', { name: 'Build pool', exact: true }).click();
});

// The list

Then(/^(.+) shows "([^"]+)" and "([^"]+)" on the Disciplines tab$/, async ({ page }, name: string, rating: string, unlocked: string) => {
  const item = disciplineItem(page, name);
  await expect(item).toContainText(rating);
  await expect(item).toContainText(unlocked);
});

Then(
  /^(.+) shows "([^"]+)" and (.+) "([^"]+)" on the Disciplines tab$/,
  async ({ page }, first: string, firstUnlocked: string, second: string, secondUnlocked: string) => {
    await expect(disciplineItem(page, first)).toContainText(firstUnlocked);
    await expect(disciplineItem(page, second)).toContainText(secondUnlocked);
  },
);

Then(/^the "([^"]+)" control reads "([^"]+)" on the Disciplines tab$/, async ({ page }, control: string, reads: string) => {
  const group = disciplinesPanel(page).getByRole('group', { name: 'Disciplines shown', exact: true });
  await expect(group.getByRole('button', { name: new RegExp(`^${control}`) })).toHaveAccessibleName(reads);
});

Then('all seventeen catalogued Disciplines are listed on the Disciplines tab', async ({ page }) => {
  await expect(disciplineList(page).getByRole('button')).toHaveCount(17);
});

Then('the three Disciplines are listed on the Disciplines tab', async ({ page }) => {
  await expect(disciplineList(page).getByRole('button')).toHaveCount(3);
  await expect(disciplineItem(page, 'Presence')).toBeVisible();
});

Then('a Discipline the character lacks shows every power Locked on the Disciplines tab', async ({ page }) => {
  await selectDiscipline(page, 'Dominate');
  await expect(disciplinesPanel(page).locator('.discipline-power-state')).toHaveText(['Locked', 'Locked', 'Locked', 'Locked', 'Locked']);
});

Then(/^"?(.+?)"? shows its name and rating and no powers on the Disciplines tab$/, async ({ page }, name: string) => {
  await selectDiscipline(page, name);
  await expect(disciplineDetail(page).getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(disciplineItem(page, name)).toContainText('/');
  await expect(disciplineDetail(page).locator('[data-detail-rating]')).toContainText('Your rating');
  await expect(disciplinesPanel(page).locator('details.discipline-power')).toHaveCount(0);
});

Then(
  /^a message says the character has none and offers "([^"]+)" on the Disciplines tab$/,
  async ({ page }, offer: string) => {
    const none = disciplinesPanel(page).locator('[data-none]');
    await expect(none).toContainText('no Disciplines');
    await expect(none.getByRole('button', { name: offer, exact: true })).toBeVisible();
    await expect(disciplineList(page)).toBeHidden();
  },
);

Then('the tab says to edit Discipline ratings on the Character sheet', async ({ page }) => {
  const hint = disciplinesPanel(page).getByText('Edit Discipline ratings on the', { exact: false });
  await expect(hint).toBeVisible();
  await expect(hint.getByRole('link', { name: 'Character sheet', exact: true })).toBeVisible();
});

// The powers

Then(/^the powers are listed (.+) on the Disciplines tab$/, async ({ page }, names: string) => {
  await expect.poll(() => listedPowers(page)).toEqual(namesIn(names));
});

Then(/^(.+) are Known on the Disciplines tab$/, async ({ page }, names: string) => {
  for (const name of namesIn(names)) await expect(powerRow(page, name).locator('.discipline-power-state')).toHaveText('Known');
});

Then(/^(.+) is Locked with "([^"]+)" on the Disciplines tab$/, async ({ page }, name: string, requires: string) => {
  const row = powerRow(page, name);
  await expect(row.locator('.discipline-power-state')).toHaveText('Locked');
  await expect(row.locator('summary')).toContainText(requires);
});

// An expanded power

Then(
  /^it shows activation cost "([^"]+)", prerequisite "([^"]+)" and difficulty "([^"]+)" on the Disciplines tab$/,
  async ({ page, memory }, cost: string, prerequisite: string, difficulty: string) => {
    const row = currentPower(page, memory);
    await expect(ruleValue(row, 'Activation cost')).toHaveText(cost);
    await expect(ruleValue(row, 'Prerequisite')).toHaveText(prerequisite);
    await expect(ruleValue(row, 'Difficulty / resistance')).toHaveText(difficulty);
  },
);

Then(/^it shows duration "([^"]+)" on the Disciplines tab$/, async ({ page, memory }, duration: string) => {
  await expect(ruleValue(currentPower(page, memory), 'Duration')).toHaveText(duration);
});

Then(
  /^it shows its dice pool "([^"]+)" and its page "([^"]+)" on the Disciplines tab$/,
  async ({ page, memory }, pool: string, reference: string) => {
    const row = currentPower(page, memory);
    await expect(ruleValue(row, 'Dice pool')).toHaveText(pool);
    await expect(row.locator('.discipline-power-source')).toContainText(reference);
  },
);

Then(/^it shows "([^"]+)" with "([^"]+)" on the Disciplines tab$/, async ({ page, memory }, total: string, formula: string) => {
  const row = currentPower(page, memory);
  await expect(row.locator('.discipline-power-pool-total')).toHaveText(total);
  await expect(row.locator('.discipline-power-pool-formula')).toHaveText(formula);
});

Then(
  /^it shows "([^"]+)" and says the character is incapacitated on the Disciplines tab$/,
  async ({ page, memory }, total: string) => {
    const row = currentPower(page, memory);
    await expect(row.locator('.discipline-power-pool-total')).toHaveText(total);
    await expect(row.getByText('Incapacitated', { exact: false })).toBeVisible();
  },
);

Then(/^it shows "([^"]+)" on the Disciplines tab$/, async ({ page, memory }, text: string) => {
  await expect(currentPower(page, memory).locator('.discipline-power-locked')).toHaveText(text);
});

Then('it has no pool and no "Build pool" button on the Disciplines tab', async ({ page, memory }) => {
  const row = currentPower(page, memory);
  await expect(row.getByText('Your pool', { exact: false })).toHaveCount(0);
  await expect(row.getByRole('button', { name: 'Build pool' })).toHaveCount(0);
});

Then(/^it states what it uses instead of a roll, "([^"]+)", on the Disciplines tab$/, async ({ page, memory }, instead: string) => {
  await expect(currentPower(page, memory).locator('.discipline-power-pool-instead')).toHaveText(`Uses instead of a roll: ${instead}`);
});

Then("the Discipline's note is shown and no powers are listed on the Disciplines tab", async ({ page }) => {
  await expect(disciplineDetail(page).locator('[data-detail-note]')).toContainText('Dexterity');
  await expect(disciplinesPanel(page).locator('details.discipline-power')).toHaveCount(0);
});

Then('its panel is shown and open, then hidden and closed, on the Disciplines tab', async ({ page, memory }) => {
  const { openAfter, power } = disciplines(memory);
  expect(openAfter, 'Enter opened it and Space closed it again').toEqual([true, false]);
  const row = powerRow(page, power!);
  await expect(row.locator('.discipline-power-body')).toBeHidden();
});

// Search

Then(/^(.+) remains under (.+) on the Disciplines tab$/, async ({ page }, power: string, discipline: string) => {
  await expect(disciplineList(page).getByRole('button')).toHaveCount(1);
  await expect(disciplineItem(page, discipline)).toBeVisible();
  await expect.poll(() => listedPowers(page)).toEqual([power]);
});

Then(/^(.+) remains and (.+) does not on the Disciplines tab$/, async ({ page }, kept: string, dropped: string) => {
  await expect.poll(() => listedPowers(page)).toEqual([kept]);
  await expect(powerRow(page, dropped)).toHaveCount(0);
});

Then('an empty-state message is shown on the Disciplines tab', async ({ page }) => {
  await expect(disciplinesPanel(page).locator('[data-no-match]')).toBeVisible();
  await expect(disciplineList(page)).toBeHidden();
});

// Build pool

Then('its Selected pool holds Charisma and Performance', async ({ page }) => {
  await expect(selectedPoolCard(page).locator('[data-show="pool.formula"]')).toHaveText(/^Charisma \d+ \+ Performance \d+$/);
});
