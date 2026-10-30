// How the autosave status words how long ago the build was last stored. Pure: the status redraws it as
// time passes, and the clock it is given is the page's.

/** How often the status is redrawn, so "Saved just now" ages without waiting for the next change. */
export const AGE_REFRESH_MS = 15_000;

const MINUTE_MS = 60_000;

/** "Saved just now" for the first minute, then "Saved 1 min ago", "Saved 2 min ago" and so on. */
export function savedLabel(elapsedMs: number): string {
  const minutes = Math.floor(elapsedMs / MINUTE_MS);
  return minutes < 1 ? 'Saved just now' : `Saved ${minutes} min ago`;
}
