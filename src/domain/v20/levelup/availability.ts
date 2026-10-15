// Whether a trait can be raised now: judged against the experience left once what is already chosen is
// counted, one dot at a time. A trait already chosen cannot be chosen again until that is taken back.

import type { V20Character } from '../character';
import { advancementCost } from './costs';
import { pendingTotal, type Pending } from './pending';
import type { Subject } from './subjects';

export type Availability =
  | { state: 'maximum' }
  /** Already in the review: the next dot is not offered twice. */
  | { state: 'pending' }
  | { state: 'affordable'; xp: number }
  /** `shortfall` is the experience still needed. */
  | { state: 'unavailable'; xp: number; shortfall: number };

/**
 * What can be done about raising `subject` given the experience `available` before the review. Nothing for a trait
 * that is not offered at all.
 */
export function availability(character: V20Character, available: number, pending: Pending, subject: Subject): Availability | undefined {
  const cost = advancementCost(character, subject);
  if (cost === undefined) return undefined;
  if (cost.maximum) return { state: 'maximum' };
  if (pending.some((item) => item.subject === subject)) return { state: 'pending' };
  const remaining = available - pendingTotal(pending);
  return cost.xp <= remaining ? { state: 'affordable', xp: cost.xp } : { state: 'unavailable', xp: cost.xp, shortfall: cost.xp - remaining };
}
