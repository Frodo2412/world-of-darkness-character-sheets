import { describe, expect, it } from 'vitest';
import { createAnnouncer, realStamp } from './services';

/** A region that counts how many times it is written to. */
function countingRegion() {
  const writes: (string | null)[] = [];
  return {
    writes,
    set textContent(text: string | null) {
      writes.push(text);
    },
    get textContent() {
      return writes.at(-1) ?? '';
    },
  };
}

describe('createAnnouncer', () => {
  it('writes the text to the region once per call', () => {
    const region = countingRegion();
    const announce = createAnnouncer(region);

    announce('3 XP awarded. Available 8.');
    announce('Removed Contacts. Undo');

    expect(region.writes).toEqual(['3 XP awarded. Available 8.', 'Removed Contacts. Undo']);
  });

  it('writes the same text again when it is said again, so it is heard again', () => {
    const region = countingRegion();
    const announce = createAnnouncer(region);

    announce('Removed Contacts. Undo');
    announce('Removed Contacts. Undo');

    expect(region.writes).toHaveLength(2);
  });
});

describe('realStamp', () => {
  it('makes a new id each time', () => {
    const ids = new Set(Array.from({ length: 50 }, () => realStamp.newId()));
    expect(ids.size).toBe(50);
  });

  it('reads the clock in milliseconds', () => {
    const before = Date.now();
    const now = realStamp.now();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });
});
