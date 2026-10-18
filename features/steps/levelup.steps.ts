import { expect } from '@playwright/test';
import type { V20Character } from '../../src/domain/v20/character';
import { Given, Then, When, memoryFor, type ScenarioMemory } from './fixtures';
import { announcements } from './support/announcements';
import { arrangeTraits } from './support/arrange';
import { withLedger } from './support/journal-experience';
import { characterArranged } from './support/seed';
import { editButton, enterEditMode, openSavedSheet, savedCharacter } from './support/sheet';
import { rating, setRating } from './support/ratings';
import { showTab } from './support/tabs';
import {
  confirmButton,
  figureValue,
  levelUpPanel,
  reviewLine,
  reviewLines,
  rowNamed,
  selectTrait,
  showLevelUp,
  stepOf,
  summaryValue,
  switchToLevelUp,
  toreador,
  watchWrites,
  writesSoFar,
} from './support/levelup';

// Step phrases for the Level up tab. Those that arrange a character say what it is rated; those that act
// or check name "the Level up tab" or the review, so none overlaps another tab's.

const HEADER = { name: 'Marguerite' };
const SESSION = 'Session 12';

interface LevelUpMemory {
  /** The stored record as the browser held it, to check that a step left it alone. */
  stored?: string;
  /** The ratings and ledger before something was applied. */
  before?: { ratings: string; spent: string; available: string };
  /** The review's "After confirmation" before a step changed it. */
  afterConfirmation?: number;
}

const memoryOf = (memory: ScenarioMemory): LevelUpMemory => memoryFor<LevelUpMemory>({ memory }, 'levelup', () => ({}));

const numberOf = (text: string | null): number => Number((text ?? '').replace('−', '-').match(/-?\d+/)?.[0]);

/** The ratings Level up can change, as one string to compare. */
const ratingsOf = (character: V20Character): string =>
  JSON.stringify({ attributes: character.attributes, abilities: character.abilities, disciplines: character.disciplines, virtues: character.virtues, humanity: character.humanity.rating, willpower: character.willpower });

const ledgerOf = (character: V20Character): string => JSON.stringify(character.journal.xp);

async function saveAndOpen(page: Parameters<typeof openSavedSheet>[0], memory: ScenarioMemory, character: V20Character): Promise<void> {
  memory.saved = [character];
  await watchWrites(page, character.id);
  await openSavedSheet(page, character);
  await showLevelUp(page, character.id);
  memoryOf(memory).stored = JSON.stringify(await savedCharacter(page, character.id));
}

/** "Stealth 2 → 3 and Melee 0 → 1" as the traits they start from, and the same as names. */
function startingTraits(phrase: string): { traits: string; names: string[] } {
  const items = [...phrase.matchAll(/([A-Za-z()'. -]+?) (\d+) → \d+/g)].map((match) => ({ name: match[1].replace(/^ and /, '').trim(), from: match[2] }));
  return { traits: items.map((item) => `${item.name} ${item.from}`).join(', '), names: items.map((item) => item.name) };
}

const arranged = (character: V20Character, traits: string, xp: number, session = SESSION): V20Character => toreador(character, traits, xp, session);

// Arranging

Given(/^a Toreador with (.+?),? and (\d+) XP available(?: in "([^"]*)")?$/, async ({ page, memory }, traits: string, xp: string | number, session: string | null) => {
  await saveAndOpen(page, memory, arranged(characterArranged(HEADER, () => {}), traits, Number(xp), session ?? SESSION));
});

Given(/^a Toreador with (\d+) XP available$/, async ({ page, memory }, xp: string | number) => {
  await saveAndOpen(page, memory, arranged(characterArranged(HEADER, () => {}), '', Number(xp)));
});

Given(/^a Toreador with (?!.*XP available)(.+)$/, async ({ page, memory }, traits: string) => {
  await saveAndOpen(page, memory, arranged(characterArranged(HEADER, () => {}), traits, 0));
});

Given(/^a character whose clan text is "([^"]*)" with (.+) and (\d+) XP available$/, async ({ page, memory }, clan: string, traits: string, xp: string | number) => {
  const character = characterArranged(HEADER, () => {});
  arrangeTraits(character, traits);
  character.header.clan = clan;
  withLedger(character, { sessions: [SESSION], awards: [{ session: SESSION, amount: Number(xp) }] });
  await saveAndOpen(page, memory, character);
});

