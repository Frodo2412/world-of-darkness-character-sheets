// The one shape every update returns, and the only constructors for it.
// The page saves a build only when an update is applied.

import type { V20Build } from './build';
import { violations } from './limits';
import type { BuildStep } from './rules';

export type UpdateResult =
  | { status: 'applied'; build: V20Build; notices: string[] }
  | { status: 'refused'; build: V20Build; reason: string; step?: BuildStep };

export function applied(build: V20Build, ...notices: string[]): UpdateResult {
  return { status: 'applied', build, notices };
}

/**
 * A refusal hands back the build it was given, so callers can tell nothing
 * changed. `step` names where the player can fix what stands in the way.
 */
export function refuse(build: V20Build, reason: string, step?: BuildStep): UpdateResult {
  return step === undefined
    ? { status: 'refused', build, reason }
    : { status: 'refused', build, reason, step };
}

/**
 * Accepts the candidate unless it breaks a rule `before` did not already break.
 * The one place a candidate is checked against `violations`.
 */
export function commit(before: V20Build, candidate: V20Build, notices: string[]): UpdateResult {
  const alreadyBroken = new Set(violations(before).map((violation) => violation.message));
  const added = violations(candidate).filter((violation) => !alreadyBroken.has(violation.message));
  if (added.length === 0) return applied(candidate, ...notices);
  return refuse(before, added.map((violation) => violation.message).join(' '), added[0].step);
}
