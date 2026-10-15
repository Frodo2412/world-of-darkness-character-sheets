import { expect, type Locator, type Page } from '@playwright/test';
import type { V20Character } from '../../../src/domain/v20/character';
import { awardXp, recordSpending } from '../../../src/domain/v20/experience/ledger';
import { startSession } from '../../../src/domain/v20/journal/sessions';
import type { Stamp } from '../../../src/domain/v20/journal/stamp';
import { watchAnnouncements } from './announcements';
import { escaped } from './text';
import { journalPanel } from './journal';
import { openSheetTab } from './tabs';

// This file is the one place that knows the Journal experience's markup: the steps ask for the figures,
// the logs and the Award XP form through the functions below.

export const experienceSection = (page: Page): Locator => journalPanel(page).locator('[data-journal-section="experience"]');

/** One of the four figures, by its label: "Total earned", "Total spent", "Available", "This session". */
export const cardNamed = (page: Page, label: string): Locator =>
  experienceSection(page)
    .locator('.journal-xp-card')
    .filter({ has: page.locator('.journal-xp-label', { hasText: new RegExp(`^${escaped(label)}$`) }) });

export const cardValue = (page: Page, label: string): Locator => cardNamed(page, label).locator('[data-value]');

export const awardRows = (page: Page): Locator => experienceSection(page).locator('[data-log="awards"] [data-list] > li');
export const spendingRows = (page: Page): Locator => experienceSection(page).locator('[data-log="spendings"] [data-list] > li');

/** A log's "Show all" button. */
export const showAll = (page: Page, log: 'awards' | 'spendings'): Locator => experienceSection(page).locator(`[data-log="${log}"]`).getByRole('button', { name: /^Show (all|fewer)/ });

export const awardToggle = (page: Page): Locator => experienceSection(page).getByRole('button', { name: 'Award XP', exact: true });
export const amountField = (page: Page): Locator => experienceSection(page).getByLabel('XP amount', { exact: true });
export const noteField = (page: Page): Locator => experienceSection(page).getByLabel('Note', { exact: true });
export const recordButton = (page: Page): Locator => experienceSection(page).getByRole('button', { name: 'Record award', exact: true });
export const amountHint = (page: Page): Locator => experienceSection(page).locator('[data-award-hint]');

/** Opens the sheet on the Journal tab afresh, so what was saved is what is read. */
export async function showExperience(page: Page, id: string): Promise<void> {
  await openSheetTab(page, id, 'Journal');
  await expect(experienceSection(page)).toBeVisible();
  await watchAnnouncements(page);
}

/** Awards points the way a player does: opens the form, fills it and records. */
export async function awardOnPage(page: Page, amount: string, note = ''): Promise<void> {
  await awardToggle(page).click();
  await amountField(page).fill(amount);
  if (note !== '') await noteField(page).fill(note);
  await recordButton(page).click();
}

export interface LedgerSpec {
  /** Sessions in the order they were started; the last is current. */
  sessions: string[];
  /** In the order they were made. */
  awards: { session: string; amount: number; note?: string }[];
  spendings?: { session: string; label: string; cost: number; kind?: string }[];
}

let made = 0;

/** Ids the page will never make. */
const stamp: Stamp = { newId: () => `seeded-ledger-${(made += 1)}`, now: () => 1_700_000_000_000 + (made += 1) * 1_000 };

/** The character with these sessions, awards and spendings recorded. */
export function withLedger(character: V20Character, spec: LedgerSpec): V20Character {
  const ids = new Map<string, string>();
  for (const title of spec.sessions) {
    character.journal = startSession(character.journal, title, stamp);
    ids.set(title, character.journal.sessions.at(-1)!.id);
  }
  const idOf = (title: string): string => {
    const id = ids.get(title);
    if (id === undefined) throw new Error(`no session called ${title} was started`);
    return id;
  };
  for (const award of spec.awards) {
    character.journal = awardXp(character.journal, { sessionId: idOf(award.session), amount: award.amount, note: award.note ?? '' }, stamp);
  }
  for (const spending of spec.spendings ?? []) {
    character.journal = recordSpending(
      character.journal,
      idOf(spending.session),
      { label: spending.label, kind: spending.kind ?? 'Discipline advancement', from: 1, to: 2, cost: spending.cost },
      stamp,
    );
  }
  return character;
}
