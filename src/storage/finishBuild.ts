// Finishing a build is two writes across two stores: save the character,
// then remove the build. Never overwrites a character, and never removes a
// build whose character could not be saved.

import { isFinishable } from '../domain/v20/creation/progress';
import { toCharacter } from '../domain/v20/creation/toCharacter';
import type { BuildStore } from './buildStore';
import type { CharacterStore } from './characterStore';

export type FinishResult =
  /** Something is still outstanding, so nothing is saved or removed. */
  | 'not-finishable'
  /** The character is saved and the build removed. */
  | 'finished'
  /** The character could not be saved; the build is kept as it was. */
  | 'save-failed'
  /** The character is saved, but the build could not be removed and lingers on the roster. */
  | 'finished-build-kept'
  /** A character already exists under this build's id; it is left alone and the build removed. */
  | 'already-finished'
  /** As 'already-finished', but the build could not be removed and lingers on the roster. */
  | 'already-finished-build-kept'
  /** Something is stored under this build's id that cannot be read as a character; it is left alone and the build kept. */
  | 'character-unreadable'
  /** The build is no longer stored: finished or deleted elsewhere. */
  | 'build-missing'
  /** The stored build cannot be read, perhaps rewritten elsewhere; it is left alone. */
  | 'build-unreadable';

/** Finishes the build stored under `id`, as it is stored now: another tab may have changed it since this page last saved. */
export function finishBuild(builds: BuildStore, characters: CharacterStore, id: string): FinishResult {
  const existing = characters.load(id).status;
  if (existing === 'found') {
    return builds.delete(id).status === 'deleted' ? 'already-finished' : 'already-finished-build-kept';
  }
  const stored = builds.load(id);
  if (stored.status === 'not-found') return 'build-missing';
  if (stored.status === 'unreadable') return 'build-unreadable';
  const build = stored.build;
  // Not a finished character: saving would overwrite whatever is there, so the build stays as the only copy.
  if (existing === 'unreadable') return 'character-unreadable';
  if (!isFinishable(build)) return 'not-finishable';
  if (characters.save(toCharacter(build)).status === 'failed') return 'save-failed';
  return builds.delete(id).status === 'deleted' ? 'finished' : 'finished-build-kept';
}
