import type { Stamp } from '../../domain/v20/journal/stamp';
import { generateId } from '../../storage/storagePort';

// What a tab uses to make ids and read the clock is the domain's own port, defined once there.
export type { Stamp };

/** The real thing: ids that do not repeat and the time in milliseconds. */
export const realStamp: Stamp = { newId: () => generateId(), now: () => Date.now() };

/** A function that says `text` to assistive technology through the polite live region `region`. */
export type Announce = (text: string) => void;

/**
 * Writes the text into the region each time it is called, once. The text is assigned even when it
 * equals what is there, which replaces the text and so is heard again.
 */
export function createAnnouncer(region: { textContent: string | null }): Announce {
  return (text) => {
    region.textContent = text;
  };
}
