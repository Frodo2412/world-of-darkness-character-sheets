// The screen router: one screen shown at a time, kept in the address hash. Each change of screen is a
// history entry (pushState), so the browser's Back steps back through the screens the player visited.

import type { ScreenId } from '../../domain/v20/creation/rules';
import { documentTitle, isNavigable, isPlainClick, popAction, screenFromHash } from './nav';

export interface ScreenRouter {
  /** The screen shown now. */
  current(): ScreenId;
  /** Rewrites the document title, for when the build's name changes. */
  updateTitle(): void;
  /** Opens a screen and moves focus to its heading, or to `focusTarget` within it. */
  open(screen: ScreenId, focusTarget?: HTMLElement): void;
}

/**
 * Shows the screen the address names (the first, if it names none the player can open) and routes every
 * `[data-step-go]` and `[data-screen-link]` in `root`, including ones written later. `onShow` runs after
 * each change of screen, once for the first.
 */
export function startSteps(
  root: HTMLElement,
  buildName: () => string,
  onShow: (screen: ScreenId) => void,
): ScreenRouter {
  const panels = [...root.querySelectorAll<HTMLElement>('[data-step]')];
  const panelFor = (screen: ScreenId): HTMLElement => panels.find((panel) => panel.dataset.step === screen)!;
  const heading = (screen: ScreenId): HTMLElement => panelFor(screen).querySelector<HTMLElement>('h2')!;

  let current = screenFromHash(window.location.hash);

  function updateTitle(): void {
    document.title = documentTitle(current, buildName());
  }

  function show(screen: ScreenId, how: { history: 'push' | 'replace' | 'none'; focus?: HTMLElement | 'heading' }): void {
    current = screen;
    for (const panel of panels) panel.hidden = panel.dataset.step !== screen;
    const hash = `#${screen}`;
    if (how.history === 'push' && window.location.hash !== hash) window.history.pushState(null, '', hash);
    else if (how.history === 'replace') window.history.replaceState(null, '', hash);
    updateTitle();
    onShow(screen);
    if (how.focus === 'heading') heading(screen).focus();
    else if (how.focus) how.focus.focus();
  }

  // Delegated, so links inside messages written later open screens too.
  root.addEventListener('click', (event) => {
    const target = (event.target as Element).closest<HTMLElement>('[data-screen-link], [data-step-go]');
    if (!target) return;
    // A link opened in a new tab or window is the browser's to open; a button has no such meaning.
    if (target.tagName === 'A' && !isPlainClick(event)) return;
    event.preventDefault();
    const screen = (target.dataset.screenLink ?? target.dataset.stepGo) as ScreenId;
    if (isNavigable(screen)) show(screen, { history: 'push', focus: 'heading' });
  });

  // The browser's Back and Forward, and an address typed in.
  window.addEventListener('popstate', () => {
    const action = popAction({ shown: !root.hidden, modalOpen: root.querySelector('dialog:modal') !== null });
    // A modal dialog holds the page still: the screen behind it stays, and the address is put back to it.
    if (action === 'restore') window.history.pushState(null, '', `#${current}`);
    else if (action === 'show') show(screenFromHash(window.location.hash), { history: 'replace', focus: 'heading' });
  });

  show(current, { history: 'replace' });
  return {
    current: () => current,
    updateTitle,
    open(screen, focusTarget) {
      show(screen, { history: 'push', focus: focusTarget ?? 'heading' });
    },
  };
}
