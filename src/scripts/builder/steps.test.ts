import { afterEach, describe, expect, it, vi } from 'vitest';
import { startSteps } from './steps';

afterEach(() => vi.unstubAllGlobals());

/** A page with one panel, whose document title records every write. */
function setup() {
  const titles: string[] = [];
  let title = '';
  vi.stubGlobal('document', {
    get title() {
      return title;
    },
    set title(value: string) {
      title = value;
      titles.push(value);
    },
  });
  vi.stubGlobal('window', {
    location: { hash: '#clan' },
    history: { pushState: () => {}, replaceState: () => {} },
    addEventListener: () => {},
  });
  const panel = { hidden: true, dataset: { step: 'clan' }, querySelector: () => ({ focus: () => {} }) };
  const root = { hidden: false, querySelectorAll: () => [panel], addEventListener: () => {} };
  let name = 'Lucita';
  const router = startSteps(root as unknown as HTMLElement, () => name, () => {});
  return { router, titles, rename: (next: string) => void (name = next) };
}

describe('startSteps title', () => {
  it('names the screen and the character when the screen is first shown', () => {
    expect(setup().titles).toEqual(['Clan – Lucita']);
  });

  it('is not written again while it has not changed', () => {
    const { router, titles } = setup();
    router.updateTitle();
    router.updateTitle();
    expect(titles).toEqual(['Clan – Lucita']);
  });

  it('is written when the character is renamed', () => {
    const { router, titles, rename } = setup();
    rename('Lucita Voss');
    router.updateTitle();
    expect(titles).toEqual(['Clan – Lucita', 'Clan – Lucita Voss']);
  });
});
