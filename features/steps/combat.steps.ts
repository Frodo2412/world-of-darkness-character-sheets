import { expect } from '@playwright/test';
import { CALLED_SHOTS, RANGE_BANDS } from '../../src/domain/v20/combat/data/modifiers';
import { MELEE_WEAPONS } from '../../src/domain/v20/combat/data/weapons';
import { damageText } from '../../src/domain/v20/combat/rows';
import { Given, Then, When, memoryFor, type ScenarioMemory } from './fixtures';
import { announcements } from './support/announcements';
import { controlNames } from './support/accessibility';
import { addDiscipline } from './support/arrange';
import {
  attackAccuracy,
  attackDice,
  attackDifficulty,
  attackFormula,
  combatPanel,
  damageDice,
  numberIn,
  picker,
  rollPanel,
  rowNamed,
  rowsOf,
  showCombat,
} from './support/combat';
import { characterArranged, givenSaved } from './support/seed';
import { openSavedSheet, savedCharacter } from './support/sheet';
import { showTab } from './support/tabs';

// Step phrases for the Combat tab. Each names the tab, so none overlaps another tab's.

interface CombatMemory {
  /** The record as the browser held it, to check later that nothing in the tab changed it. */
  stored?: string;
  /** What the panel showed before a step changed it. */
  before: { difficulty?: number; damage?: number };
}

const combat = (memory: ScenarioMemory): CombatMemory => memoryFor<CombatMemory>({ memory }, 'combat', () => ({ before: {} }));

const HEADER = { name: 'Marguerite', clan: 'Toreador' };

/** Saves a character, opens its sheet (so announcements are watched) and shows the Combat tab. */
async function openCombat(
  page: Parameters<typeof openSavedSheet>[0],
  memory: ScenarioMemory,
  arrange: Parameters<typeof characterArranged>[1] = () => {},
): Promise<void> {
  memory.saved = [characterArranged(HEADER, arrange)];
  await openSavedSheet(page, memory.saved[0]);
  await showCombat(page, memory.saved[0].id);
  combat(memory).stored = JSON.stringify(await savedCharacter(page, memory.saved[0].id));
}

const extraField = (page: Parameters<typeof rollPanel>[0]) => rollPanel(page).locator('[data-input="extra"]');

// Arranging

Given(
  /^the Weapon roll panel on the Combat tab showing an attack pool of (\d+) dice and difficulty (\d+)$/,
  async ({ page, memory }, dice: string, difficulty: string) => {
    await openCombat(page, memory, (character) => {
      character.attributes.dexterity = 3;
    });
    await expect(attackDice(page)).toHaveText(`${dice} dice`);
    await expect(attackDifficulty(page)).toHaveText(String(difficulty));
  },
);

Given('the Weapon roll panel on the Combat tab', async ({ page, memory }) => {
  await openCombat(page, memory);
});

// The light revolver's chart damage is the flat 4 the scenario names.
Given(/^the Weapon roll panel on the Combat tab with a weapon of flat damage (\d+)$/, async ({ page, memory }, flat: string) => {
  await openCombat(page, memory);
  await picker(page, 'weapon').selectOption('Revolver, Lt.');
  await expect(damageDice(page)).toHaveText(`${flat} dice`);
});

Given('a character with no Discipline power that grants claws', async ({ page, memory }) => {
  await givenSaved(page, memory, HEADER);
});

Given('a character with Protean 2 and its claws power', async ({ page, memory }) => {
  await givenSaved(page, memory, HEADER, (character) => addDiscipline(character, 'Protean', 2));
});

Given('a character with a weapon selected and modifiers entered on the Combat tab', async ({ page, memory }) => {
  await openCombat(page, memory, (character) => {
    character.attributes.dexterity = 3;
    character.abilities.melee = 2;
    addDiscipline(character, 'Thaumaturgical Sanguinary Dominationesque', 5);
  });
  await picker(page, 'weapon').selectOption('Sap');
  await picker(page, 'manoeuvre').selectOption('Weapon Strike');
  await rollPanel(page).getByRole('button', { name: 'Increase other attack dice modifier' }).click();
  await rollPanel(page).getByRole('button', { name: 'Increase difficulty' }).click();
  await picker(page, 'target').selectOption('small');
});

// Opening and using the tab

When(/^the Combat tab is opened on (Melee|Ranged)$/, async ({ page, memory }, section: string) => {
  await showCombat(page, memory.saved[0].id);
  const subtab = combatPanel(page).getByRole('button', { name: section, exact: true });
  await subtab.click();
  await expect(subtab).toHaveAttribute('aria-pressed', 'true');
});

When(/^the player selects the (\w+) and "([^"]+)" on the Combat tab$/, async ({ page, memory }, weapon: string, manoeuvre: string) => {
  await showCombat(page, memory.saved[0].id);
  await picker(page, 'weapon').selectOption(weapon);
  await picker(page, 'manoeuvre').selectOption(manoeuvre);
});