Given('Stealth and Melee pending with 10 XP available', async ({ page, memory }) => {
  await saveAndOpen(page, memory, arranged(characterArranged(HEADER, () => {}), 'Stealth 2, Melee 0', 10));
  await selectTrait(page, 'Stealth');
  await selectTrait(page, 'Melee');
});

Given(/^"([^"]*)" is current with (\d+) XP available and (.+) pending$/, async ({ page, memory }, session: string, xp: string | number, phrase: string) => {
  const { traits, names } = startingTraits(phrase);
  await saveAndOpen(page, memory, arranged(characterArranged(HEADER, () => {}), traits, Number(xp), session));
  for (const name of names) await selectTrait(page, name);
});

Given(/^"([^"]*)" is current with (\d+) XP available$/, async ({ page, memory }, session: string, xp: string | number) => {
  await saveAndOpen(page, memory, arranged(characterArranged(HEADER, () => {}), 'Stealth 2', Number(xp), session));
});

Given(
  /^a character in play mode with "([^"]*)" current, (\d+) XP available and (.+) pending$/,
  async ({ page, memory }, session: string, xp: string | number, phrase: string) => {
    const { traits, names } = startingTraits(phrase);
    await saveAndOpen(page, memory, arranged(characterArranged(HEADER, () => {}), traits, Number(xp), session));
    for (const name of names) await selectTrait(page, name);
  },
);

Given('advancements just applied on the Level up tab', async ({ page, memory }) => {
  const character = arranged(characterArranged(HEADER, () => {}), 'Stealth 2, Melee 0', 10);
  await saveAndOpen(page, memory, character);
  await selectTrait(page, 'Stealth');
  await selectTrait(page, 'Melee');
  const stored = await savedCharacter(page, character.id);
  memoryOf(memory).before = { ratings: ratingsOf(stored), spent: await figureValue(page, 'Total spent').innerText(), available: await figureValue(page, 'Available XP').innerText() };
  await confirmButton(page).click();
  await expect(levelUpPanel(page).locator('[data-applied]')).toBeVisible();
});

Given(/^two advancements pending with "([^"]*)" current$/, async ({ page, memory }, session: string) => {
  await saveAndOpen(page, memory, arranged(characterArranged(HEADER, () => {}), 'Stealth 2, Melee 0', 10, session));
  await selectTrait(page, 'Stealth');
  await selectTrait(page, 'Melee');
});

Given(/^a pending advancement on the Level up tab( at 320 pixels wide)?$/, async ({ page, memory }, narrow: string | null) => {
  if (narrow != null) await page.setViewportSize({ width: 320, height: 800 });
  await saveAndOpen(page, memory, arranged(characterArranged(HEADER, () => {}), 'Stealth 2', 8));
  await selectTrait(page, 'Stealth');
});

Given('Stealth 2 → 3 pending and then Stealth raised to 3 in edit mode', async ({ page, memory }) => {
  await saveAndOpen(page, memory, arranged(characterArranged(HEADER, () => {}), 'Stealth 2', 8));
  await selectTrait(page, 'Stealth');
  await showTab(page, 'Character sheet');
  await enterEditMode(page);
  await setRating(rating(page, 'Stealth'), 3);
});

/** Enough to overflow a phone: a clan and a Discipline of unbroken words, one choice pending. */
Given('a Toreador with 10 XP available and one advancement pending', async ({ page, memory }) => {
  const long = 'Supercalifragilisticexpialidocious'.repeat(2);
  const character = characterArranged({ ...HEADER, chronicle: long }, () => {});
  arrangeTraits(character, 'Stealth 2');
  character.disciplines[0] = { name: `Presence ${long}`, rating: 3 };
  character.disciplines[1] = { name: 'Auspex', rating: 2 };
  await saveAndOpen(page, memory, toreador(character, '', 10));
  await selectTrait(page, 'Stealth');
});

// Acting

When(/^the player selects (.+?) (\d+) → (\d+) on the Level up tab$/, async ({ page }, label: string, _from: string | number, _to: string | number) => {
  await selectTrait(page, label);
});

When(/^the player removes (.+) from the review$/, async ({ page, memory }, label: string) => {
  memoryOf(memory).afterConfirmation = numberOf(await summaryValue(page, 'After confirmation').textContent());
  await reviewLine(page, label).getByRole('button', { name: `Remove ${label} from the review`, exact: true }).click();
});

