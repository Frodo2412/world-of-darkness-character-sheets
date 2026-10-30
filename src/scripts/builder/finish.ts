// Finishing: blocked while anything is outstanding, confirmed when freebie
// points are unspent, then the two-store finish and the sheet.

import type { V20Build } from '../../domain/v20/creation/build';
import { finishReport } from '../../domain/v20/creation/progress';
import type { BuildStore } from '../../storage/buildStore';
import type { CharacterStore } from '../../storage/characterStore';
import { finishBuild } from '../../storage/finishBuild';
import { clearStatus, showStatus } from '../status';
import { plural } from '../../domain/v20/creation/wording';
import { showRefusal } from './messages';
import { showView } from './pageState';

const sheetUrl = (id: string): string => `/sheet/?id=${encodeURIComponent(id)}`;

const points = (count: number): string => plural(count, 'freebie point');

export function wireFinish(
  root: HTMLElement,
  current: () => V20Build,
  builds: BuildStore,
  characters: CharacterStore,
  /** Redraws every field from the build, giving back what a cleared refusal had left typed. */
  render: () => void,
  /** Stores the build as it is now: what is finished is what is stored, so the two must be the same. */
  save: () => 'saved' | 'failed' | 'gone',
): void {
  const button = root.querySelector<HTMLButtonElement>('[data-finish]')!;
  const notice = root.querySelector<HTMLElement>('[data-finish-notice]')!;
  const dialog = root.querySelector<HTMLDialogElement>('[data-finish-dialog]')!;
  const message = dialog.querySelector<HTMLElement>('[data-finish-dialog-message]')!;
  const confirm = dialog.querySelector<HTMLButtonElement>('[data-finish-confirm]')!;

  /** The finish did not happen: say so, and leave the build and the button as they were. */
  function keepBuild(text: string): void {
    showStatus(text);
    button.disabled = false;
    button.focus();
  }

  /** Says `text` followed by a link to the roster. */
  function showRosterLink(text: string): void {
    const link = document.createElement('a');
    link.href = '/';
    link.textContent = 'Go to your characters';
    notice.replaceChildren(text, link);
  }

  function finish(): void {
    // Disabled at once, so a second activation cannot start a second finish.
    button.disabled = true;
    // A refused autosave would leave the stored build behind the page's: the page keeps the build and says so.
    let saved: ReturnType<typeof save> = 'failed';
    try {
      saved = save();
    } catch {
      // Storage threw while reading; the button must not be left disabled with nothing said.
    }
    if (saved !== 'saved') {
      button.disabled = false;
      return;
    }
    const build = current();
    switch (finishBuild(builds, characters, build.id)) {
      case 'finished':
      case 'finished-build-kept':
        clearStatus();
        window.location.assign(sheetUrl(build.id));
        return;
      case 'already-finished':
        showRosterLink('This build was already finished and has been removed. Its character is on your roster. ');
        return;
      case 'already-finished-build-kept':
        showRosterLink('This build was already finished, but it could not be removed. Its character is on your roster. ');
        return;
      case 'build-missing':
        showView('not-found');
        return;
      case 'not-finishable':
        keepBuild('This build still has items outstanding, so it was not finished. Your build has been kept.');
        return;
      case 'build-unreadable':
        keepBuild('This build could not be read, so it was not finished. Reload the page to see what is stored.');
        return;
      case 'character-unreadable':
        keepBuild('A saved character under this build could not be read, so the build was not finished. Your build has been kept.');
        return;
      case 'save-failed':
        keepBuild('The character could not be saved. This browser refused to store it. Your build has been kept.');
        return;
    }
  }

  button.addEventListener('click', () => {
    const build = current();
    const { blocked, refusalMessage, unspentFreebies: unspent } = finishReport(build);
    if (blocked) {
      // Disabled but explained: nothing happens except the reason, said politely, every time it is tried.
      showRefusal(root, button, refusalMessage, undefined, true);
      // That cleared any other field's refusal, so the fields give back the values they hold.
      render();
      return;
    }
    if (unspent === 0) {
      finish();
      return;
    }
    message.textContent = `This build has ${points(unspent)} unspent. Freebie points cannot be spent after finishing.`;
    confirm.textContent = `Finish with ${points(unspent)} unspent`;
    dialog.returnValue = '';
    dialog.showModal();
  });

  // Escape and "Keep editing" both return to the Finish button.
  dialog.addEventListener('close', () => {
    if (dialog.returnValue === 'finish') finish();
    else button.focus();
  });
}
