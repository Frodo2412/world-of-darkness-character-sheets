// The advancements chosen but not yet applied. Pure: nothing here touches the character or the ledger,
// and a list is only ever replaced, never changed in place.

import type { V20Character } from '../character';
import { advancementCost } from './costs';
import { subjectLabel, subjectRating, type Subject } from './subjects';

export interface PendingItem {
  subject: Subject;
  /** What the trait is called, as it was when chosen. */
  label: string;
  from: number;
  to: number;
  /** The experience it costs. */
  cost: number;
  /** The cost rule at length and at its shortest, for the review and the record preview. */
  rule: string;
  shortRule: string;
}

/** In the order the player chose them. */
export type Pending = readonly PendingItem[];

export const pendingTotal = (pending: Pending): number => pending.reduce((total, item) => total + item.cost, 0);

export interface PendingTotals {
  count: number;
  /** The experience the choices cost together. */
  total: number;
  /** What is left of `available` once they are paid for; negative when they cost more. */
  remaining: number;
}

export function pendingTotals(pending: Pending, available: number): PendingTotals {
  const total = pendingTotal(pending);
  return { count: pending.length, total, remaining: available - total };
}

/**
 * Chooses the next dot of a trait. Nothing is added for a trait that is at its maximum, not offered, already
 * chosen, or dearer than what is left of `available` after the choices already made.
 */
export function addPending(character: V20Character, available: number, pending: Pending, subject: Subject): Pending {
  const cost = advancementCost(character, subject);
  if (cost === undefined || cost.maximum || pending.some((item) => item.subject === subject)) return pending;
  if (cost.xp > available - pendingTotal(pending)) return pending;
  const item: PendingItem = {
    subject,
    label: subjectLabel(character, subject),
    from: cost.current,
    to: cost.current + 1,
    cost: cost.xp,
    rule: cost.rule,
    shortRule: cost.shortRule,
  };
  return [...pending, item];
}

export const removePending = (pending: Pending, subject: Subject): Pending => pending.filter((item) => item.subject !== subject);

export const clearPending = (): Pending => [];

export interface Dropped {
  label: string;
  /** What the player is told: "Stealth changed from 2 to 3 · removed from the review". */
  text: string;
}

/**
 * The choices as they stand against the character now. One whose trait has changed since it was chosen
 * (its rating is no longer the one it was priced from, its Discipline was renamed or removed) is dropped, with
 * the words to say so; the rest are priced again, in case the clan changed under them.
 */
export function reprice(character: V20Character, pending: Pending): { pending: Pending; dropped: Dropped[] } {
  const kept: PendingItem[] = [];
  const dropped: Dropped[] = [];
  for (const item of pending) {
    const now = subjectRating(character, item.subject);
    const label = subjectLabel(character, item.subject);
    const cost = advancementCost(character, item.subject);
    if (now === undefined || label === '' || label !== item.label) {
      dropped.push({ label: item.label, text: `${item.label} is no longer on the sheet · removed from the review` });
    } else if (now !== item.from || cost === undefined || cost.maximum) {
      dropped.push({ label: item.label, text: `${item.label} changed from ${item.from} to ${now} · removed from the review` });
    } else {
      // A choice priced as it was stays the very same item, so a list nothing changed is returned as it was.
      kept.push(item.cost === cost.xp && item.rule === cost.rule ? item : { ...item, cost: cost.xp, rule: cost.rule, shortRule: cost.shortRule });
    }
  }
  return { pending: dropped.length === 0 && kept.every((item, at) => item === pending[at]) ? pending : kept, dropped };
}
