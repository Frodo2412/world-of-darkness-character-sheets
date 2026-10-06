import { describe, expect, it } from 'vitest';
import { announcementOf, createAnnouncer, type Clock, type Region } from './announce';

/** A clock that moves only when told to: time in milliseconds, and the frames that come between. */
function stillClock(): Clock & { pass(milliseconds: number): void; frame(): void } {
  let now = 0;
  const timers: { at: number; action: () => void }[] = [];
  const frames: (() => void)[] = [];
  return {
    later: (action, milliseconds) => void timers.push({ at: now + milliseconds, action }),
    nextFrame: (action) => void frames.push(action),
    pass(milliseconds) {
      now += milliseconds;
      for (const timer of timers.filter((candidate) => candidate.at <= now)) {
        timers.splice(timers.indexOf(timer), 1);
        timer.action();
      }
    },
    frame() {
      for (const action of frames.splice(0)) action();
    },
  };
}

const regionSaying = (text: string): Region => ({ textContent: text });

describe('announcementOf', () => {
  it('says the counts line', () => {
    expect(announcementOf({ state: 'entries', countsLine: 'Showing 1 of 4 characters' })).toBe('Showing 1 of 4 characters');
  });

  it('leads with the news when nothing matches', () => {
    expect(announcementOf({ state: 'no-match', countsLine: 'Showing 0 of 4 characters' })).toBe(
      'No characters match. Showing 0 of 4 characters',
    );
  });
});

// The delay is the spec's 400 milliseconds, written out here so that changing it is a decision.
describe('createAnnouncer', () => {
  it('writes nothing until the delay has passed', () => {
    const clock = stillClock();
    const region = regionSaying('');
    createAnnouncer(region, clock)('Showing 1 of 4 characters');
    clock.pass(399);
    clock.frame();
    expect(region.textContent).toBe('');
  });

  it('empties the region at the delay and writes the text on the next frame', () => {
    const clock = stillClock();
    const region = regionSaying('Showing 4 of 4 characters');
    createAnnouncer(region, clock)('Showing 4 of 4 characters');
    clock.pass(400);
    expect(region.textContent).toBe('');
    clock.frame();
    expect(region.textContent).toBe('Showing 4 of 4 characters');
  });

  it('says only the last of changes made before the delay passes', () => {
    const clock = stillClock();
    const region = regionSaying('');
    const announce = createAnnouncer(region, clock);
    const written: string[] = [];
    Object.defineProperty(region, 'textContent', {
      get: () => written.at(-1) ?? '',
      set: (text: string) => void written.push(text),
    });
    announce('Showing 3 of 4 characters');
    clock.pass(300);
    announce('Showing 1 of 4 characters');
    clock.pass(300);
    // The first change's time has come, but a later change moved the wait.
    expect(written).toEqual([]);
    clock.pass(100);
    clock.frame();
    expect(written).toEqual(['', 'Showing 1 of 4 characters']);
  });

  it('drops a text still waiting for its frame when a newer change arrives', () => {
    const clock = stillClock();
    const region = regionSaying('');
    const announce = createAnnouncer(region, clock);
    announce('Showing 3 of 4 characters');
    clock.pass(400);
    announce('Showing 1 of 4 characters');
    clock.frame();
    expect(region.textContent).toBe('');
    clock.pass(400);
    clock.frame();
    expect(region.textContent).toBe('Showing 1 of 4 characters');
  });

  it('empties the region again before repeating a text', () => {
    const clock = stillClock();
    const region = regionSaying('');
    const announce = createAnnouncer(region, clock);
    announce('Showing 1 of 4 characters');
    clock.pass(400);
    clock.frame();
    announce('Showing 1 of 4 characters');
    clock.pass(400);
    expect(region.textContent).toBe('');
    clock.frame();
    expect(region.textContent).toBe('Showing 1 of 4 characters');
  });
});
