// The sidebar's states and counter, and Back and Continue, drawn from the build for the screen shown.
// Leaving a screen is never gated here (the sidebar is always free); only Continue is, and a gated
// Continue is disabled-but-explained: aria-disabled, still focusable, its reason visible and described.

import type { V20Build } from '../../domain/v20/creation/build';
import type { ScreenId } from '../../domain/v20/creation/rules';
import { screenStatuses } from '../../domain/v20/creation/screens';
import { screenTitle } from '../../domain/v20/creation/wording';
import { announceKey, footerFor, screenCounter } from './nav';
import { showReadout } from './messages';

function renderSidebar(root: HTMLElement, build: V20Build, screen: ScreenId): void {
  const statuses = screenStatuses(build);
  for (const item of root.querySelectorAll<HTMLElement>('[data-screen]')) {
    const id = item.dataset.screen as ScreenId;
    const link = item.querySelector<HTMLElement>('[data-screen-link]');
    if (!link) continue;
    const state = statuses[id];
    item.dataset.state = state;
    showReadout(item.querySelector<HTMLElement>('[data-screen-state]')!, state);
    item.querySelector<HTMLElement>('[data-screen-current]')!.hidden = id !== screen;
    if (id === screen) link.setAttribute('aria-current', 'step');
    else link.removeAttribute('aria-current');
  }
  showReadout(root.querySelector<HTMLElement>('[data-screen-counter]')!, screenCounter(screen));
}

function renderFooter(root: HTMLElement, build: V20Build, screen: ScreenId): void {
  const { back, next } = footerFor(build, screen);
  const backButton = root.querySelector<HTMLButtonElement>('[data-back]')!;
  showReadout(backButton, back.label);
  if (back.to) backButton.dataset.stepGo = back.to;
  else delete backButton.dataset.stepGo;

  const button = root.querySelector<HTMLButtonElement>('[data-continue]')!;
  const reason = root.querySelector<HTMLElement>('[data-continue-reason]')!;
  const goTo = root.querySelector<HTMLButtonElement>('[data-continue-go]')!;
  button.hidden = next === undefined;
  const gate = next?.reason;
  delete button.dataset.stepGo;
  if (next) {
    showReadout(button, next.label);
    button.setAttribute('aria-disabled', String(gate !== undefined));
    // Only an open Continue is routed; a gated one is answered by `wireNavigation`.
    if (gate === undefined) button.dataset.stepGo = next.to;
  }
  // What a gated Continue said when it was tried is not left behind once the screen or its reason changes.
  const announce = root.querySelector<HTMLElement>('[data-continue-announce]')!;
  const key = announceKey(screen, gate?.text);
  if (announce.dataset.about !== key) {
    announce.textContent = '';
    announce.dataset.about = key;
  }
  showReadout(reason, gate?.text ?? '');
  reason.hidden = gate === undefined;
  goTo.hidden = gate?.goTo === undefined;
  if (gate?.goTo) {
    showReadout(goTo, `Go to ${screenTitle(gate.goTo)}`);
    goTo.dataset.stepGo = gate.goTo;
  } else {
    delete goTo.dataset.stepGo;
  }
  root.querySelector<HTMLElement>('[data-review]')!.hidden = screen === 'review';
}

export function renderNavigation(root: HTMLElement, build: V20Build, screen: ScreenId): void {
  renderSidebar(root, build, screen);
  renderFooter(root, build, screen);
}

/** Back from the first screen leaves for the roster; a gated Continue does nothing but say why. */
export function wireNavigation(root: HTMLElement): void {
  const back = root.querySelector<HTMLButtonElement>('[data-back]')!;
  const button = root.querySelector<HTMLButtonElement>('[data-continue]')!;
  const reason = root.querySelector<HTMLElement>('[data-continue-reason]')!;
  const announce = root.querySelector<HTMLElement>('[data-continue-announce]')!;

  back.addEventListener('click', () => {
    if (back.dataset.stepGo === undefined) window.location.assign('/');
  });

  button.addEventListener('click', () => {
    if (button.getAttribute('aria-disabled') !== 'true') return;
    // Cleared now and written on the next frame: the same text written over itself in one task is not announced.
    const text = reason.textContent ?? '';
    announce.textContent = '';
    requestAnimationFrame(() => {
      announce.textContent = text;
    });
  });
}