When('the player confirms on the Level up tab', async ({ page, memory }) => {
  memoryOf(memory).before = {
    ratings: ratingsOf(await savedCharacter(page, memory.saved[0].id)),
    spent: await figureValue(page, 'Total spent').innerText(),
    available: await figureValue(page, 'Available XP').innerText(),
  };
  memoryOf(memory).stored = JSON.stringify(await savedCharacter(page, memory.saved[0].id));
  (memoryOf(memory) as LevelUpMemory & { writes?: number }).writes = await writesSoFar(page);
  await confirmButton(page).click();
});

When('the player chooses {string} on the Level up tab', async ({ page }, name: string) => {
  await levelUpPanel(page).getByRole('button', { name, exact: true }).click();
});

When('the player opens the Combat tab and returns', async ({ page }) => {
  await showTab(page, 'Combat');
  await switchToLevelUp(page);
});

When('the Level up tab is opened again', async ({ page }) => {
  await switchToLevelUp(page);
});

When('the player searches {string} on the Level up tab', async ({ page }, query: string) => {
  await levelUpPanel(page).getByRole('searchbox', { name: 'Search attributes, abilities or disciplines', exact: true }).fill(query);
});

When('the player turns on {string}', async ({ page }, label: string) => {
  await levelUpPanel(page).getByLabel(label, { exact: true }).check();
});

// Checking: costs and rows

/** Checks that a row offers the next dot at the cost. */
async function expectCost(page: Parameters<typeof rowNamed>[0], label: string, from: string | number, to: string | number, xp: string | number): Promise<void> {
  const row = rowNamed(page, label);
  await expect(row.locator('.levelup-row-change')).toHaveText(`${from} → ${to}`);
  await expect(row.locator('.levelup-row-cost')).toHaveText(`${xp} XP`);
}

Then(/^([^\d→]+?) (\d+) → (\d+) costs (\d+) XP(?: as an? (?:in-clan|out-of-clan) Discipline)?$/, async ({ page }, label: string, from: string | number, to: string | number, xp: string | number) => {
  await expectCost(page, label, from, to, xp);
});

Then(
  /^([^\d→]+?) (\d+) → (\d+) costs (\d+) XP and ([^\d→]+?) (\d+) → (\d+) costs (\d+) XP$/,
  async ({ page }, first: string, a: string | number, b: string | number, c: string | number, second: string, d: string | number, e: string | number, f: string | number) => {
    await expectCost(page, first, a, b, c);
    await expectCost(page, second, d, e, f);
  },
);

Then(/^([^\d→]+?) (\d+) → (\d+) is offered at (\d+) XP$/, async ({ page, memory }, label: string, from: string | number, to: string | number, xp: string | number) => {
  await showLevelUp(page, memory.saved[0].id);
  await expectCost(page, label, from, to, xp);
  await expect(stepOf(rowNamed(page, label))).toBeEnabled();
});

Then(
  /^([^\d→]+?) (\d+) → (\d+) shows "([^"]*)" and its "\+" is disabled with that reason in text$/,
  async ({ page, memory }, label: string, from: string | number, to: string | number, note: string) => {
    await showLevelUp(page, memory.saved[0].id);
    const row = rowNamed(page, label);
    await expect(row.locator('.levelup-row-note')).toHaveText(note);
    await expect(stepOf(row)).toBeDisabled();
    await expect(stepOf(row)).toHaveAttribute('aria-describedby', (await row.locator('.levelup-row-note').getAttribute('id'))!);
    await expect(row.locator('.levelup-row-change')).toHaveText(`${from} → ${to}`);
  },
);

Then(/^([^\d→]+?) (\d+) → (\d+) shows "(Unavailable · need \d+ XP)"$/, async ({ page }, label: string, _from: string | number, _to: string | number, note: string) => {
  await expect(rowNamed(page, label).locator('.levelup-row-note')).toHaveText(note);
  await expect(stepOf(rowNamed(page, label))).toBeDisabled();
});

Then(/^([^\d→]+?) (\d+) → (\d+) is offered$/, async ({ page }, label: string, from: string | number, to: string | number) => {
  await expect(rowNamed(page, label).locator('.levelup-row-change')).toHaveText(`${from} → ${to}`);
  await expect(stepOf(rowNamed(page, label))).toBeEnabled();
});

Then('{word} shows {string} and its "+" is disabled', async ({ page }, label: string, text: string) => {
  await expect(rowNamed(page, label).locator('.levelup-row-note')).toContainText(text);
  await expect(stepOf(rowNamed(page, label))).toBeDisabled();
  await expect(stepOf(rowNamed(page, label))).toHaveText('+');
});

