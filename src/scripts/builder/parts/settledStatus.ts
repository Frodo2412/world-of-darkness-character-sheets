// A search's result count, said to assistive technology once the player stops typing rather than at every
// keystroke. The first text is written at once (nothing has been typed yet); a change waits for the pause.

import { createAnnouncer, pageClock, type Clock, type Region } from '../../roster/announce';

export function createSettledStatus(region: Region, clock: Clock = pageClock): (text: string) => void {
  const announce = createAnnouncer(region, clock);
  let shown: string | null = null;
  return (text) => {
    if (text === shown) return;
    const first = shown === null;
    shown = text;
    if (first) region.textContent = text;
    else announce(text);
  };
}
