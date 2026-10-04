// The one shape every update returns, and the only constructors for it.
// The page saves a build only when an update is applied.

import type { V20Build } from './build';
import { violations } from './limits';

export type UpdateResult =
  | { status: 'applied'; build: V20Build; notices: string[] }
  | { status: 'refused'; build: V20Build; reason: string };

export function applied(build: V20Build, ...notices: string[]): UpdateResult {
  return { status: 'applied', build, notices };
}

/** A refusal hands back the build it was given, so callers can tell nothing changed. */
export function refuse(build: V20Build, reason: string): UpdateResult {
  return { status: 'refused', build, reason };
}

/**
 * Accepts the candidate unless it breaks a rule `before` did not already break.
 * The one place a candidate is checked against `violations`.
 */
export function commit(before: V20Build, candidate: V20Build, notices: string[]): UpdateResult {
  const alreadyBroken = new Set(violations(before));
  const added = violations(candidate).filter((violation) => !alreadyBroken.has(violation));
  return added.length > 0 ? refuse(before, added.join(' ')) : applied(candidate, ...notices);
}