When(/^the player selects the (\w+) on the Combat tab$/, async ({ page }, weapon: string) => {
  await picker(page, 'weapon').selectOption(weapon);
});

When(/^the player presses "([^"]+)" on the Combat tab$/, async ({ page, memory }, name: string) => {
  await showCombat(page, memory.saved[0].id);
  await combatPanel(page).getByRole('button', { name, exact: true }).click();
});

When('the player adds one die and raises the difficulty by one on the Combat tab', async ({ page }) => {
  await rollPanel(page).getByRole('button', { name: 'Increase other attack dice modifier' }).click();
  await rollPanel(page).getByRole('button', { name: 'Increase difficulty' }).click();
});

When('the player chooses a called-shot Target on the Combat tab', async ({ page, memory }) => {
  combat(memory).before = { difficulty: await numberIn(attackDifficulty(page)), damage: await numberIn(damageDice(page)) };
  await picker(page, 'target').selectOption('small');
});

When('the player leaves the Combat tab and returns after a reload', async ({ page, memory }) => {
  await showTab(page, 'Character sheet');
  await page.reload();
  await showCombat(page, memory.saved[0].id);
});

When('the player selects the light revolver and chooses the long range on the Combat tab', async ({ page, memory }) => {
  await showCombat(page, memory.saved[0].id);
  await picker(page, 'weapon').selectOption('Revolver, Lt.');
  await picker(page, 'range').selectOption('long');
});

When(
  /^the player selects a weapon of Strength \+ 1 damage and enters (\d+) extra successes on the Combat tab$/,
  async ({ page, memory }, extra: string) => {
    await showCombat(page, memory.saved[0].id);
    await picker(page, 'weapon').selectOption('Sap');
    await picker(page, 'manoeuvre').selectOption('Weapon Strike');
    await extraField(page).fill(String(extra));
    await extraField(page).press('Tab');
  },
);

When(/^the player enters (-?\d+) extra successes on the Combat tab$/, async ({ page }, extra: string) => {
  await extraField(page).fill(String(extra));
  await extraField(page).press('Tab');
});

const searchBox = (page: Parameters<typeof combatPanel>[0]) =>
  combatPanel(page).getByRole('searchbox', { name: 'Search manoeuvres or weapons', exact: true });

When(/^the player searches "([^"]+)" on the Combat tab$/, async ({ page }, query: string) => {
  await searchBox(page).fill(query);
});

When('the player leaves the Combat tab and returns without a reload', async ({ page, memory }) => {
  await showTab(page, 'Character sheet');
  await showCombat(page, memory.saved[0].id);
});

Then('the search is empty, with no clear button and no count on the Combat tab', async ({ page }) => {
  await expect(searchBox(page)).toHaveValue('');
  await expect(combatPanel(page).locator('[data-search-clear]')).toBeHidden();
  await expect(combatPanel(page).locator('[data-search-count]')).toHaveText('');
});

When('the player clears the search and chooses "Ranged combat" on the Combat tab', async ({ page }) => {
  await searchBox(page).fill('');
  await combatPanel(page).getByRole('button', { name: 'Ranged combat', exact: true }).click();
});

// The tables

