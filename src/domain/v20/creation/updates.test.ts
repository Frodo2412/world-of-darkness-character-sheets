import { describe, expect, test } from 'vitest';
import { blankBuild } from './build';
import { CONCEPT_FIELDS } from './build';
import { rating } from './ratings';
import { CONCEPT_KINDS } from './rules';
import { creation, fresh, play, rank } from './testing/play';
import { setBaseGeneration, setClan, setConceptKind, setConceptText, setDrive, setExtraFreebies, setRank } from './updates';

describe('setBaseGeneration', () => {
  const build = blankBuild('abc');

  test.each([4, 5, 6, 7, 8, 9, 10, 11, 12, 13])('accepts %ith generation', (generation) => {
    const result = setBaseGeneration(build, generation);
    expect(result).toEqual({
      status: 'applied',
      build: { ...build, settings: { ...build.settings, baseGeneration: generation } },
      notices: [],
    });
  });

  test.each([3, 14, 0, -1, 10.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'refuses %s with a sentence naming the range and hands back the same build',
    (generation) => {
      const result = setBaseGeneration(build, generation);
      expect(result.status).toBe('refused');
      expect(result.build).toBe(build);
      expect(result).toMatchObject({ reason: 'Base generation must be a whole number from 4th to 13th.' });
    },
  );

  test('does not mutate its input', () => {
    const snapshot = structuredClone(build);
    setBaseGeneration(build, 9);
    setBaseGeneration(build, 99);
    expect(build).toEqual(snapshot);
  });
});

describe('setExtraFreebies', () => {
  const build = { ...blankBuild('abc'), settings: { baseGeneration: 11, extraFreebies: 20 } };
  const reason = 'Extra freebie points must be a whole number from 0 to 999.';

  test.each([
    ['0', 0],
    ['999', 999],
    ['75', 75],
    ['007', 7],
    [' 50 ', 50],
  ])('accepts "%s" as %i, leaving the generation alone', (text, extraFreebies) => {
    expect(setExtraFreebies(build, text)).toEqual({
      status: 'applied',
      build: { ...build, settings: { baseGeneration: 11, extraFreebies } },
      notices: [],
    });
  });

  test.each(['-1', '1000', '2.5', 'lots', '', '   ', '1e3', '+5', '12abc', '99999999999999999999'])(
    'refuses "%s" with the whole-number sentence and hands back the same build',
    (text) => {
      const result = setExtraFreebies(build, text);
      expect(result.status).toBe('refused');
      expect(result.build).toBe(build);
      expect(result).toMatchObject({ reason });
    },
  );

  test('does not mutate its input', () => {
    const snapshot = structuredClone(build);
    setExtraFreebies(build, '30');
    setExtraFreebies(build, 'lots');
    expect(build).toEqual(snapshot);
  });
});

describe('setConceptText', () => {
  const build = blankBuild('abc');

  test.each(CONCEPT_FIELDS)('keeps %s as entered, then clears it', (field) => {
    const entered = setConceptText(build, field, '  Fallen noble ');
    expect(entered).toEqual({
      status: 'applied',
      build: { ...build, concept: { ...build.concept, [field]: '  Fallen noble ' } },
      notices: [],
    });
    const cleared = setConceptText(entered.build, field, '');
    expect(cleared.build.concept[field]).toBe('');
  });

  test('does not mutate its input', () => {
    const snapshot = structuredClone(build);
    setConceptText(build, 'name', 'Lucita');
    expect(build).toEqual(snapshot);
  });
});

describe('setConceptKind and setDrive', () => {
  const build = blankBuild('abc');

  test('a new build has no sample concept and no drive', () => {
    expect(build.concept).toMatchObject({ conceptKind: '', drive: '' });
  });

  test('the sample concepts are the fourteen names', () => {
    expect(CONCEPT_KINDS).toEqual([
      'Criminal', 'Drifter', 'Entertainer', 'Intellectual', 'Investigator', 'Kid', 'Outsider',
      'Politician', 'Professional', 'Reporter', 'Scenester', 'Socialite', 'Soldier', 'Worker',
    ]);
  });

  test.each(CONCEPT_KINDS)('accepts %s, then clears it with a blank', (kind) => {
    const chosen = setConceptKind(build, kind);
    expect(chosen).toEqual({
      status: 'applied',
      build: { ...build, concept: { ...build.concept, conceptKind: kind } },
      notices: [],
    });
    expect(setConceptKind(chosen.build, '').build.concept.conceptKind).toBe('');
  });

  test.each(['Vampire', 'criminal', ' Criminal', 'Criminal '])('refuses %j and hands back the same build', (kind) => {
    const result = setConceptKind(build, kind);
    expect(result.status).toBe('refused');
    expect(result.build).toBe(build);
  });

  test('keeps the drive as entered, then clears it', () => {
    const entered = setDrive(build, '  Revenge on the one who sired me ');
    expect(entered).toEqual({
      status: 'applied',
      build: { ...build, concept: { ...build.concept, drive: '  Revenge on the one who sired me ' } },
      notices: [],
    });
    expect(setDrive(entered.build, '').build.concept.drive).toBe('');
  });

  test('neither mutates its input', () => {
    const snapshot = structuredClone(build);
    setConceptKind(build, 'Kid');
    setDrive(build, 'Hunger');
    expect(build).toEqual(snapshot);
  });
});

describe('setClan', () => {
  const build = blankBuild('abc');

  test('chooses a clan, and switches to another', () => {
    const toreador = setClan(build, 'Toreador');
    expect(toreador).toEqual({ status: 'applied', build: { ...build, clan: 'Toreador' }, notices: [] });
    expect(setClan(toreador.build, 'Caitiff').build.clan).toBe('Caitiff');
  });

  test.each(['Baali', 'toreador', ' Toreador'])('refuses %j, which is not a listed clan', (clan) => {
    const result = setClan(build, clan);
    expect(result.status).toBe('refused');
    expect(result.build).toBe(build);
  });

  test('refuses clearing a chosen clan', () => {
    const chosen = setClan(build, 'Brujah').build;
    const result = setClan(chosen, '');
    expect(result).toEqual({
      status: 'refused',
      build: chosen,
      reason: 'A chosen clan cannot be cleared. Choose another clan instead.',
    });
  });

  test('does not mutate its input', () => {
    const snapshot = structuredClone(build);
    setClan(build, 'Ventrue');
    expect(build).toEqual(snapshot);
  });
});

describe('setRank swaps within one allotment', () => {
  const abilities = () => play(fresh(), rank('talents', 'primary'), rank('skills', 'secondary'), rank('knowledges', 'tertiary'));

  test('an Abilities group taking a held rank swaps with its holder and names both', () => {
    const result = setRank(abilities(), 'knowledges', 'primary');
    expect(result).toMatchObject({ status: 'applied', notices: ['Knowledges is now primary and Talents is now tertiary.'] });
    expect(result.build.ranks).toMatchObject({ knowledges: 'primary', talents: 'tertiary', skills: 'secondary' });
  });

  test('the ranks of the three Abilities groups stay a permutation after every swap', () => {
    let build = abilities();
    for (const [group, value] of [['knowledges', 'primary'], ['skills', 'primary'], ['talents', 'secondary'], ['skills', 'tertiary']] as const) {
      build = play(build, rank(group, value));
      expect(['talents', 'skills', 'knowledges'].map((key) => build.ranks[key]).sort()).toEqual(['primary', 'secondary', 'tertiary']);
    }
  });

  test('a rank an Attribute group holds does not move an Abilities group', () => {
    const build = play(abilities(), rank('physical', 'primary'));
    const result = setRank(build, 'social', 'primary');
    expect(result.build.ranks).toMatchObject({ social: 'primary', physical: '', talents: 'primary' });
  });

  test('choosing the rank a group already has changes nothing and says nothing', () => {
    const build = abilities();
    expect(setRank(build, 'skills', 'secondary')).toEqual({ status: 'applied', build, notices: [] });
  });

  test('a swap keeps the dots placed in both groups', () => {
    const build = play(abilities(), creation('ability:crafts', 3), creation('ability:law', 2));
    const result = setRank(build, 'knowledges', 'primary');
    expect(rating(result.build, 'ability:crafts')).toBe(3);
    expect(rating(result.build, 'ability:law')).toBe(2);
  });
});
