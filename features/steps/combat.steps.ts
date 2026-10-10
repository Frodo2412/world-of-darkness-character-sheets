import { expect, type Locator, type Page } from '@playwright/test';
import type { DataTable } from 'playwright-bdd';
import { Given, Then, When } from './fixtures';
import { controlNames } from './support/accessibility';
import { storedRecords } from './support/storage';
import { showTab } from './support/tabs';
import { escaped } from './support/text';
import {
  cellOf,
  combatMemory,
  combatPanel,
  enterExtraSuccesses,
  expectListed,
  listedCounts,
  rollInput,
  rollPanel,
  rollReading,
  rowsOf,
  saveCombatCharacter,
  searchField,
  sectionControl,
  selectInRoll,
  showCombat,
  tableRow,
  tablesControl,
} from './support/combat';

// The steps of the Combat scenarios. Each one that is not shared names the tab ("on the Combat
// tab"), so it never has the same words as a step of another tab.

// Arranging

Given(/^a character with (.+?) and no weapon selected on the Combat tab$/, async ({ page, memory }, words: string) => {
  await saveCombatCharacter(page, memory, words);
});

// A character with a weapon and manoeuvre already chosen (the tab is opened to choose them) or not.
Given(/^a character with (.+?(?<! selected)) on the Combat tab$/, async ({ page, memory }, words: string) => {
  await saveCombatCharacter(page, memory, words);
});

Given(
  /^a character with (.+?) with (?:the )?"?([^"]+?)"? and "([^"]+)" selected on the Combat tab$/,
  async ({ page, memory }, words: string, weapon: string, manoeuvre: string) => {
    await saveCombatCharacter(page, memory, words);
    await selectInRoll(page, memory, weapon, manoeuvre);
    combatMemory(memory).stored = await storedRecords(page);
  },
);

// Choosing

When(/^(Melee|Ranged) is chosen on the Combat tab$/, async ({ page, memory }, table: string) => {
  await showCombat(page, memory);
  await tablesControl(page).getByRole('button', { name: table, exact: true }).click();
});

When('the player chooses {string} on the Combat tab', async ({ page, memory }, label: string) => {
  await showCombat(page, memory);
  await sectionControl(page).getByRole('button', { name: label, exact: true }).click();
});

When('the player searches {string} on the Combat tab', async ({ page, memory }, query: string) => {
  await showCombat(page, memory);
  await searchField(page).fill(query);
});

When(/^the player selects (?:the )?"?([^"]+?)"? and "([^"]+)" on the Combat tab$/, async ({ page, memory }, weapon: string, manoeuvre: string) => {
  await selectInRoll(page, memory, weapon, manoeuvre);
});

When(/^the player selects the (\w+|SMG, Large) on the Combat tab$/, async ({ page, memory }, weapon: string) => {
  await showCombat(page, memory);
  await rollInput(page, 'Weapon').selectOption(weapon);
});

When('the player adds one die and raises the difficulty by one on the Combat tab', async ({ page }) => {
  await rollInput(page, 'Dice modifier').fill('1');
  await rollInput(page, 'Difficulty modifier').fill('1');
});

When('the player sets the dice modifier to {int} on the Combat tab', async ({ page }, dice: number) => {
  await rollInput(page, 'Dice modifier').fill(String(dice));
});

When('the player chooses the Target {string} on the Combat tab', async ({ page }, target: string) => {
  await rollInput(page, 'Target').selectOption({ label: target });
});

When('the player chooses the Range {string} on the Combat tab', async ({ page }, range: string) => {
  await rollInput(page, 'Range').selectOption({ label: range });
});

// Leaving by the tab bar and coming back by it: the page is not reloaded.
When('the player leaves the Combat tab for the Character sheet tab and returns without reloading on the Combat tab', async ({ page }) => {
  await showTab(page, 'Character sheet');
  await showTab(page, 'Combat');
});

When(
  /^the player selects the (.+) and enters (-?\d+) extra successes on the Combat tab$/,
  async ({ page, memory }, weapon: string, extra: number) => {
    await showCombat(page, memory);
    await rollInput(page, 'Weapon').selectOption(weapon);
    await enterExtraSuccesses(page, extra);
  },
);

When(/^the player enters (-?\d+) extra successes on the Combat tab$/, async ({ page }, extra: number) => {
  await enterExtraSuccesses(page, extra);
});

When(/^the player presses "([^"]+)" for the (.+) on the Combat tab$/, async ({ page, memory }, button: string, weapon: string) => {
  await showCombat(page, memory);
  await combatPanel(page).getByRole('button', { name: `${button}: ${weapon}`, exact: true }).click();
});