Then(/^(.+) shows "([^"]+)" with "([^"]+)" on the Combat tab$/, async ({ page }, name: string, dice: string, formula: string) => {
  const row = rowNamed(page, 'melee-manoeuvres', name);
  await expect(row.locator('.combat-dice')).toHaveText(dice);
  await expect(row.locator('.combat-formula-small').first()).toHaveText(formula);
});

Then('its accuracy, difficulty and base damage are those of the rulebook on the Combat tab', async ({ page }) => {
  const cells = rowNamed(page, 'melee-manoeuvres', 'Strike').locator('td');
  await expect(cells.nth(1)).toHaveText('0');
  await expect(cells.nth(2)).toHaveText('6');
  await expect(cells.nth(3)).toContainText('Str');
});

Then(
  /^the Sap shows damage "([^"]+)", type "([^"]+)", concealment "([^"]+)" and "([^"]+)" on the Combat tab$/,
  async ({ page }, damage: string, type: string, conceal: string, dice: string) => {
    const row = rowNamed(page, 'melee-weapons', 'Sap');
    const cells = row.locator('td');
    await expect(row.locator('.combat-dice')).toHaveText(dice);
    await expect(cells.nth(1)).toHaveText(damage);
    await expect(cells.nth(2)).toHaveText(type);
    await expect(cells.nth(3)).toHaveText(conceal);
  },
);

Then('the Knife, Club, Sword, Axe and Stake are listed with their rulebook damage and concealment on the Combat tab', async ({ page }) => {
  for (const name of ['Knife', 'Club', 'Sword', 'Axe', 'Stake']) {
    const weapon = MELEE_WEAPONS.find((candidate) => candidate.name === name)!;
    const cells = rowNamed(page, 'melee-weapons', name).locator('td');
    await expect(cells.nth(1), name).toHaveText(damageText(weapon.damage));
    await expect(cells.nth(3), name).toHaveText(weapon.conceal);
  }
});

Then('a ranged manoeuvre shows its pool, accuracy, difficulty and damage as printed in the rulebook on the Combat tab', async ({ page }) => {
  const row = rowNamed(page, 'ranged-manoeuvres', 'Three-Round Burst');
  const cells = row.locator('td');
  await expect(row.locator('.combat-dice')).toHaveText('7 dice');
  await expect(row.locator('.combat-formula-small').first()).toHaveText('Dexterity 3 + Firearms 2 + accuracy 2');
  await expect(cells.nth(1)).toHaveText('+2');
  await expect(cells.nth(2)).toHaveText('7 (+1)');
  await expect(cells.nth(3)).toContainText('Weapon');
});

Then(
  /^the light revolver shows damage "([^"]+)", range "([^"]+)", rate "([^"]+)", clip "([^"]+)" and concealment "([^"]+)" on the Combat tab$/,
  async ({ page }, damage: string, range: string, rate: string, clip: string, conceal: string) => {
    const cells = rowNamed(page, 'ranged-weapons', 'Revolver, Lt.').locator('td');
    await expect(cells.nth(1)).toHaveText(damage);
    await expect(cells.nth(2)).toContainText(range);
    await expect(cells.nth(3)).toHaveText(rate);
    await expect(cells.nth(4)).toHaveText(clip);
    await expect(cells.nth(5)).toHaveText(conceal);
  },
);

// The Weapon roll panel

