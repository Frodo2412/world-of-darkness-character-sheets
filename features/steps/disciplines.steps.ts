import { expect } from '@playwright/test';
import { Given, Then, When } from './fixtures';
import { watchAnnouncements, announcements } from './support/announcements';
import { doneButton, selectedPoolCard, traitButton } from './support/sheet';
import { tabPanelOf } from './support/tabs';
import {
  disciplineItem,
  disciplinesMemory,
  disciplinesPanel,
  editors,
  expandPower,
  namesIn,
  powerDetails,
  powerRow,
  powerRows,
  ruleOf,
  saveDisciplineCharacter,
  scopeButton,
  showDisciplines,
} from './support/disciplines';

// The steps of the Disciplines scenarios. Each one that is not shared names the tab ("on the
// Disciplines tab"), so it never has the same words as a step of another tab.

/** The power a scenario expanded, which the steps that say "it" are about. */
const expanded = (memory: Parameters<typeof disciplinesMemory>[0]): string => {
  const { power } = disciplinesMemory(memory);
  if (power === undefined) throw new Error('no power was expanded: an "is expanded on the Disciplines tab" step must come first');
  return power;
};

// Arranging

Given(/^a character with (.+) on the Disciplines tab$/, async ({ page, memory }, words: string) => {
  await saveDisciplineCharacter(page, memory, words);
});

// Opening

When('the Disciplines tab is chosen from the tab bar on the Disciplines tab', async ({ page, memory }) => {
  await showDisciplines(page, memory);
});

When('{word} is selected on the Disciplines tab', async ({ page, memory }, name: string) => {
  await showDisciplines(page, memory);
  await disciplineItem(page, name).getByRole('button').click();
});

When('the player follows its link on the Disciplines tab', async ({ page }) => {
  await disciplinesPanel(page).getByRole('link', { name: 'Character sheet', exact: true }).click();
});

// Some scenarios start with a power already open, others open it as the thing under test.
for (const step of [Given, When]) {
  step(/^the (.+) power is expanded on the Disciplines tab$/, async ({ page, memory }, power: string) => {
    await expandPower(page, memory, power);
  });
}

// The control that chooses between the character's Disciplines and all of them, put in a state before the scenario acts.
for (const step of [Given, When]) {
  step(/^the "([^"]+)" view is chosen on the Disciplines tab$/, async ({ page, memory }, label: string) => {
    await showDisciplines(page, memory);
    await scopeButton(page, label).click();
    await expect(scopeButton(page, label)).toHaveAttribute('aria-pressed', 'true');
  });
}

When('the player presses {string} on the Disciplines tab', async ({ page, memory }, button: string) => {
  // Watched from here on, so the announcement the press makes is the one that is read.
  await watchAnnouncements(page);
  await powerRow(page, expanded(memory)).getByRole('button', { name: button, exact: true }).click();
});

When(
  /^the player focuses the (.+) heading on the Disciplines tab and presses Enter, then Space$/,
  async ({ page, memory }, power: string) => {
    await showDisciplines(page, memory);
    const summary = powerDetails(page, power).locator('summary');
    await summary.focus();
    const { panelStates } = disciplinesMemory(memory);
    for (const key of ['Enter', 'Space']) {
      await page.keyboard.press(key);
      const open = await powerDetails(page, power).evaluate((element: HTMLDetailsElement) => element.open);
      panelStates.push({
        state: open ? 'expanded' : 'collapsed',
        shown: await powerDetails(page, power).locator('.disciplines-power-body').isVisible(),
      });
    }
  },
);

When('the player searches {string} on the Disciplines tab', async ({ page, memory }, query: string) => {
  await showDisciplines(page, memory);
  await disciplinesPanel(page).getByRole('searchbox', { name: 'Search Disciplines and powers' }).fill(query);
});

When(/^the player chooses "([^"]+)"(?: again)? on the Disciplines tab$/, async ({ page, memory }, label: string) => {
  await showDisciplines(page, memory);
  await scopeButton(page, label).click();
});

When('the player presses {string} in the empty state on the Disciplines tab', async ({ page }, label: string) => {
  await disciplinesPanel(page).locator('.dossier-empty').getByRole('button', { name: label, exact: true }).click();
});

// What the list shows

// A Discipline's name starts with a capital, which keeps these apart from the power steps' "it shows".
Then(/^([A-Z]\w*) shows "([^"]+)" and "([^"]+)" on the Disciplines tab$/, async ({ page }, name: string, rating: string, unlocked: string) => {
  const item = disciplineItem(page, name);
  await expect(item.getByText(rating, { exact: true })).toBeVisible();
  await expect(item.getByText(unlocked, { exact: true })).toBeVisible();
});

Then(/^([A-Z]\w*) shows "([^"]+)" on the Disciplines tab$/, async ({ page }, name: string, text: string) => {
  await expect(disciplineItem(page, name).getByText(text, { exact: true })).toBeVisible();
});

