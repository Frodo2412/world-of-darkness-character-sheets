import { expect } from '@playwright/test';
import { Given, Then, When, memoryFor, type ScenarioMemory } from './fixtures';
import { characterArranged, saveCharacters } from './support/seed';
import { savedCharacter } from './support/sheet';
import { announcements } from './support/announcements';
import {
  amountField,
  amountHint,
  awardOnPage,
  awardRows,
  cardValue,
  experienceSection,
  showAll,
  showExperience,
  spendingRows,
  withLedger,
  type LedgerSpec,
} from './support/journal-experience';

// Step phrases for the Journal's experience. Those about the section name "the Journal experience" or
// the figures, so none overlaps another tab's.

const HEADER = { name: 'Marguerite', clan: 'Toreador', chronicle: 'The Glass City' };

interface ExperienceMemory {
  /** The ledger as the browser held it, to check later that it was not touched. */
  ledger?: string;
}

const experience = (memory: ScenarioMemory): ExperienceMemory => memoryFor<ExperienceMemory>({ memory }, 'journal-experience', () => ({}));

async function arrange(page: Parameters<typeof saveCharacters>[0], memory: ScenarioMemory, spec: LedgerSpec): Promise<void> {
  memory.saved = [withLedger(characterArranged(HEADER, () => {}), spec)];
  await saveCharacters(page, memory.saved);
}

/** The ledger a scenario's character holds in the browser. */
const storedLedger = async (page: Parameters<typeof savedCharacter>[0], id: string): Promise<string> => JSON.stringify((await savedCharacter(page, id)).journal.xp);

// Arranging

Given(
  /^awards of (\d+), (\d+) and (\d+) and spendings of (\d+) and (\d+), with the first (\d+) in the current session$/,
  async ({ page, memory }, first: string, second: string, third: string, spentA: string, spentB: string, _inCurrent: string) => {
    await arrange(page, memory, {
      sessions: ['Session 11', 'Session 12'],
      awards: [
        { session: 'Session 12', amount: Number(first) },
        { session: 'Session 11', amount: Number(second) },
        { session: 'Session 11', amount: Number(third) },
      ],
      spendings: [
        { session: 'Session 11', label: 'Auspex 3', cost: Number(spentA) },
        { session: 'Session 11', label: 'Brawl 2', cost: Number(spentB) },
      ],
    });
  },
);

Given(
  /^"([^"]*)" is current with (\d+) earned, (\d+) spent and (\d+) earned this session$/,
  async ({ page, memory }, current: string, earned: string, spent: string, thisSession: string) => {
    const earlier = Number(earned) - Number(thisSession);
    await arrange(page, memory, {
      sessions: ['Session 11', current],
      awards: [
        ...(earlier > 0 ? [{ session: 'Session 11', amount: earlier }] : []),
        { session: current, amount: Number(thisSession) },
      ],
      spendings: Number(spent) > 0 ? [{ session: 'Session 11', label: 'Auspex 3', cost: Number(spent) }] : [],
    });
  },
);

Given(/^awards totalling (\d+) and spendings totalling (\d+)$/, async ({ page, memory }, earned: string, spent: string) => {
  await arrange(page, memory, {
    sessions: ['Session 1'],
    awards: [{ session: 'Session 1', amount: Number(earned) }],
    spendings: [{ session: 'Session 1', label: 'Presence 3', cost: Number(spent) }],
  });
});

const awardsOf = (count: number, session: string): LedgerSpec['awards'] =>
  Array.from({ length: count }, (_, at) => ({ session, amount: at + 1, note: `Award ${at + 1}` }));

Given('four awards', async ({ page, memory }) => {
  await arrange(page, memory, { sessions: ['Session 12'], awards: awardsOf(4, 'Session 12') });
});

Given('five awards, the newest in the current session', async ({ page, memory }) => {
  await arrange(page, memory, {
    sessions: ['Session 11', 'Session 12'],
    awards: [...awardsOf(4, 'Session 11'), { session: 'Session 12', amount: 9, note: 'Newest' }],
  });
});

