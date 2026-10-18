// Applying the chosen advancements, and taking them back: one change to the character in which every
// rating is raised and one spending record is written for each, then exactly those undone.

import type { V20Character } from '../character';
import { experienceTotals, recordSpending, removeSpendings } from '../experience/ledger';
import { currentSession } from '../journal/sessions';
import type { Stamp } from '../journal/stamp';
import { reprice, type Pending, type PendingItem } from './pending';
import { setSubjectRating, subjectKind, subjectRating, type SubjectKind } from './subjects';

/** How a spending record describes the kind of advancement. */
const KIND_NAMES: Readonly<Record<SubjectKind, string>> = {
  attribute: 'Attribute increase',
  ability: 'Ability increase',
  discipline: 'Discipline advancement',
  virtue: 'Virtue increase',
  humanity: 'Humanity / Path increase',
  willpower: 'Willpower increase',
};

/** What was written, kept to take it back: the choices, and the ids of the spending records made for them. */
export interface Applied {
  items: readonly PendingItem[];
  spendingIds: readonly string[];
  /** The experience spent. */
  spent: number;
  /** What was left to spend afterwards. */
  available: number;
}

export type ApplyResult =
  | { ok: true; character: V20Character; applied: Applied }
  | { ok: false; reason: 'no-session' | 'nothing-pending' | 'stale' | 'too-expensive' };

/** The record a spending leaves: the trait with its new rating ("Stealth 3"), what kind of advancement it was, and what it cost. */
const recordOf = (item: PendingItem) => ({ label: `${item.label} ${item.to}`, kind: KIND_NAMES[subjectKind(item.subject)], from: item.from, to: item.to, cost: item.cost });

/**
 * Raises every chosen trait by its dot and records each spending in the current session. It changes nothing
 * and says why when there is no session, nothing is chosen, a choice no longer fits the character, or the
 * choices cost more than is available.
 */
export function applyPending(character: V20Character, pending: Pending, stamp: Stamp): ApplyResult {
  if (pending.length === 0) return { ok: false, reason: 'nothing-pending' };
  const session = currentSession(character.journal);
  if (session === undefined) return { ok: false, reason: 'no-session' };
  const { pending: current, dropped } = reprice(character, pending);
  if (dropped.length > 0 || current.length !== pending.length) return { ok: false, reason: 'stale' };
  const spent = current.reduce((total, item) => total + item.cost, 0);
  const before = experienceTotals(character.journal);
  if (spent > before.available) return { ok: false, reason: 'too-expensive' };

  let next = character;
  let journal = character.journal;
  const spendingIds: string[] = [];
  for (const item of current) {
    next = setSubjectRating(next, item.subject, item.to);
    journal = recordSpending(journal, session.id, recordOf(item), stamp);
    spendingIds.push(journal.xp.spendings.at(-1)!.id);
  }
  return {
    ok: true,
    character: { ...next, journal },
    applied: { items: current, spendingIds, spent, available: before.available - spent },
  };
}

/**
 * Puts back what `applyPending` did: each rating returns to what it was and the record written for it is
 * removed. A rating the player has changed since is left as they set it, and its record stays, so the
 * experience spent still matches the sheet.
 */
export function undoApply(character: V20Character, applied: Applied): V20Character {
  let next = character;
  const restored: string[] = [];
  applied.items.forEach((item, at) => {
    if (subjectRating(next, item.subject) !== item.to) return;
    next = setSubjectRating(next, item.subject, item.from);
    restored.push(applied.spendingIds[at]);
  });
  return { ...next, journal: removeSpendings(next.journal, restored) };
}
