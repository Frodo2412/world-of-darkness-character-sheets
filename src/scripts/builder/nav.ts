// Where the player is in the nine screens and what Back and Continue offer there. Pure: the router and the
// shell draw what these return, and no rule is judged here (the gate is `gateReason`'s).

import type { V20Build } from '../../domain/v20/creation/build';
import { SCREENS, type ScreenId } from '../../domain/v20/creation/rules';
import { gateReason, type GateReason } from '../../domain/v20/creation/screens';

const FIRST: ScreenId = SCREENS[0].id;

export const screenTitle = (id: ScreenId): string => SCREENS.find((screen) => screen.id === id)!.title;

/** The Character sheet is reached by finishing, never by navigating. */
export const isNavigable = (id: ScreenId): boolean => id !== 'summary';

/** "3 of 9 screens". */
export const screenCounter = (id: ScreenId): string =>
  `${SCREENS.findIndex((screen) => screen.id === id) + 1} of ${SCREENS.length} screens`;

/** The screen an address names; one that is unknown or not yet available shows the first. */
export function screenFromHash(hash: string): ScreenId {
  const name = hash.replace(/^#/, '');
  return SCREENS.find((screen) => screen.id === name && isNavigable(screen.id))?.id ?? FIRST;
}

/** "Clan – Éloïse Voss". */
export const documentTitle = (id: ScreenId, characterName: string): string =>
  `${screenTitle(id)} – ${characterName.trim() || 'Unnamed character'}`;

/** What a gated Continue's polite announcement was about; another screen or another reason makes it stale. */
export const announceKey = (screen: ScreenId, gate: string | undefined): string => `${screen}\n${gate ?? ''}`;

/** A click the page routes itself; one the browser has a meaning for (a new tab, a download) is left to it. */
export const isPlainClick = (click: Pick<MouseEvent, 'button' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>): boolean =>
  click.button === 0 && !click.ctrlKey && !click.metaKey && !click.shiftKey && !click.altKey;

/**
 * What the router does when the address moves (the browser's Back or Forward, or an address typed in):
 * show the screen it names, put it back to the screen shown (a modal dialog holds the page still), or
 * nothing (another view has replaced the builder).
 */
export function popAction(view: { shown: boolean; modalOpen: boolean }): 'show' | 'restore' | 'ignore' {
  if (!view.shown) return 'ignore';
  return view.modalOpen ? 'restore' : 'show';
}

/** What Back does: step to the screen before, or leave for the roster from the first. */
export interface BackAction {
  label: string;
  /** The screen before; absent on the first, where Back goes to the roster. */
  to?: ScreenId;
}

/** What Continue offers. A gated Continue is `reason` text and stays focusable but inert. */
export interface ContinueAction {
  label: string;
  to: ScreenId;
  reason?: GateReason;
}

export interface Footer {
  back: BackAction;
  /** Absent where the screen ends in something else (Review & resolve finishes) or nothing follows. */
  next?: ContinueAction;
}

export function footerFor(build: V20Build, screen: ScreenId): Footer {
  const index = SCREENS.findIndex((entry) => entry.id === screen);
  const previous = SCREENS[index - 1];
  const following = SCREENS[index + 1];
  const back: BackAction = previous === undefined ? { label: 'All drafts' } : { label: 'Back', to: previous.id };
  // Review & resolve ends in Finish, and the screen after it is not navigable, so neither offers Continue.
  if (following === undefined || !isNavigable(following.id)) return { back };
  return { back, next: { label: `Continue to ${following.title}`, to: following.id, reason: gateReason(build, screen) } };
}
