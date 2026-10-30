import { afterEach, describe, expect, it, vi } from 'vitest';

// The page's own timers and elements are the boundary here; messages.ts and pageState.ts run for real.

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function setup() {
  vi.useFakeTimers();
  const element = () => ({ hidden: false, textContent: '', dataset: {} as Record<string, string>, querySelectorAll: () => [] });
  const views = { '#builder': element(), '#build-unavailable': element(), '#build-not-found': element(), '#build-unreadable': element() };
  vi.stubGlobal('document', {
    querySelector: (selector: string) => views[selector as keyof typeof views] ?? element(),
    querySelectorAll: () => [],
  });
  vi.stubGlobal('window', {
    setInterval: (...args: Parameters<typeof setInterval>) => setInterval(...args),
    clearInterval: (id: number) => clearInterval(id),
  });
  const { reportSave } = await import('./messages');
  const { showView } = await import('./pageState');
  return { reportSave, showView };
}

describe('the autosave age clock', () => {
  it('runs after a save while the builder is shown', async () => {
    const { reportSave } = await setup();
    reportSave('saved');
    expect(vi.getTimerCount()).toBe(1);
  });

  it('stops when the page leaves the builder view, and starts again when it returns', async () => {
    const { reportSave, showView } = await setup();
    reportSave('saved');
    showView('not-found');
    expect(vi.getTimerCount()).toBe(0);
    showView('builder');
    expect(vi.getTimerCount()).toBe(1);
  });

  it('does not start before anything has been saved', async () => {
    const { showView } = await setup();
    showView('builder');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('is never run twice for one save', async () => {
    const { reportSave, showView } = await setup();
    reportSave('saved');
    reportSave('saved');
    showView('builder');
    expect(vi.getTimerCount()).toBe(1);
  });
});