Given(
  /^a spending "([^"]*)" of (\d+) points in (Session \d+) and one "([^"]*)" of (\d+) points in (Session \d+)$/,
  async ({ page, memory }, first: string, firstCost: string, firstSession: string, second: string, secondCost: string, secondSession: string) => {
    await arrange(page, memory, {
      sessions: [secondSession, firstSession],
      awards: [],
      spendings: [
        { session: secondSession, label: second, cost: Number(secondCost) },
        { session: firstSession, label: first, cost: Number(firstCost) },
      ],
    });
  },
);

Given('a character saved before the Journal with text in its experience field', async ({ page, memory }) => {
  memory.saved = [characterArranged(HEADER, (character) => void (character.experience = 'Spent 3 on Brawl.\nSaved the rest.'))];
  await saveCharacters(page, memory.saved);
});

Given('a character with a long ledger', async ({ page, memory }) => {
  const long = 'Supercalifragilisticexpialidocious'.repeat(3);
  const sessions = Array.from({ length: 6 }, (_, at) => `Session ${at + 1}`);
  memory.saved = [
    withLedger(characterArranged({ ...HEADER, chronicle: long }, (character) => void (character.experience = `${long}\n${long}`)), {
      sessions,
      awards: sessions.flatMap((session) => [
        { session, amount: 3, note: `${long} note` },
        { session, amount: -1, note: 'Correction' },
      ]),
      spendings: sessions.map((session) => ({ session, label: `${long} 3`, cost: 4, kind: `${long} advancement` })),
    }),
  ];
  await saveCharacters(page, memory.saved);
});

// Acting

When(
  /^the player awards (-?\d+) (?:points )?with the note "([^"]*)" on the Journal experience$/,
  async ({ page, memory }, amount: string | number, note: string) => {
    await showExperience(page, memory.saved[0].id);
    experience(memory).ledger = await storedLedger(page, memory.saved[0].id);
    await awardOnPage(page, String(amount), note);
  },
);

When(/^the player awards (-?\d+) points on the Journal experience$/, async ({ page, memory }, amount: string | number) => {
  await showExperience(page, memory.saved[0].id);
  await awardOnPage(page, String(amount));
});

When('the player submits {string} as the award on the Journal experience', async ({ page, memory }, amount: string) => {
  await showExperience(page, memory.saved[0].id);
  experience(memory).ledger = await storedLedger(page, memory.saved[0].id);
  await awardOnPage(page, amount);
});

When('the player chooses "Show all"', async ({ page }) => {
  await showAll(page, 'awards').click();
});

// Checking

Then(
  /^Total earned reads (\S+), Total spent (\S+), Available (\S+) and This session (\S+)$/,
  async ({ page }, earned: string, spent: string, available: string, thisSession: string) => {
    await expect(cardValue(page, 'Total earned')).toHaveText(earned);
    await expect(cardValue(page, 'Total spent')).toHaveText(spent);
    await expect(cardValue(page, 'Available')).toHaveText(available);
    await expect(cardValue(page, 'This session')).toHaveText(thisSession);
  },
);

Then(
  /^Total earned reads (\S+), Available reads (\S+) and This session reads (\S+)$/,
  async ({ page }, earned: string, available: string, thisSession: string) => {
    await expect(cardValue(page, 'Total earned')).toHaveText(earned);
    await expect(cardValue(page, 'Available')).toHaveText(available);
    await expect(cardValue(page, 'This session')).toHaveText(thisSession);
  },
);

Then('the award is the first row of the award log', async ({ page }) => {
  const first = awardRows(page).first();
  await expect(first).toContainText('Session 12');
  await expect(first).toContainText('The missing portrait');
  await expect(first).toContainText('+3');
  await expect(first).toContainText('XP awarded');
});

Then('{string} is shown beside the field', async ({ page }, message: string) => {
  await expect(amountHint(page)).toHaveText(message);
  await expect(amountHint(page)).toBeVisible();
  await expect(amountField(page)).toHaveAttribute('aria-describedby', 'journal-award-hint');
  await expect(amountField(page)).toHaveAttribute('aria-invalid', 'true');
  await expect.poll(() => announcements(page)).toContain(message);
});

