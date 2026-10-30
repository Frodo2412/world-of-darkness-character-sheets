// The rating steppers draw their dots with the sheet's dot-rating, read-only.
import '../components/controls/dot-rating';
import type { V20Build } from '../domain/v20/creation/build';
import { report } from '../domain/v20/creation/progress';
import type { UpdateResult } from '../domain/v20/creation/result';
import type { ScreenId } from '../domain/v20/creation/rules';
import { buildKeyFor, type BuildStore } from '../storage/buildStore';
import type { CharacterStore } from '../storage/characterStore';
import { renderChrome, wireChrome } from './builder/chrome';
import { clearNotices, reportSave, showNotices, showRefusal, type SaveAsk } from './builder/messages';
import { pageState, showView } from './builder/pageState';
import { isPlainClick } from './builder/nav';
import { renderNavigation, wireNavigation } from './builder/navigation';
import { wireDialog } from './builder/parts/dialog';
import { screenModules } from './builder/screens';
import { startSteps } from './builder/steps';
import { renderControls, wireControls, type Update, type Wiring } from './builder/wiring';
import { STORAGE_UNAVAILABLE, showStatus } from './status';

const root = document.querySelector<HTMLElement>('#builder')!;

function showBuilder(loaded: V20Build, store: BuildStore, characters: CharacterStore): void {
  let build = loaded;
  /** What the shell shows around a screen: the sidebar, Back and Continue, and the chrome. */
  function drawShell(screen: ScreenId): void {
    renderNavigation(root, build, screen);
    renderChrome(root, build, screen);
  }
  const router = startSteps(root, () => build.concept.name, drawShell);

  function render(): void {
    const current = report(build);
    for (const screen of screenModules) screen.render(build, root);
    renderControls(root, current);
    drawShell(router.current());
    router.updateTitle();
  }

  /** The stored build as this page last saw it; another tab's write shows up as a difference. */
  const storedNow = (): string => {
    try {
      const stored = store.load(loaded.id);
      return stored.status === 'found' ? JSON.stringify(stored.build) : '';
    } catch {
      return '';
    }
  };
  // `loaded` is the reader's own output for the stored text, so any write after it was read differs from it.
  let lastSeen = JSON.stringify(loaded);

  /**
   * Whether saving is safe: the build is still stored, as this page last left it. Finished or deleted elsewhere,
   * saving would bring it back; changed elsewhere, saving would undo that, so the page starts again from what is stored.
   */
  function stillStored(): boolean {
    const stored = store.load(build.id);
    if (stored.status === 'not-found') {
      showView('not-found');
      return false;
    }
    if (stored.status !== 'found' || JSON.stringify(stored.build) !== lastSeen) {
      window.location.reload();
      return false;
    }
    return true;
  }

  /** Whether the page holds changes the store does not: the last save was refused. */
  let unsaved = false;

  function saveBuild(): 'saved' | 'failed' {
    const { status } = store.save(build);
    unsaved = status === 'failed';
    if (status === 'saved') lastSeen = storedNow();
    return status;
  }

  /** The one path every change takes: update the model, redraw, save. */
  function commit(update: Update, control: HTMLElement): UpdateResult['status'] {
    const result = update(build);
    if (result.status === 'refused') {
      // Marked first, so the redraw that puts back what a select or rating
      // asked for leaves a typed entry as it was typed.
      showRefusal(root, control, result.reason, result.step);
      render();
      return 'refused';
    }
    if (!stillStored()) return 'refused';
    build = result.build;
    clearNotices(root);
    render();
    showNotices(control, result.notices);
    reportSave(saveBuild());
    return 'applied';
  }

  /** The build as it is, stored again; 'gone' when it was finished or deleted elsewhere (or changed there), which the page then shows. */
  function saveNow(ask: Exclude<SaveAsk, 'change'>): 'saved' | 'failed' | 'gone' {
    if (!stillStored()) return 'gone';
    const status = saveBuild();
    reportSave(status, ask);
    return status;
  }

  const wiring: Wiring = { commit, current: () => build, builds: store, characters, render, save: () => (unsaved ? saveNow('retry') : stillStored() ? 'saved' : 'gone') };
  wireControls(root, wiring);
  wireNavigation(root);
  wireChrome(root, {
    retrySave() {
      // The retry button goes away once a save lands; focus moves to the status that now says so.
      if (saveNow('retry') === 'saved') root.querySelector<HTMLElement>('[data-autosave-status]')!.focus();
    },
    saveAndExit() {
      if (saveNow('exit') === 'saved') window.location.assign('/');
    },
  });
  for (const screen of screenModules) screen.wire(root, wiring);
  wireDialog(
    root.querySelector<HTMLDialogElement>('[data-settings-dialog]')!,
    root.querySelector<HTMLElement>('[data-settings-open]')!,
    render,
  );

  // "Review and finish" on every screen opens Review & resolve at the outstanding list.
  root.addEventListener('click', (event) => {
    const link = (event.target as Element).closest('[data-review]');
    if (!link || !isPlainClick(event)) return;
    event.preventDefault();
    router.open('review', root.querySelector<HTMLElement>('[data-outstanding]')!);
  });
  render();

  // Another tab changed or removed this build: what this page holds is stale,
  // and saving it would undo that. Start again from what is stored now.
  window.addEventListener('storage', (event) => {
    if (event.key === null || event.key === buildKeyFor(build.id)) window.location.reload();
  });

  showView('builder');
}

// A builder restored from the back/forward cache still holds the build as it
// was. If it has since been finished or deleted, the next change would save it
// back, so start again from what is stored now.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) window.location.reload();
});

const state = pageState();
switch (state.kind) {
  case 'loaded':
    showBuilder(state.build, state.store, state.characters);
    break;
  case 'unavailable':
    showView('unavailable');
    showStatus(STORAGE_UNAVAILABLE);
    break;
  case 'not-found':
  case 'unreadable':
    showView(state.kind);
    break;
}
