import { describe, expect, it } from 'vitest';
import type { Clock, Region } from '../../roster/announce';
import { createSettledStatus } from './settledStatus';

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

const setup = () => {
  const clock = stillClock();
  const region: Region = { textContent: '' };
  return { clock, region, say: createSettledStatus(region, clock) };
};

describe('createSettledStatus', () => {
  it('writes the first text at once', () => {
    const { region, say } = setup();
    say('42 archetypes listed');
    expect(region.textContent).toBe('42 archetypes listed');
  });

  it('holds a changed text back until the player has paused for 400 ms, then says it', () => {
    const { clock, region, say } = setup();
    say('42 archetypes listed');
    say('3 archetypes listed');
    expect(region.textContent).toBe('42 archetypes listed');
    clock.pass(399);
    expect(region.textContent).toBe('42 archetypes listed');
    clock.pass(1);
    clock.frame();
    expect(region.textContent).toBe('3 archetypes listed');
  });

  it('says only the last of a run of changes', () => {
    const { clock, region, say } = setup();
    say('42 archetypes listed');
    const heard: string[] = [];
    say('9 archetypes listed');
    clock.pass(200);
    say('2 archetypes listed');
    clock.pass(200);
    clock.frame();
    heard.push(region.textContent!);
    clock.pass(200);
    clock.frame();
    heard.push(region.textContent!);
    expect(heard).toEqual(['42 archetypes listed', '2 archetypes listed']);
  });

  it('says nothing for a text it already shows', () => {
    const clock = stillClock();
    const writes: (string | null)[] = [];
    const region: Region = {
      get textContent() {
        return writes.at(-1) ?? '';
      },
      set textContent(text) {
        writes.push(text);
      },
    };
    const say = createSettledStatus(region, clock);
    say('42 archetypes listed');
    say('42 archetypes listed');
    clock.pass(1000);
    clock.frame();
    // A repeat would have emptied the region and written the text again.
    expect(writes).toEqual(['42 archetypes listed']);
  });
});