Then('the ledger is unchanged', async ({ page, memory }) => {
  expect(await storedLedger(page, memory.saved[0].id)).toBe(experience(memory).ledger);
});

Then('the start-a-session prompt is shown in the Experience section', async ({ page }) => {
  const section = experienceSection(page);
  await expect(section.getByRole('heading', { name: 'Start a session first', exact: true })).toBeVisible();
  await expect(section.getByText('Notes, experience and level-ups are recorded in a session.', { exact: true })).toBeVisible();
  await expect(section.getByRole('textbox', { name: /title/i })).toBeVisible();
  await expect(section.getByRole('button', { name: 'Start session', exact: true })).toBeVisible();
});

Then('Available reads {string} and says {string}', async ({ page }, value: string, word: string) => {
  await expect(cardValue(page, 'Available')).toHaveText(value);
  await expect(page.locator('[data-tab-panel="journal"] .journal-xp-card-available')).toContainText(word);
});

Then('all four are shown and there is no "Show all" control', async ({ page, memory }) => {
  await showExperience(page, memory.saved[0].id);
  await expect(awardRows(page)).toHaveCount(4);
  await expect(showAll(page, 'awards')).toBeHidden();
});

Then(
  'four are shown, the newest first, the current session\'s marked "current", with "Show all"',
  async ({ page, memory }) => {
    await showExperience(page, memory.saved[0].id);
    await expect(awardRows(page)).toHaveCount(4);
    await expect(awardRows(page).first()).toContainText('Newest');
    await expect(awardRows(page).first().locator('.journal-xp-mark')).toHaveText('current');
    await expect(awardRows(page).nth(1).locator('.journal-xp-mark')).toBeHidden();
    await expect(showAll(page, 'awards')).toBeVisible();
    await expect(showAll(page, 'awards')).toHaveText('Show all');
  },
);

Then('all five are shown and the count is announced', async ({ page }) => {
  await expect(awardRows(page)).toHaveCount(5);
  await expect.poll(() => announcements(page)).toContain('Showing all 5 awards.');
});

Then(
  'the spending record reads {string} and lists each with its session and cost',
  async ({ page }, count: string) => {
    const record = experienceSection(page).locator('[data-log="spendings"]');
    await expect(record.locator('[data-count]')).toHaveText(count);
    await expect(spendingRows(page)).toHaveCount(2);
    await expect(spendingRows(page).nth(0)).toContainText('Auspex 3');
    await expect(spendingRows(page).nth(0)).toContainText('Session 10');
    await expect(spendingRows(page).nth(0)).toContainText('−10');
    await expect(spendingRows(page).nth(1)).toContainText('Presence 3');
    await expect(spendingRows(page).nth(1)).toContainText('Session 8');
  },
);

Then(/^the reference lists (.+)$/, async ({ page }, list: string) => {
  const expected = list.split(/, | and /);
  const costs = experienceSection(page).locator('.journal-xp-cost');
  await expect(costs).toHaveCount(expected.length);
  const shown = await costs.evaluateAll((rows) => rows.map((row) => `${row.querySelector('dt')!.textContent} ${row.querySelector('dd')!.textContent}`));
  expect(shown).toEqual(expected);
});

Then("it is recorded and the character's traits are unchanged", async ({ page, memory }) => {
  const before = memory.saved[0];
  const after = await savedCharacter(page, before.id);
  expect(after.journal.xp.awards.map((award) => award.amount)).toEqual([2]);
  expect({ ...after, journal: null }).toEqual({ ...JSON.parse(JSON.stringify(before)), journal: null });
});

Then('"Earlier experience note" shows that text and cannot be edited', async ({ page }) => {
  const earlier = experienceSection(page).locator('[data-earlier-experience]');
  await expect(earlier.getByRole('heading', { name: 'Earlier experience note', exact: true })).toBeVisible();
  await expect(earlier.locator('[data-earlier-text]')).toHaveText('Spent 3 on Brawl.\nSaved the rest.');
  await expect(earlier.locator('input, textarea, select, [contenteditable]')).toHaveCount(0);
});