// What the tables show

Then(/^(.+) shows "([^"]+)" with "([^"]+)" on the Combat tab$/, async ({ page }, name: string, dice: string, formula: string) => {
  const row = tableRow(page, name);
  await expect(cellOf(row, 'pool')).toHaveText(dice);
  await expect(cellOf(row, 'formula')).toHaveText(formula);
});

Then('these manoeuvres show {string} and the rulebook\'s values on the Combat tab', async ({ page }, dice: string, table: DataTable) => {
  for (const values of table.hashes()) {
    const row = tableRow(page, values.Manoeuvre);
    await expect(cellOf(row, 'pool'), values.Manoeuvre).toHaveText(dice);
    await expect(cellOf(row, 'accuracy'), values.Manoeuvre).toHaveText(values.Accuracy);
    await expect(cellOf(row, 'difficulty'), values.Manoeuvre).toHaveText(values.Difficulty);
    await expect(cellOf(row, 'damage'), values.Manoeuvre).toHaveText(values['Base damage']);
    await expect(cellOf(row, 'page'), values.Manoeuvre).toHaveText(values.Page);
  }
});

Then('every melee weapon shows {string} and its V20 page {string} on the Combat tab', async ({ page }, dice: string, reference: string) => {
  const rows = rowsOf(page, 'melee-weapons');
  await expect(rows).toHaveCount(6);
  await expect(rows.locator('[data-field="pool"]')).toHaveText(Array(6).fill(dice));
  await expect(rows.locator('[data-field="page"]')).toHaveText(Array(6).fill(reference));
});

Then('the melee weapons show the rulebook\'s damage, type and concealment on the Combat tab', async ({ page }, table: DataTable) => {
  for (const values of table.hashes()) {
    const row = tableRow(page, values.Weapon);
    await expect(cellOf(row, 'damage'), values.Weapon).toHaveText(values.Damage);
    await expect(cellOf(row, 'type'), values.Weapon).toHaveText(values.Type);
    await expect(cellOf(row, 'conceal'), values.Weapon).toHaveText(values.Concealment);
  }
});

Then(
  /^"([^"]+)" shows "([^"]+)", accuracy "([^"]+)", difficulty "([^"]+)" and damage "([^"]+)" on the Combat tab$/,
  async ({ page }, name: string, dice: string, accuracy: string, difficulty: string, damage: string) => {
    const row = tableRow(page, name);
    await expect(cellOf(row, 'pool')).toHaveText(dice);
    await expect(cellOf(row, 'accuracy')).toHaveText(accuracy);
    await expect(cellOf(row, 'difficulty')).toHaveText(difficulty);
    await expect(cellOf(row, 'damage')).toHaveText(String(damage));
  },
);

Then(
  /^"([^"]+)" shows accuracy "([^"]+)", difficulty "([^"]+)" and damage "([^"]+)" on the Combat tab$/,
  async ({ page }, name: string, accuracy: string, difficulty: string, damage: string) => {
    const row = tableRow(page, name);
    await expect(cellOf(row, 'accuracy')).toHaveText(accuracy);
    await expect(cellOf(row, 'difficulty')).toHaveText(difficulty);
    await expect(cellOf(row, 'damage')).toHaveText(String(damage));
  },
);

Then(
  /^"([^"]+)" shows damage (\d+), range (\d+), rate (\d+), clip (\d+), concealment "([^"]+)" and "([^"]+)" on the Combat tab$/,
  async ({ page }, name: string, damage: number, range: number, rate: number, clip: number, conceal: string, reference: string) => {
    const row = tableRow(page, name);
    await expect(cellOf(row, 'damage')).toHaveText(String(damage));
    await expect(cellOf(row, 'range')).toHaveText(String(range));
    await expect(cellOf(row, 'rate')).toHaveText(String(rate));
    await expect(cellOf(row, 'clip')).toHaveText(String(clip));
    await expect(cellOf(row, 'conceal')).toHaveText(conceal);
    await expect(cellOf(row, 'page')).toHaveText(reference);
  },
);

