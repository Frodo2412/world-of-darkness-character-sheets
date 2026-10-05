import type { V20Build } from '../domain/v20/creation/build';
import { report } from '../domain/v20/creation/progress';
import { buildKeyFor, type BuildStore } from '../storage/buildStore';
import { clearNotices, reportSave, showRefusal } from './builder/messages';
import { pageState, showView } from './builder/pageState';
import { startSteps } from './builder/steps';
import { renderControls, wireControls, type Update } from './builder/wiring';
import { STORAGE_UNAVAILABLE, showStatus } from './status';

const root = document.querySelector<HTMLElement>('#builder')!;

function showBuilder(loaded: V20Build, store: BuildStore): void {
  let build = loaded;
  const router = startSteps(root, () => build.concept.name.trim() || 'Unnamed build');

  function render(): void {
    const current = report(build);
    renderControls(root, current);
    router.renderStatuses(current);
    router.updateTitle();
  }

  /** The one path every change takes: update the model, redraw, save. */
  function commit(update: Update, control: HTMLElement): void {
    const result = update(build);
    if (result.status === 'refused') {
      showRefusal(control, result.reason);
      return;
    }
    // Finished or deleted elsewhere since this page loaded: saving would bring it back.
    if (store.load(build.id).status === 'not-found') {
      showView('not-found');
      return;
    }
    build = result.build;
    clearNotices(root);
    render();
    reportSave(store.save(build).status);
  }

  wireControls(root, commit);
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
    showBuilder(state.build, state.store);
    break;
  case 'unavailable':
    showView('none');
    showStatus(STORAGE_UNAVAILABLE);
    break;
  case 'not-found':
  case 'unreadable':
    showView(state.kind);
    break;
}
