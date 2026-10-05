// Finishing: blocked while anything is outstanding, confirmed when freebie
// points are unspent, then the two-store finish and the sheet.

import type { V20Build } from '../../domain/v20/creation/build';
import { outstanding, unspentFreebies } from '../../domain/v20/creation/progress';
import type { BuildStore } from '../../storage/buildStore';
import type { CharacterStore } from '../../storage/characterStore';
import { finishBuild } from '../../storage/finishBuild';
import { clearStatus, showStatus } from '../status';
import { showView } from './pageState';

const sheetUrl = (id: string): string => `/sheet/?id=${encodeURIComponent(id)}`;

const points = (count: number): string => `${count} freebie ${count === 1 ? 'point' : 'points'}`;

export function wireFinish(
  root: HTMLElement,
  current: () => V20Build,
  builds: BuildStore,
  characters: CharacterStore,
): void {
  const button = root.querySelector<HTMLButtonElement>('[data-finish]')!;
  const list = root.querySelector<HTMLElement>('[data-outstanding]')!;
  const notice = root.querySelector<HTMLElement>('[data-finish-notice]')!;
  const dialog = root.querySelector<HTMLDialogElement>('[data-finish-dialog]')!;
  const message = dialog.querySelector<HTMLElement>('[data-finish-dialog-message]')!;
  const confirm = dialog.querySelector<HTMLButtonElement>('[data-finish-confirm]')!;

  function finish(): void {
    // Disabled at once, so a second activation cannot start a second finish.
    button.disabled = true;
    const build = current();
    switch (finishBuild(builds, characters, build)) {
      case 'finished':
      case 'finished-build-kept':
        clearStatus();
        window.location.assign(sheetUrl(build.id));
        return;
      case 'already-finished': {
        const link = document.createElement('a');
        link.href = '/';
        link.textContent = 'Go to your characters';
        notice.replaceChildren('This build was already finished and has been removed. Its character is on your roster. ', link);
        return;
      }
      case 'build-missing':
        showView('not-found');
        return;
      case 'save-failed':
        showStatus('The character could not be saved. This browser refused to store it. Your build has been kept.');
        button.disabled = false;
        button.focus();
        return;
    }
  }

  button.addEventListener('click', () => {
    const build = current();
    if (outstanding(build).length > 0) {
      list.focus();
      return;
    }
    const unspent = unspentFreebies(build);
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