Then('{string} shows {string} on the Combat tab', async ({ page }, name: string, dice: string) => {
  await expect(cellOf(tableRow(page, name), 'pool')).toHaveText(dice);
});

Then('{string} shows clip {string} on the Combat tab', async ({ page }, name: string, clip: string) => {
  await expect(cellOf(tableRow(page, name), 'clip')).toHaveText(clip);
});

// What a manoeuvre's row says about what it needs

/** Every mark a row can carry: what the manoeuvre's state and tag read, and what it needs. */
const MARKS = ['unavailable', 'tags', 'requirement', 'uses'];

Then(/^(.+) is marked "([^"]+)" and "([^"]+)" on the Combat tab$/, async ({ page }, name: string, state: string, tag: string) => {
  const row = tableRow(page, name);
  await expect(cellOf(row, 'unavailable')).toHaveText(state);
  await expect(cellOf(row, 'tags')).toHaveText(tag);
});

Then(/^(.+) is marked "([^"]+)" with "([^"]+)" on the Combat tab$/, async ({ page }, name: string, tag: string, requirement: string) => {
  const row = tableRow(page, name);
  await expect(cellOf(row, 'unavailable')).toHaveText('Unavailable');
  await expect(cellOf(row, 'tags')).toHaveText(tag);
  await expect(cellOf(row, 'requirement')).toHaveText(requirement);
});

Then(/^(.+) states its requirement "([^"]+)" on the Combat tab$/, async ({ page }, name: string, requirement: string) => {
  await expect(cellOf(tableRow(page, name), 'requirement')).toHaveText(requirement);
});

Then(/^(.+) is marked "([^"]+)" and states "([^"]+)" on the Combat tab$/, async ({ page }, name: string, tag: string, requirement: string) => {
  const row = tableRow(page, name);
  await expect(cellOf(row, 'tags')).toHaveText(tag);
  await expect(cellOf(row, 'requirement')).toHaveText(requirement);
});

Then(/^(.+) is not marked "([^"]+)" or "([^"]+)" on the Combat tab$/, async ({ page }, name: string, state: string, tag: string) => {
  const row = tableRow(page, name);
  await expect(row.getByText(state, { exact: true })).toBeHidden();
  await expect(row.getByText(tag, { exact: true })).toBeHidden();
});

Then(/^(.+) is not marked on the Combat tab$/, async ({ page }, name: string) => {
  const row = tableRow(page, name);
  for (const mark of MARKS.filter((each) => each !== 'uses')) await expect(cellOf(row, mark), mark).toBeHidden();
});

Then(/^(.+) no longer says "([^"]+)" and uses the (.+) on the Combat tab$/, async ({ page }, name: string, tag: string, weapon: string) => {
  const row = tableRow(page, name);
  await expect(row.getByText(tag, { exact: true })).toBeHidden();
  await expect(cellOf(row, 'unavailable')).toBeHidden();
  await expect(cellOf(row, 'uses')).toHaveText(`Uses the ${weapon}`);
});

Then('every manoeuvre and weapon pool reads {string} on the Combat tab', async ({ page }, dice: string) => {
  const pools = combatPanel(page).locator('tbody [data-field="pool"]');
  // 18 manoeuvres and 17 weapons: a count of fewer would be a table that did not draw.
  await expect(pools).toHaveCount(35);
  for (const pool of await pools.all()) await expect(pool).toHaveText(dice);
});

Then('the attack pool reads {string} and the damage pool reads {string} on the Combat tab', async ({ page }, attack: string, damage: string) => {
  await expect(rollReading(page, 'attack-pool')).toHaveText(attack);
  await expect(rollReading(page, 'damage-pool')).toHaveText(damage);
});

// The reminders card