Then(
  /^(\w+) shows "([^"]+)" although the catalogue lists no \w+ powers on the Disciplines tab$/,
  async ({ page }, name: string, text: string) => {
    await expect(disciplineItem(page, name).getByText(text, { exact: true })).toBeVisible();
    await disciplineItem(page, name).getByRole('button').click();
    await expect(powerRows(page)).toHaveCount(0);
  },
);

Then('{string} shows its name and {string} and no powers on the Disciplines tab', async ({ page }, name: string, rating: string) => {
  const item = disciplineItem(page, name);
  await expect(item.getByText(rating, { exact: true })).toBeVisible();
  await item.getByRole('button').click();
  await expect(powerRows(page)).toHaveCount(0);
});

Then('{word} is not listed on the Disciplines tab', async ({ page }, name: string) => {
  await expect(disciplineItem(page, name)).toHaveCount(0);
});

Then('the {string} control reads {string} on the Disciplines tab', async ({ page }, control: string, text: string) => {
  const group = disciplinesPanel(page).getByRole('group', { name: 'Disciplines shown' });
  await expect(group.getByRole('button', { name: text, exact: true })).toBeVisible();
  expect(text.startsWith(control)).toBe(true);
});

Then('{string} is shown with an {string} button on the Disciplines tab', async ({ page }, message: string, button: string) => {
  const empty = disciplinesPanel(page).locator('.dossier-empty');
  await expect(empty.getByText(message, { exact: true })).toBeVisible();
  await expect(empty.getByRole('button', { name: button, exact: true })).toBeVisible();
});

Then('exactly seventeen Disciplines are listed on the Disciplines tab', async ({ page }) => {
  await expect(disciplinesPanel(page).locator('[data-disciplines-list] > li')).toHaveCount(17);
});

Then(/^only (.+) are listed on the Disciplines tab$/, async ({ page }, names: string) => {
  await expect(disciplinesPanel(page).locator('[data-disciplines-list] .disciplines-item-name')).toHaveText(namesIn(names));
});

Then(
  'Animalism, which the character lacks, shows its five powers all Locked, the first as {string} on the Disciplines tab',
  async ({ page }, requirement: string) => {
    await disciplineItem(page, 'Animalism').getByRole('button').click();
    await expect(powerRows(page)).toHaveCount(5);
    for (const row of await powerRows(page).all()) await expect(row).toHaveAttribute('data-state', 'locked');
    await expect(powerRows(page).first().getByText(requirement, { exact: true })).toBeVisible();
  },
);

Then(/^(.+) remains under (\w+) on the Disciplines tab$/, async ({ page }, power: string, discipline: string) => {
  await expect(disciplineItem(page, discipline).getByRole('button')).toHaveAttribute('aria-current', 'true');
  await expect(powerRow(page, power)).toBeVisible();
});

Then(/^(.+) remains and (.+) does not on the Disciplines tab$/, async ({ page }, kept: string, dropped: string) => {
  await expect(powerRow(page, kept)).toBeVisible();
  await expect(powerRow(page, dropped)).toHaveCount(0);
});

Then('{string} is shown on the Disciplines tab', async ({ page }, text: string) => {
  await expect(disciplinesPanel(page).getByText(text, { exact: true })).toBeVisible();
});

// What the powers show

Then(/^the powers are listed (.+) on the Disciplines tab$/, async ({ page }, names: string) => {
  const headings = powerRows(page).getByRole('heading');
  await expect(headings).toHaveText(namesIn(names));
});

Then(/^(.+) (?:is|are) Known on the Disciplines tab$/, async ({ page }, names: string) => {
  for (const name of namesIn(names)) {
    await expect(powerRow(page, name)).toHaveAttribute('data-state', 'known');
    await expect(powerRow(page, name).getByText('Known', { exact: true })).toBeVisible();
  }
});

Then(/^(.+) is Locked with "([^"]+)" on the Disciplines tab$/, async ({ page }, name: string, requirement: string) => {
  await expect(powerRow(page, name)).toHaveAttribute('data-state', 'locked');
  await expect(powerRow(page, name).getByText('Locked', { exact: true })).toBeVisible();
  await expect(powerRow(page, name).getByText(requirement, { exact: true })).toBeVisible();
});

// Read-only