Then('Presence is offered and Auspex is not', async ({ page }) => {
  await expect(rowNamed(page, 'Presence')).toBeVisible();
  await expect(rowNamed(page, 'Auspex')).toHaveCount(0);
});

Then('Backgrounds are not offered', async ({ page }) => {
  await expect(levelUpPanel(page).getByRole('heading', { name: /^Backgrounds$/ })).toHaveCount(0);
  await expect(levelUpPanel(page).locator('li.levelup-row').filter({ hasText: /Allies|Resources|Contacts|Haven/ })).toHaveCount(0);
});

Then('the guidance about new Disciplines and Storyteller confirmation is shown as text with no button', async ({ page }) => {
  const guidance = levelUpPanel(page).getByRole('region', { name: 'Beyond the standard costs', exact: true });
  await expect(guidance).toContainText('New Disciplines and special paths require Storyteller confirmation');
  await expect(guidance).toContainText('Backgrounds have no standard XP formula');
  await expect(guidance.getByRole('button')).toHaveCount(0);
  await expect(guidance.getByRole('link')).toHaveCount(0);
});

// Checking: the review

Then('the Upgrade review lists {word} with {int} XP', async ({ page }, label: string, xp: number) => {
  await expect(reviewLines(page)).toHaveCount(1);
  await expect(reviewLine(page, label).locator('.levelup-line-cost')).toHaveText(`${xp} XP`);
});

Then(/^"After confirmation" reads (\d+) XP$/, async ({ page }, xp: string | number) => {
  await expect(summaryValue(page, 'After confirmation')).toHaveText(`${xp} XP`);
});

Then("the character's Stealth is still 2 and the ledger is unchanged", async ({ page, memory }) => {
  const stored = await savedCharacter(page, memory.saved[0].id);
  expect(stored.abilities.stealth).toBe(2);
  expect(JSON.stringify(stored)).toBe(memoryOf(memory).stored);
  expect(stored.journal.xp.spendings).toEqual([]);
});

Then('Stealth offers no further "+" while pending', async ({ page }) => {
  const step = stepOf(rowNamed(page, 'Stealth'));
  await expect(step).toHaveText('−');
  await expect(step).toHaveAttribute('aria-label', 'Remove Stealth from the review');
});

Then(/^"After confirmation" rises by (\d+) XP$/, async ({ page, memory }, xp: string | number) => {
  const now = numberOf(await summaryValue(page, 'After confirmation').textContent());
  expect(now - memoryOf(memory).afterConfirmation!).toBe(Number(xp));
});

Then('focus is on the next line or the review heading', async ({ page }) => {
  const heading = page.locator('#levelup-review-title');
  const line = levelUpPanel(page).locator('[data-lines] .levelup-step:focus');
  expect((await heading.evaluate((element) => element === document.activeElement)) || (await line.count()) === 1).toBe(true);
});

// Checking: applying

Then('Stealth is 3 and Melee is 1', async ({ page, memory }) => {
  const stored = await savedCharacter(page, memory.saved[0].id);
  expect([stored.abilities.stealth, stored.abilities.melee]).toEqual([3, 1]);
});