Then(/^the reminders card lists (.+) on the Combat tab$/, async ({ page }, reminders: string) => {
  const items = combatPanel(page).getByRole('region', { name: 'Combat reminders', exact: true }).getByRole('listitem');
  const wanted = [...reminders.matchAll(/"([^"]+)" \(V20 p\. (\d+)\)/g)].map(([, title, reference]) => ({ title, reference }));
  expect(wanted.length).toBeGreaterThan(0);
  await expect(items).toHaveCount(wanted.length);
  for (const [index, { title, reference }] of wanted.entries()) {
    await expect(items.nth(index).getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(items.nth(index).getByText(`V20 p. ${reference}`, { exact: true })).toBeVisible();
    // A reminder with a title and a page and nothing to remind of would pass the two checks above.
    await expect(items.nth(index).locator('p')).not.toBeEmpty();
  }
});

// What the Weapon roll panel shows

Then('the attack pool reads {string} with {string} on the Combat tab', async ({ page }, dice: string, formula: string) => {
  await expect(rollReading(page, 'attack-pool')).toHaveText(dice);
  await expect(rollReading(page, 'attack-formula')).toHaveText(formula);
});

Then('the attack pool reads {string} on the Combat tab', async ({ page }, dice: string) => {
  await expect(rollReading(page, 'attack-pool')).toHaveText(dice);
});

Then('accuracy reads {string} and difficulty reads {int} on the Combat tab', async ({ page }, accuracy: string, difficulty: number) => {
  await expect(rollReading(page, 'accuracy')).toHaveText(accuracy);
  await expect(rollReading(page, 'difficulty')).toHaveText(String(difficulty));
});

Then('the attack pool reads {string} and the difficulty reads {int} on the Combat tab', async ({ page }, dice: string, difficulty: number) => {
  await expect(rollReading(page, 'attack-pool')).toHaveText(dice);
  await expect(rollReading(page, 'difficulty')).toHaveText(String(difficulty));
});

Then('the difficulty reads {int} on the Combat tab', async ({ page }, difficulty: number) => {
  await expect(rollReading(page, 'difficulty')).toHaveText(String(difficulty));
});

// Also a check that the arrangement took, before the scenario acts.
for (const step of [Given, Then]) {
  step(
    'the Weapon roll panel shows an attack pool of {int} dice, accuracy {string} and difficulty {int} on the Combat tab',
    async ({ page }, dice: number, accuracy: string, difficulty: number) => {
      await expect(rollReading(page, 'attack-pool')).toHaveText(`${dice} dice`);
      await expect(rollReading(page, 'accuracy')).toHaveText(accuracy);
      await expect(rollReading(page, 'difficulty')).toHaveText(String(difficulty));
    },
  );
}

// Also a check that the arrangement took, before the scenario acts.
for (const step of [Given, Then]) {
  step('the damage pool reads {int} dice on the Combat tab', async ({ page }, dice: number) => {
    await expect(rollReading(page, 'damage-pool')).toHaveText(`${dice} dice`);
  });
}

Then('the damage pool still reads {int} dice on the Combat tab', async ({ page }, dice: number) => {
  await expect(rollReading(page, 'damage-pool')).toHaveText(`${dice} dice`);
});

Then('the damage is {word} and its difficulty reads {int} on the Combat tab', async ({ page }, type: string, difficulty: number) => {
  await expect(rollReading(page, 'damage-type')).toHaveText(`${type} damage`);
  await expect(rollReading(page, 'damage-difficulty')).toHaveText(String(difficulty));
});

Then('the entry shows {int} on the Combat tab', async ({ page }, value: number) => {
  await expect(rollInput(page, 'Extra successes')).toHaveValue(String(value));
});

Then('{string} is not shown on the Combat tab', async ({ page }, text: string) => {
  await expect(combatPanel(page).getByText(text, { exact: true })).toBeHidden();
});

Then(
  /^the Targeting table entry it follows reads difficulty "([^"]+)" and damage "([^"]+)" \(V20 p\. (\d+)\) on the Combat tab$/,
  async ({ page }, difficulty: string, damage: string, reference: number) => {
    await expect(rollReading(page, 'target-note')).toHaveText(`Targeting table: difficulty ${difficulty}, damage ${damage} (V20 p. ${reference})`);
  },
);

Then('the dice modifier and the difficulty modifier read {int} on the Combat tab', async ({ page }, value: number) => {
  await expect(rollInput(page, 'Dice modifier')).toHaveValue(String(value));
  await expect(rollInput(page, 'Difficulty modifier')).toHaveValue(String(value));
});

Then('Target and Range are back at their defaults on the Combat tab', async ({ page }) => {
  await expect(rollInput(page, 'Target')).toHaveValue('');
  await expect(rollInput(page, 'Range')).toHaveValue('');
  await expect(rollReading(page, 'target-note')).toBeHidden();
  await expect(rollReading(page, 'range-note')).toBeHidden();
});

Then('the stored record is identical to the record before the visit on the Combat tab', async ({ page, memory }) => {
  const before = combatMemory(memory).stored;
  expect(before, 'the scenario arranged no stored records to compare with').toBeDefined();
  expect(await storedRecords(page)).toEqual(before);
});

// Nothing is rolled

Then('the Weapon roll panel has no control whose name contains {string} on the Combat tab', async ({ page }, word: string) => {
  const names = await controlNames(rollPanel(page));
  // A panel with nothing to operate would pass for the wrong reason.
  expect(names.length).toBeGreaterThan(0);
  expect(names.filter((name) => name.toLowerCase().includes(word.toLowerCase()))).toEqual([]);
});

Then('the Weapon roll panel says {string} on the Combat tab', async ({ page }, text: string) => {
  await expect(rollPanel(page).getByText(text, { exact: true })).toBeVisible();
});

Then('repeated redraws of the Weapon roll panel show no random result on the Combat tab', async ({ page }) => {
  const reading = async (): Promise<string> => rollPanel(page).innerText();
  const first = await reading();
  // Every press of the section control redraws the panel.
  for (const label of ['Close combat', 'Ranged combat', 'All', 'Close combat', 'All']) {
    await sectionControl(page).getByRole('button', { name: label, exact: true }).click();
    expect(await reading()).toBe(first);
  }
});

// What the section control and the search leave listed

Then('{string} is chosen on the Combat tab', async ({ page }, label: string) => {
  await expect(sectionControl(page).getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(sectionControl(page).locator('[aria-pressed="true"]')).toHaveCount(1);
});

Then(/^"([^"]+)" is chosen and (.+) are listed on the Combat tab$/, async ({ page }, label: string, words: string) => {
  await expect(sectionControl(page).getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expectListed(page, listedCounts(words));
});

