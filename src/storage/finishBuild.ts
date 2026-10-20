// Finishing a build is two writes across two stores: save the character,
// then remove the build. Never overwrites a character, and never removes a
// build whose character could not be saved.

import { isFinishable } from '../domain/v20/creation/progress';
import { toCharacter } from '../domain/v20/creation/toCharacter';
import type { V20Build } from '../domain/v20/creation/build';
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
  | 'build-missing';

export function finishBuild(builds: BuildStore, characters: CharacterStore, build: V20Build): FinishResult {
  const existing = characters.load(build.id).status;
  if (existing === 'found') {
    return builds.delete(build.id).status === 'deleted' ? 'already-finished' : 'already-finished-build-kept';
  }
  if (builds.load(build.id).status === 'not-found') return 'build-missing';
  // Not a finished character: saving would overwrite whatever is there, so the build stays as the only copy.
  if (existing === 'unreadable') return 'character-unreadable';
  if (!isFinishable(build)) return 'not-finishable';
  if (characters.save(toCharacter(build)).status === 'failed') return 'save-failed';
  return builds.delete(build.id).status === 'deleted' ? 'finished' : 'finished-build-kept';
}
