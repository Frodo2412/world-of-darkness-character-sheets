import { describe, expect, test } from 'vitest';
import {
  ARCHETYPE_KEYS_HELP,
  ARCHETYPE_ROLES,
  OWN_ARCHETYPE_HELP,
  archetypeListView,
  assignedNotice,
  matchArchetypes,
  roleCards,
  roleInfo,
} from './archetypes';
import { ARCHETYPES } from './rules';
import { fresh, play } from './testing/play';
import { setConceptText } from './updates';

const words = (line: string): string[] => line.split(/\s+/).filter(Boolean);

const PRONOUN =
  /\b(?:i|me|my|mine|myself|we|us|our|ours|ourselves|you|your|yours|yourself|he|him|his|himself|she|her|hers|herself|it|its|itself|they|them|their|theirs|themselves|who|whom|whose|which|that|this|these|those)\b/i;

/** The concept of a build whose Nature and Demeanor have been set by the real update. */
const temperament = (nature: string, demeanor: string) =>
  play(
    fresh(),
    (build) => setConceptText(build, 'nature', nature),
    (build) => setConceptText(build, 'demeanor', demeanor),
  ).concept;

const entry = (view: ReturnType<typeof archetypeListView>, name: string) => view.entries.find((item) => item.name === name)!;

describe('the copy', () => {
  test.each([ARCHETYPE_KEYS_HELP, OWN_ARCHETYPE_HELP])('the line %j is short and has no pronoun', (line) => {
    expect(words(line).length).toBeLessThanOrEqual(12);
    expect(line).not.toMatch(PRONOUN);
  });

  test('the roles are Nature then Demeanor, each with its mark and switch label', () => {
    expect(ARCHETYPE_ROLES.map(({ role, title, mark, assignLabel }) => [role, title, mark, assignLabel])).toEqual([
      ['nature', 'Nature', 'N', 'Assign as Nature'],
      ['demeanor', 'Demeanor', 'D', 'Assign as Demeanor'],
    ]);
    expect(roleInfo('demeanor').title).toBe('Demeanor');
  });

  test('an assignment is announced with the name and the role', () => {
    expect(assignedNotice('Visionary', 'nature')).toBe('Visionary assigned as Nature.');
    expect(assignedNotice('Bon Vivant', 'demeanor')).toBe('Bon Vivant assigned as Demeanor.');
  });
});

describe('searching the archetypes', () => {
  test.each(['', '   '])('lists the whole catalogue, in order, for the blank query %j', (query) => {
    expect(matchArchetypes(query)).toEqual([...ARCHETYPES]);
  });

  test.each([
    ['thr', ['Thrill-Seeker']],
    ['THR', ['Thrill-Seeker']],
    ['  visio  ', ['Visionary']],
    ['bon', ['Bon Vivant']],
  ])('keeps the names holding %j', (query, expected) => {
    expect(matchArchetypes(query)).toEqual(expected);
  });

  test('keeps nothing for a query no name holds', () => {
    expect(matchArchetypes('zzz')).toEqual([]);
  });

  test('a partial query keeps every name that holds it, in catalogue order', () => {
    const kept = matchArchetypes('ist');
    expect(kept.length).toBeGreaterThan(1);
    expect(kept).toEqual(ARCHETYPES.filter((name) => name.toLowerCase().includes('ist')));
  });
});

describe('the list summary', () => {
  test('counts the whole catalogue for a blank search', () => {
    const view = archetypeListView('', fresh().concept, 'nature');
    expect(view.entries).toHaveLength(ARCHETYPES.length);
    expect(view.heading).toBe(`All Archetypes · ${ARCHETYPES.length}`);
    expect(view.results).toBe(`${ARCHETYPES.length} archetypes listed`);
  });

  test('counts one result in the singular', () => {
    const view = archetypeListView('thr', fresh().concept, 'nature');
    expect(view).toMatchObject({ heading: 'All Archetypes · 1', results: '1 archetype listed' });
  });

  test('says that nothing matches, with the query as entered but trimmed', () => {
    const view = archetypeListView('  zzz ', fresh().concept, 'nature');
    expect(view).toMatchObject({ entries: [], heading: 'All Archetypes · 0', results: 'No archetype matches "zzz".' });
  });
});