Then(/^only (.+) are listed and the (Melee|Ranged) sub-tab is selected on the Combat tab$/, async ({ page }, words: string, table: string) => {
  await expectListed(page, listedCounts(words));
  await expect(tablesControl(page).getByRole('button', { name: table, exact: true })).toHaveAttribute('aria-pressed', 'true');
});

Then('only the one melee weapon {word} is listed on the Combat tab', async ({ page }, name: string) => {
  await expectListed(page, { ...listedCounts(''), 'melee-weapons': 1 });
  await expect(rowsOf(page, 'melee-weapons').locator('[data-field="name"]')).toHaveText([name]);
});

Then('only the two ranged weapons are listed on the Combat tab', async ({ page }) => {
  await expectListed(page, listedCounts('two ranged weapons'));
});

Then('the ranged weapons table lists exactly {string} and {string} on the Combat tab', async ({ page }, first: string, second: string) => {
  await expect(rowsOf(page, 'ranged-weapons').locator('[data-field="name"]')).toHaveText([first, second]);
});

Then('{string} is shown on the Combat tab', async ({ page }, text: string) => {
  await expect(combatPanel(page).getByText(text, { exact: true })).toBeVisible();
});

// The weapon chosen for the roll

/** The buttons called "<name>: <weapon>" that say they are pressed. */
const pressedButtons = (page: Page, name: string): Locator =>
  combatPanel(page).getByRole('button', { name: new RegExp(`^${escaped(name)}: `), pressed: true });

Then('{string} is pressed for the {word} alone on the Combat tab', async ({ page }, button: string, weapon: string) => {
  await expect(pressedButtons(page, button)).toHaveCount(1);
  await expect(pressedButtons(page, button)).toHaveAccessibleName(`${button}: ${weapon}`);
});

Then('{string} is pressed for no weapon on the Combat tab', async ({ page }, button: string) => {
  await expect(pressedButtons(page, button)).toHaveCount(0);
});
