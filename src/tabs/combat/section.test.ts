import { describe, expect, test } from 'vitest';
import { chooseFilter, chooseTab, OPENING_VIEW, shownSections } from './section';

describe('the combat section state', () => {
  test('opens unnarrowed, on the melee tables', () => {
    expect(OPENING_VIEW).toEqual({ filter: 'all', tab: 'melee' });
    expect(shownSections(OPENING_VIEW, false)).toEqual(['melee']);
  });

  test('"Ranged combat" shows the ranged section and selects the Ranged sub-tab', () => {
    const view = chooseFilter(OPENING_VIEW, 'ranged');

    expect(view).toEqual({ filter: 'ranged', tab: 'ranged' });
    expect(shownSections(view, false)).toEqual(['ranged']);
  });

  test('"Close combat" shows the melee section and selects the Melee sub-tab', () => {
    expect(chooseFilter({ filter: 'ranged', tab: 'ranged' }, 'melee')).toEqual({ filter: 'melee', tab: 'melee' });
  });

  test('"All manoeuvres" lifts the narrowing and keeps the sub-tab', () => {
    expect(chooseFilter({ filter: 'ranged', tab: 'ranged' }, 'all')).toEqual({ filter: 'all', tab: 'ranged' });
  });

  test('a sub-tab chosen while unnarrowed leaves the filter alone', () => {
    const view = chooseTab(OPENING_VIEW, 'ranged');

    expect(view).toEqual({ filter: 'all', tab: 'ranged' });
    expect(shownSections(view, false)).toEqual(['ranged']);
  });

  test('a sub-tab chosen while narrowed moves the narrowing with it', () => {
    expect(chooseTab({ filter: 'melee', tab: 'melee' }, 'ranged')).toEqual({ filter: 'ranged', tab: 'ranged' });
  });

  test('a search with no narrowing looks across both sections', () => {
    expect(shownSections(OPENING_VIEW, true)).toEqual(['melee', 'ranged']);
  });

  test('a search inside a narrowed filter stays in its section', () => {
    expect(shownSections({ filter: 'ranged', tab: 'ranged' }, true)).toEqual(['ranged']);
  });
});