describe('the N and D marks', () => {
  test('mark nothing when neither role is chosen', () => {
    const view = archetypeListView('', temperament('', ''), 'nature');
    expect(view.entries.every((item) => item.marks.length === 0 && item.markText === '' && item.assigned === '')).toBe(true);
    expect(view.entries.some((item) => item.pressed)).toBe(false);
  });

  test('mark the Nature with N', () => {
    const view = archetypeListView('', temperament('Visionary', ''), 'nature');
    expect(entry(view, 'Visionary')).toMatchObject({ marks: ['nature'], markText: 'N', assigned: 'Assigned as Nature' });
    expect(entry(view, 'Bon Vivant').markText).toBe('');
  });

  test('mark the Demeanor with D', () => {
    const view = archetypeListView('', temperament('Visionary', 'Bon Vivant'), 'nature');
    expect(entry(view, 'Bon Vivant')).toMatchObject({ marks: ['demeanor'], markText: 'D', assigned: 'Assigned as Demeanor' });
  });

  test('mark a name that fills both roles with both, Nature first', () => {
    const view = archetypeListView('', temperament('Visionary', 'Visionary'), 'demeanor');
    expect(entry(view, 'Visionary')).toMatchObject({
      marks: ['nature', 'demeanor'],
      markText: 'N D',
      assigned: 'Assigned as Nature and Demeanor',
    });
  });

  test('mark a name written in other case or with space around it', () => {
    const view = archetypeListView('', temperament('  visionary ', ''), 'nature');
    expect(entry(view, 'Visionary').markText).toBe('N');
  });

  test('mark nothing for the player\'s own name, and for a blank role', () => {
    const view = archetypeListView('', temperament('Wanderer', '   '), 'nature');
    expect(view.entries.every((item) => item.markText === '')).toBe(true);
  });

  test('mark only the names a search keeps', () => {
    const view = archetypeListView('bon', temperament('Visionary', 'Bon Vivant'), 'nature');
    expect(view.entries.map((item) => [item.name, item.markText])).toEqual([['Bon Vivant', 'D']]);
  });
});

describe('the pressed state', () => {
  test('follows the active role: a name pressed for Nature is not pressed for Demeanor', () => {
    const concept = temperament('Visionary', 'Bon Vivant');
    expect(entry(archetypeListView('', concept, 'nature'), 'Visionary').pressed).toBe(true);
    expect(entry(archetypeListView('', concept, 'nature'), 'Bon Vivant').pressed).toBe(false);
    expect(entry(archetypeListView('', concept, 'demeanor'), 'Visionary').pressed).toBe(false);
    expect(entry(archetypeListView('', concept, 'demeanor'), 'Bon Vivant').pressed).toBe(true);
  });

  test('is pressed for both roles when the name fills both', () => {
    const concept = temperament('Visionary', 'Visionary');
    expect(entry(archetypeListView('', concept, 'nature'), 'Visionary').pressed).toBe(true);
    expect(entry(archetypeListView('', concept, 'demeanor'), 'Visionary').pressed).toBe(true);
  });
});

describe('assigning', () => {
  test('choosing a name sets it for the role, and choosing it again keeps it', () => {
    const once = play(fresh(), (build) => setConceptText(build, 'nature', 'Visionary'));
    const twice = play(once, (build) => setConceptText(build, 'nature', 'Visionary'));
    expect(twice.concept.nature).toBe('Visionary');
    expect(entry(archetypeListView('', twice.concept, 'nature'), 'Visionary').pressed).toBe(true);
  });

  test('the same name may fill both roles', () => {
    const concept = temperament('Visionary', 'Visionary');
    expect(roleCards(concept).map((card) => card.value)).toEqual(['Visionary', 'Visionary']);
  });

  test('a blank text clears the role, and the name is unmarked', () => {
    const cleared = play(
      fresh(),
      (build) => setConceptText(build, 'nature', 'Visionary'),
      (build) => setConceptText(build, 'nature', ''),
    );
    expect(roleCards(cleared.concept)[0].value).toBe('Not chosen');
    expect(entry(archetypeListView('', cleared.concept, 'nature'), 'Visionary').markText).toBe('');
  });

  test('the player\'s own name fills the role as entered', () => {
    const own = play(fresh(), (build) => setConceptText(build, 'demeanor', 'Wanderer'));
    expect(roleCards(own.concept)).toEqual([
      { role: 'nature', title: 'Nature', value: 'Not chosen' },
      { role: 'demeanor', title: 'Demeanor', value: 'Wanderer' },
    ]);
  });
});

describe('the summary cards', () => {
  test('both read "Not chosen" for a new build, and for blank or space-only text', () => {
    expect(roleCards(fresh().concept).map((card) => card.value)).toEqual(['Not chosen', 'Not chosen']);
    expect(roleCards(temperament('   ', '')).map((card) => card.value)).toEqual(['Not chosen', 'Not chosen']);
  });

  test('show each role\'s name trimmed', () => {
    expect(roleCards(temperament(' Visionary ', 'Bon Vivant')).map((card) => card.value)).toEqual(['Visionary', 'Bon Vivant']);
  });
});