Then(/^Session 12 holds two spending records "([^"]*)" and "([^"]*)"$/, async ({ page, memory }, first: string, second: string) => {
  const stored = await savedCharacter(page, memory.saved[0].id);
  const session = stored.journal.sessions.find((candidate) => candidate.title === SESSION)!;
  const records = stored.journal.xp.spendings.filter((spending) => spending.sessionId === session.id);
  expect(records.map((spending) => `${spending.label.replace(/ \d+$/, '')} ${spending.from} → ${spending.to} · ${spending.cost} XP`)).toEqual([first, second]);
});

Then(/^Total spent rises by (\d+) and Available reads (\d+)$/, async ({ page, memory }, rise: string | number, available: string | number) => {
  const before = numberOf(memoryOf(memory).before!.spent);
  await expect(figureValue(page, 'Total spent')).toHaveText(String(before + Number(rise)));
  await expect(figureValue(page, 'Available XP')).toHaveText(String(available));
});

Then('the result is shown as {string} with {string}', async ({ page }, text: string, undo: string) => {
  const result = levelUpPanel(page).locator('[data-applied]');
  await expect(result).toBeVisible();
  await expect(result).toContainText(text);
  await expect(result.getByRole('button', { name: undo, exact: true })).toBeVisible();
  await expect(result).toBeFocused();
});

Then('all of it is still there after a reload and was saved in a single write', async ({ page, memory }) => {
  const writes = (memoryOf(memory) as LevelUpMemory & { writes?: number }).writes!;
  expect((await writesSoFar(page)) - writes).toBe(1);
  await page.reload();
  const stored = await savedCharacter(page, memory.saved[0].id);
  expect([stored.abilities.stealth, stored.abilities.melee]).toEqual([3, 1]);
  expect(stored.journal.xp.spendings).toHaveLength(2);
});

Then('Stealth is 3 and the sheet is still in play mode', async ({ page, memory }) => {
  const stored = await savedCharacter(page, memory.saved[0].id);
  expect(stored.abilities.stealth).toBe(3);
  await expect(editButton(page)).toBeVisible();
});

Then('the ratings are as before and the spending records are gone', async ({ page, memory }) => {
  const stored = await savedCharacter(page, memory.saved[0].id);
  expect(ratingsOf(stored)).toBe(memoryOf(memory).before!.ratings);
  expect(stored.journal.xp.spendings).toEqual([]);
});

Then('the Available balance is as before', async ({ page, memory }) => {
  await expect(figureValue(page, 'Available XP')).toHaveText(memoryOf(memory).before!.available);
  await expect(figureValue(page, 'Total spent')).toHaveText(memoryOf(memory).before!.spent);
});

Then("the character's ratings and the ledger are unchanged", async ({ page, memory }) => {
  const stored = await savedCharacter(page, memory.saved[0].id);
  expect(JSON.stringify(stored)).toBe(memoryOf(memory).stored);
  expect(ledgerOf(stored)).toBe(ledgerOf(JSON.parse(memoryOf(memory).stored!) as V20Character));
});

Then('the pending list is empty', async ({ page }) => {
  await expect(reviewLines(page)).toHaveCount(0);
  await expect(summaryValue(page, 'Pending subtotal · 0 upgrades')).toHaveText('0 XP');
});

Then('the advancement is still pending', async ({ page }) => {
  await expect(reviewLines(page)).toHaveCount(1);
  await expect(reviewLine(page, 'Stealth')).toBeVisible();
});

Then('nothing is pending', async ({ page }) => {
  await expect(levelUpPanel(page)).toBeVisible();
  await expect(reviewLines(page)).toHaveCount(0);
});

Then('the tab says {string}', async ({ page }, text: string) => {
  await expect(levelUpPanel(page).getByText(text, { exact: true })).toBeVisible();
});

Then(/^"(.* removed from the review)" is shown$/, async ({ page }, text: string) => {
  await expect(levelUpPanel(page).locator('[data-dropped]')).toContainText(text);
  await expect.poll(() => announcements(page)).toContain(text);
});

// Checking: no XP, no session, nothing pending

Then('"No XP available" links to Journal → Experience', async ({ page }) => {
  const notice = levelUpPanel(page).locator('[data-no-xp]');
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('No XP available');
  await expect(notice.getByRole('link', { name: 'Journal → Experience', exact: true })).toBeVisible();
});

Then('"Confirm & apply" is disabled and says to select an advancement', async ({ page }) => {
  await expect(confirmButton(page)).toBeDisabled();
  await expect(levelUpPanel(page).locator('[data-confirm-reason]')).toHaveText('Select an advancement to review.');
});

// Checking: search and the filter

Then('only matching traits remain', async ({ page }) => {
  const rows = levelUpPanel(page).locator('li.levelup-row');
  await expect(rows).toHaveCount(1);
  await expect(rows.first().locator('.levelup-row-name')).toHaveText('Stealth');
});

Then('rows marked {string} are hidden', async ({ page }, word: string) => {
  await expect(levelUpPanel(page).locator('li.levelup-row', { hasText: word })).toHaveCount(0);
});

Then('an empty-state message is shown', async ({ page }) => {
  await expect(levelUpPanel(page).getByText('No advancements match.', { exact: true })).toBeVisible();
  await expect(levelUpPanel(page).locator('li.levelup-row')).toHaveCount(0);
});

Then('a {string} bar links to the review', async ({ page }, text: string) => {
  const bar = levelUpPanel(page).locator('[data-bar]');
  await expect(bar).toBeVisible();
  await expect(bar).toHaveText(text);
  await expect(bar).toHaveAttribute('href', '#levelup-review');
  await bar.click();
  await expect(page.locator('#levelup-review-title')).toBeFocused();
});
