// The experience ledger inside the journal: awards earned and spendings made,
// each recorded against a session. Pure; every function returns a new journal.

import { currentSession } from '../journal/sessions';
import type { Stamp } from '../journal/stamp';
import type { Journal, Spending } from '../journal/types';

/** What a spending records about the trait that was raised. */
export type SpendingEntry = Omit<Spending, 'id' | 'sessionId'>;

/** Records experience earned in a session; a negative amount takes experience back. */
export function awardXp(journal: Journal, sessionId: string, amount: number, note: string, stamp: Stamp): Journal {
  const award = { id: stamp.newId(), sessionId, amount, note };
  return { ...journal, xp: { ...journal.xp, awards: [...journal.xp.awards, award] } };
}

/** Records experience spent in a session. The spending is appended, so a caller finds its id at the end of the list. */
export function recordSpending(journal: Journal, sessionId: string, entry: SpendingEntry, stamp: Stamp): Journal {
  const spending: Spending = { ...entry, id: stamp.newId(), sessionId };
  return { ...journal, xp: { ...journal.xp, spendings: [...journal.xp.spendings, spending] } };
}

/** Removes exactly the spendings with these ids: the Undo of a level-up. */
export function removeSpendings(journal: Journal, ids: readonly string[]): Journal {
  const spendings = journal.xp.spendings.filter((spending) => !ids.includes(spending.id));
  return { ...journal, xp: { ...journal.xp, spendings } };
}

export interface ExperienceTotals {
  earned: number;
  spent: number;
  /** Earned less spent; negative when more has been spent than earned. */
  available: number;
  /** Earned in the current session; 0 while there is none. */
  thisSession: number;
}

const sum = <T>(items: readonly T[], amountOf: (item: T) => number): number =>
  items.reduce((total, item) => total + amountOf(item), 0);

/** Every figure the Journal and Level up show, from the ledger alone. */
export function experienceTotals(journal: Journal): ExperienceTotals {
  const { awards, spendings } = journal.xp;
  const sessionId = currentSession(journal)?.id;
  const earned = sum(awards, (award) => award.amount);
  const spent = sum(spendings, (spending) => spending.cost);
  const thisSession = sum(
    awards.filter((award) => award.sessionId === sessionId),
    (award) => award.amount,
  );
  return { earned, spent, available: earned - spent, thisSession };
}
