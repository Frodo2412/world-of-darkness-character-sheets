import { describe, expect, it } from 'vitest';
import { blankBuild } from '../../domain/v20/creation/build';
import { SCREENS } from '../../domain/v20/creation/rules';
import { attributesRanked, clan, completeBuild, creation, fresh, play } from '../../domain/v20/creation/testing/play';
import {
  announceKey,
  documentTitle,
  footerFor,
  isNavigable,
  isPlainClick,
  popAction,
  screenCounter,
  screenFromHash,
  screenTitle,
} from './nav';

describe('screenCounter', () => {
  it.each([
    ['concept', '1 of 9 screens'],
    ['natureDemeanor', '3 of 9 screens'],
    ['review', '8 of 9 screens'],
    ['summary', '9 of 9 screens'],
  ] as const)('reads %s as %s', (screen, text) => {
    expect(screenCounter(screen)).toBe(text);
  });
});

describe('screenFromHash', () => {
  it.each(SCREENS.filter(({ id }) => id !== 'summary').map(({ id }) => id))('names %s with or without the #', (id) => {
    expect(screenFromHash(`#${id}`)).toBe(id);
    expect(screenFromHash(id)).toBe(id);
  });

  it.each(['', '#', '#nonsense', '#summary', '#Clan', '#clan/', '#__proto__'])('shows the first screen for %j', (hash) => {
    expect(screenFromHash(hash)).toBe('concept');
  });
});

describe('isNavigable', () => {
  it('is every screen but the Character sheet, which finishing reaches', () => {
    expect(SCREENS.filter(({ id }) => !isNavigable(id)).map(({ id }) => id)).toEqual(['summary']);
  });
});

describe('documentTitle', () => {
  it('names the screen and the character', () => {
    expect(documentTitle('clan', 'Éloïse Voss')).toBe('Clan – Éloïse Voss');
  });

  it.each(['', '   '])('calls a build with the name %j "Unnamed character"', (name) => {
    expect(documentTitle('natureDemeanor', name)).toBe('Nature & Demeanor – Unnamed character');
  });

  it('ignores spaces round the name', () => {
    expect(documentTitle('concept', '  Lucita ')).toBe('Character concept – Lucita');
  });
});

describe('footerFor', () => {
  const build = blankBuild('abc');

  it('sends Back from the first screen to the roster, as "All drafts"', () => {
    expect(footerFor(build, 'concept').back).toEqual({ label: 'All drafts' });
  });

  it.each(SCREENS.slice(1).map((screen, index) => [screen.id, SCREENS[index].id] as const))(
    'sends Back from %s to %s',
    (screen, previous) => {
      expect(footerFor(build, screen).back).toEqual({ label: 'Back', to: previous });
    },
  );

  it('names the next screen on Continue', () => {
    expect(footerFor(build, 'concept').next).toMatchObject({ label: 'Continue to Clan', to: 'clan' });
    expect(footerFor(build, 'finishing').next).toMatchObject({ label: 'Continue to Review & resolve', to: 'review' });
  });

  it('has no Continue on Review & resolve (it finishes) or the Character sheet', () => {
    expect(footerFor(build, 'review').next).toBeUndefined();
    expect(footerFor(build, 'summary').next).toBeUndefined();
  });

  it('carries the gate the domain states, and its go-to', () => {
    expect(footerFor(build, 'clan').next?.reason).toEqual({ text: 'Choose a clan to continue' });
    expect(footerFor(build, 'advantages').next?.reason).toEqual({
      text: 'Choose a clan to place Discipline dots',
      goTo: 'clan',
    });
  });

  it('lifts the gate once the pool is placed', () => {
    const ranked = play(fresh(), clan('Brujah'), ...attributesRanked);
    expect(footerFor(ranked, 'attributes').next?.reason).toBeDefined();
    expect(footerFor(completeBuild('Brujah'), 'attributes').next?.reason).toBeUndefined();
  });

  it('gates only the screens the domain gates', () => {
    const unplaced = play(completeBuild('Brujah'), creation('attribute:strength', 2));
    const gated = SCREENS.filter(({ id }) => footerFor(unplaced, id).next?.reason !== undefined).map(({ id }) => id);
    expect(gated).toEqual(['attributes']);
  });
});

describe('screenTitle', () => {
  it('is the sidebar word for each screen', () => {
    expect(SCREENS.map(({ id }) => screenTitle(id))).toEqual([
      'Character concept',
      'Clan',
      'Nature & Demeanor',
      'Attributes',
      'Abilities',
      'Advantages',
      'Finishing touches',
      'Review & resolve',
      'Character sheet',
    ]);
  });
});

describe('announceKey', () => {
  it('is the same while the screen and the reason are the same', () => {
    expect(announceKey('clan', 'Choose a clan to continue')).toBe(announceKey('clan', 'Choose a clan to continue'));
  });

  it('changes with the screen, so another screen never keeps the last one\'s reason', () => {
    expect(announceKey('clan', 'Choose a clan to continue')).not.toBe(announceKey('advantages', 'Choose a clan to continue'));
  });

  it('changes with the reason, and when the gate lifts', () => {
    const said = announceKey('attributes', '2 Physical dots remain · Allocate them to continue');
    expect(announceKey('attributes', '1 Physical dot remains · Allocate it to continue')).not.toBe(said);
    expect(announceKey('attributes', undefined)).not.toBe(said);
  });
});

describe('isPlainClick', () => {
  const plain = { button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false };

  it('is a primary-button click with no modifier', () => {
    expect(isPlainClick(plain)).toBe(true);
  });

  it.each([
    ['another button', { button: 1 }],
    ['Ctrl held', { ctrlKey: true }],
    ['Meta held', { metaKey: true }],
    ['Shift held', { shiftKey: true }],
    ['Alt held', { altKey: true }],
  ])('is left to the browser with %s', (_, change) => {
    expect(isPlainClick({ ...plain, ...change })).toBe(false);
  });
});

describe('popAction', () => {
  it('shows the screen the address names when the builder is shown and nothing is modal', () => {
    expect(popAction({ shown: true, modalOpen: false })).toBe('show');
  });

  it('puts the address back to the screen shown while a modal dialog is open', () => {
    expect(popAction({ shown: true, modalOpen: true })).toBe('restore');
  });

  it.each([true, false])('does nothing once another view has replaced the builder (modal open: %s)', (modalOpen) => {
    expect(popAction({ shown: false, modalOpen })).toBe('ignore');
  });
});
