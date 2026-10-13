import type { Stamp } from '../stamp';

/** A stamp whose ids count up ("id-1", "id-2", …) and whose clock advances by one each time it is read. */
export function counterStamp(): Stamp {
  let ids = 0;
  let clock = 1000;
  return { newId: () => `id-${(ids += 1)}`, now: () => (clock += 1) };
}

/** A repeatable source of numbers in [0, 1) for property-style tests (mulberry32). */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