// The shared "the Character sheet tab is shown" also needs play mode (it looks for the Edit button), and this scenario is in edit mode.
Then('the Character sheet tab is shown on the Disciplines tab', async ({ page }) => {
  await expect(tabPanelOf(page, 'sheet')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Attributes', exact: true })).toBeVisible();
});

Then('the sheet is still in edit mode on the Disciplines tab', async ({ page }) => {
  await expect(doneButton(page)).toBeVisible();
});

Then('nothing on the Disciplines tab can be edited', async ({ page }) => {
  await expect(disciplinesPanel(page)).toBeVisible();
  await expect(editors(page)).toHaveCount(0);
});

Then('the tab says {string} on the Disciplines tab', async ({ page }, text: string) => {
  await expect(disciplinesPanel(page).getByText(text, { exact: true })).toBeVisible();
});

// What an expanded power shows. They are about the power the scenario expanded.

Then('it shows activation cost {string} on the Disciplines tab', async ({ page, memory }, cost: string) => {
  await expect(ruleOf(page, expanded(memory), 'Activation cost')).toHaveText(cost);
});

Then('it shows duration {string} on the Disciplines tab', async ({ page, memory }, duration: string) => {
  await expect(ruleOf(page, expanded(memory), 'Duration')).toHaveText(duration);
});

Then('it shows prerequisite {string} and difficulty {string} on the Disciplines tab', async ({ page, memory }, prerequisite: string, difficulty: string) => {
  await expect(ruleOf(page, expanded(memory), 'Prerequisite')).toHaveText(prerequisite);
  await expect(ruleOf(page, expanded(memory), 'Difficulty / resistance')).toHaveText(difficulty);
});

Then('it shows its dice pool {string} and its book reference {string} on the Disciplines tab', async ({ page, memory }, dice: string, reference: string) => {
  await expect(ruleOf(page, expanded(memory), 'Dice pool')).toHaveText(dice);
  await expect(ruleOf(page, expanded(memory), 'Book reference')).toHaveText(reference);
});

Then(
  'it shows activation cost {string}, duration {string} and its book reference {string} on the Disciplines tab',
  async ({ page, memory }, cost: string, duration: string, reference: string) => {
    await expect(ruleOf(page, expanded(memory), 'Activation cost')).toHaveText(cost);
    await expect(ruleOf(page, expanded(memory), 'Duration')).toHaveText(duration);
    await expect(ruleOf(page, expanded(memory), 'Book reference')).toHaveText(reference);
  },
);

Then('it shows difficulty {string} on the Disciplines tab', async ({ page, memory }, difficulty: string) => {
  await expect(ruleOf(page, expanded(memory), 'Difficulty / resistance')).toHaveText(difficulty);
});

Then('it shows activation cost {string} and prerequisite {string} on the Disciplines tab', async ({ page, memory }, cost: string, prerequisite: string) => {
  await expect(ruleOf(page, expanded(memory), 'Activation cost')).toHaveText(cost);
  await expect(ruleOf(page, expanded(memory), 'Prerequisite')).toHaveText(prerequisite);
});

Then('its duration reads {string} on the Disciplines tab', async ({ page, memory }, duration: string) => {
  await expect(ruleOf(page, expanded(memory), 'Duration')).toHaveText(duration);
});

Then('its difficulty reads {string} on the Disciplines tab', async ({ page, memory }, difficulty: string) => {
  await expect(ruleOf(page, expanded(memory), 'Difficulty / resistance')).toHaveText(difficulty);
});

Then('what it uses instead of a roll is shown as {string} on the Disciplines tab', async ({ page, memory }, instead: string) => {
  await expect(ruleOf(page, expanded(memory), 'Dice pool')).toHaveText(instead);
});

Then('it shows {string} with {string} on the Disciplines tab', async ({ page, memory }, total: string, formula: string) => {
  const row = powerRow(page, expanded(memory));
  await expect(row.getByText(total, { exact: true })).toBeVisible();
  await expect(row.getByText(formula, { exact: true })).toBeVisible();
});

Then('it shows {string} on the Disciplines tab', async ({ page, memory }, text: string) => {
  await expect(powerRow(page, expanded(memory)).getByText(text, { exact: true })).toBeVisible();
});

Then('{string} is not shown on the Disciplines tab', async ({ page, memory }, text: string) => {
  await expect(powerRow(page, expanded(memory)).getByText(text, { exact: true })).toBeHidden();
});

Then('it has no pool and no {string} button on the Disciplines tab', async ({ page, memory }, button: string) => {
  const row = powerRow(page, expanded(memory));
  await expect(row.getByText(/^Your pool:/)).toBeHidden();
  await expect(row.getByRole('button', { name: button, exact: true })).toBeHidden();
});

Then('it has no {string} line and no {string} button on the Disciplines tab', async ({ page, memory }, line: string, button: string) => {
  const row = powerRow(page, expanded(memory));
  await expect(row.getByText(new RegExp(`^${line}`))).toBeHidden();
  await expect(row.getByRole('button', { name: button, exact: true })).toBeHidden();
});

Then('its panel is shown and its state is {string}, then hidden and {string} on the Disciplines tab', async ({ memory }, first: string, second: string) => {
  expect(disciplinesMemory(memory).panelStates).toEqual([
    { state: first, shown: true },
    { state: second, shown: false },
  ]);
});

// Build pool

Then('its Selected pool holds {word} and {word} on the Disciplines tab', async ({ page }, attribute: string, ability: string) => {
  await expect(traitButton(page, attribute)).toHaveAttribute('aria-pressed', 'true');
  await expect(traitButton(page, ability)).toHaveAttribute('aria-pressed', 'true');
  await expect(tabPanelOf(page, 'sheet').locator('[aria-pressed="true"]')).toHaveCount(2);
  await expect(selectedPoolCard(page).locator('[data-show="pool.formula"]')).toContainText(`${attribute} `);
});

Then('{string} is announced on the Disciplines tab', async ({ page }, text: string) => {
  await expect.poll(() => announcements(page)).toContain(text);
});

Then('focus is on the Selected pool heading on the Disciplines tab', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Selected pool', exact: true })).toBeFocused();
});
