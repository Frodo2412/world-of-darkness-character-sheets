// The library's live region: what a change to the filter leaves on the page, said once the player pauses.
// The region is in the page from the start; this writes to it, and only for changes the player made.
// Nothing here touches the page when imported: the caller hands over the region.

import { ORDERS, type LibraryOrder, type LibraryView } from '../../domain/v20/library';

/** How long the player has to stop changing the filter before the result is said. */
export const ANNOUNCE_DELAY_MS = 400;

/** The part of an element the announcer writes to. */
export interface Region {
  textContent: string | null;
}

/** Time, as the announcer needs it, so a test can hold it still. */
export interface Clock {
  /** Runs `action` once, `milliseconds` from now. */
  later(action: () => void, milliseconds: number): void;
  /** Runs `action` before the next frame is drawn. */
  nextFrame(action: () => void): void;
}

/** The clock of the page the script runs in; the globals are read when it is used, not when this is imported. */
export const pageClock: Clock = {
  later: (action, milliseconds) => void setTimeout(action, milliseconds),
  nextFrame: (action) => void requestAnimationFrame(action),
};

/** What is said for a view: the counts line, led by the news when a filter has left nothing. */
export function announcementOf({ state, countsLine }: Pick<LibraryView, 'state' | 'countsLine'>): string {
  return state === 'no-match' ? `No characters match. ${countsLine}` : countsLine;
}

/** What is said when the player changes the order. */
export const sortAnnouncementOf = (order: LibraryOrder): string => `Sorted by ${ORDERS[order].label}.`;

/**
 * Says `text` in `region` once the player has stopped for `ANNOUNCE_DELAY_MS`: a newer text replaces one
 * still waiting, so a run of keystrokes is one announcement. The region is emptied first and written on
 * the next frame, because the same text written over itself is not spoken again.
 */
export function createAnnouncer(region: Region, clock: Clock = pageClock): (text: string) => void {
  // Each call outdates the ones before it, whether they are waiting for the delay or for the frame.
  let latest = 0;
  return (text) => {
    latest += 1;
    const mine = latest;
    clock.later(() => {
      if (mine !== latest) return;
      region.textContent = '';
      clock.nextFrame(() => {
        if (mine === latest) region.textContent = text;
      });
    }, ANNOUNCE_DELAY_MS);
  };
}