Then(/^the attack pool reads "([^"]+)" with "([^"]+)" on the Combat tab$/, async ({ page }, dice: string, formula: string) => {
  await expect(attackDice(page)).toHaveText(dice);
  await expect(attackFormula(page)).toHaveText(formula);
});

Then('accuracy and difficulty are shown on the Combat tab', async ({ page }) => {
  await expect(attackAccuracy(page)).toHaveText('+0');
  await expect(attackDifficulty(page)).toHaveText('6');
});

Then('the Weapon roll panel holds the Sap on the Combat tab', async ({ page }) => {
  await expect(picker(page, 'weapon')).toHaveValue('Sap');
});

Then('the Sap row is marked "Selected" on the Combat tab', async ({ page }) => {
  await expect(rowNamed(page, 'melee-weapons', 'Sap').locator('[data-tag="Selected"]')).toBeVisible();
});

Then('the pool reads 4 dice and the difficulty 7 on the Combat tab', async ({ page }) => {
  await expect(attackDice(page)).toHaveText('4 dice');
  await expect(attackDifficulty(page)).toHaveText('7');
});

Then("the difficulty and the damage change as the rulebook's called-shot table says on the Combat tab", async ({ page, memory }) => {
  const shot = CALLED_SHOTS.find((candidate) => candidate.key === 'small')!;
  const { difficulty, damage } = combat(memory).before;
  await expect(attackDifficulty(page)).toHaveText(String(difficulty! + shot.difficulty));
  expect(await numberIn(damageDice(page))).toBe(damage! + shot.damage);
});

Then('the modifiers are back to zero and the stored record is unchanged on the Combat tab', async ({ page, memory }) => {
  await expect(rollPanel(page).locator('[data-input="dice"]')).toHaveValue('0');
  await expect(rollPanel(page).locator('[data-input="difficulty"]')).toHaveValue('6');
  await expect(picker(page, 'target')).toHaveValue('');
  expect(JSON.stringify(await savedCharacter(page, memory.saved[0].id))).toBe(combat(memory).stored);
});

Then('the difficulty is that of the long range band on the Combat tab', async ({ page }) => {
  const band = RANGE_BANDS.find((candidate) => candidate.key === 'long')!;
  await expect(attackDifficulty(page)).toHaveText(String(band.difficulty));
});

Then('the damage pool reads 6 dice on the Combat tab', async ({ page }) => {
  await expect(damageDice(page)).toHaveText('6 dice');
});

Then('the damage pool reads 4 dice and the entry is corrected with a message on the Combat tab', async ({ page }) => {
  await expect(damageDice(page)).toHaveText('4 dice');
  await expect(extraField(page)).toHaveValue('0');
  await expect(rollPanel(page).locator('[data-extra-hint]')).toHaveText('Extra successes kept at 0 or more.');
  await expect.poll(() => announcements(page)).toContain('Extra successes kept at 0 or more.');
});

// Requirements

Then('Claw is marked "Unavailable" and states what it requires on the Combat tab', async ({ page }) => {
  const claw = rowNamed(page, 'melee-manoeuvres', 'Claw');
  await expect(claw.locator('[data-tag="Unavailable"]')).toBeVisible();
  await expect(claw).toContainText('Requires Protean: Feral Claws or Vicissitude: Bonecraft.');
});

Then('Weapon Strike is marked "Weapon required" on the Combat tab', async ({ page }) => {
  await expect(rowNamed(page, 'melee-manoeuvres', 'Weapon Strike').locator('[data-tag="Weapon required"]')).toBeVisible();
});

Then('Claw is not marked unavailable on the Combat tab', async ({ page }) => {
  const claw = rowNamed(page, 'melee-manoeuvres', 'Claw');
  await expect(claw.locator('[data-tag="Unavailable"]')).toHaveCount(0);
  await expect(claw.locator('.combat-dice')).toHaveText(/^\d+ (die|dice)$/);
});

Then('Weapon Strike no longer says "Weapon required" and uses the Sap on the Combat tab', async ({ page }) => {
  await expect(rowNamed(page, 'melee-manoeuvres', 'Weapon Strike').locator('[data-tag="Weapon required"]')).toHaveCount(0);
  await expect(picker(page, 'weapon')).toHaveValue('Sap');
});

// Search and the section control

Then('the Stake remains in the weapons table and everything else is hidden on the Combat tab', async ({ page }) => {
  await expect(rowsOf(page, 'melee-weapons').filter({ visible: true })).toHaveCount(1);
  await expect(rowNamed(page, 'melee-weapons', 'Stake')).toBeVisible();
  for (const table of ['melee-manoeuvres', 'ranged-manoeuvres', 'ranged-weapons'] as const) {
    await expect(rowsOf(page, table).filter({ visible: true })).toHaveCount(0);
  }
});

Then('{string} is shown on the Combat tab', async ({ page }, text: string) => {
  await expect(combatPanel(page).getByText(text).first()).toBeVisible();
});

Then('only the Ranged section is shown and the Ranged sub-tab is selected on the Combat tab', async ({ page }) => {
  await expect(combatPanel(page).locator('[data-section="ranged"]')).toBeVisible();
  await expect(combatPanel(page).locator('[data-section="melee"]')).toBeHidden();
  await expect(combatPanel(page).getByRole('button', { name: 'Ranged', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

// Incapacitation

Then('every attack and damage pool reads 0 and the panel says the character is incapacitated on the Combat tab', async ({ page }) => {
  await expect(combatPanel(page).locator('[data-incapacitated]')).toBeVisible();
  const pools = await combatPanel(page).locator('.combat-pool-cell .combat-dice').allTextContents();
  expect(pools.length).toBeGreaterThan(10);
  expect(pools.every((text) => text === '0 dice' || text === 'Unavailable')).toBe(true);
  await expect(damageDice(page)).toHaveText('0 dice');
  await expect(rollPanel(page).locator('[data-attack-reason]')).toHaveText('Incapacitated · cannot act.');
});

// Nothing is rolled

Then('it has no control whose name contains "Roll" on the Combat tab', async ({ page }) => {
  const names = await controlNames(rollPanel(page));
  expect(names.length).toBeGreaterThan(5);
  expect(names.filter((name) => /roll/i.test(name))).toEqual([]);
});

Then('it says {string} on the Combat tab', async ({ page }, text: string) => {
  await expect(rollPanel(page).getByText(text, { exact: true })).toBeVisible();
});

Then('repeated redraws show no random result on the Combat tab', async ({ page }) => {
  const shown = async () => [await attackDice(page).textContent(), await damageDice(page).textContent(), await attackDifficulty(page).textContent()];
  const before = await shown();
  for (let again = 0; again < 3; again += 1) {
    await rollPanel(page).getByRole('button', { name: 'Increase difficulty' }).click();
    await rollPanel(page).getByRole('button', { name: 'Decrease difficulty' }).click();
    expect(await shown()).toEqual(before);
  }
});

// Reminders

Then('the reminders card lists range and cover, called shots, staking and grappling with page references on the Combat tab', async ({ page }) => {
  const card = combatPanel(page).locator('.combat-reminders-card');
  await expect(card.locator('.combat-reminder-title')).toHaveText([
    'Range & cover V20 p. 278',
    'Called shots V20 p. 274',
    'Staking & grappling V20 pp. 276, 280',
  ]);
});

Then('the reference tables scroll inside their own containers on the Combat tab', async ({ page }) => {
  const regions = combatPanel(page).locator('.dossier-table-scroll').filter({ visible: true });
  expect(await regions.count()).toBeGreaterThan(1);
  for (const region of await regions.all()) {
    expect(await region.evaluate((element) => getComputedStyle(element).overflowX)).toBe('auto');
    expect(await region.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  }
});
