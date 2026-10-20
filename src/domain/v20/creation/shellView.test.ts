import { describe, expect, test } from 'vitest';
import { blankBuild, type V20Build } from './build';
import type { ScreenId } from './rules';
import { characterRows, identityOf, initialsOf, PANEL_ROWS } from './shellView';
import { clan, completeBuild, fresh, freebie, play } from './testing/play';
import { setConceptText } from './updates';

const concept = (build: V20Build, values: Partial<V20Build['concept']>): V20Build => ({
  ...build,
  concept: { ...build.concept, ...values },
});

const blank = (): V20Build => blankBuild('abc');

/** The panel as seen from `screen`, by row label. */
const panel = (build: V20Build, screen: ScreenId = 'concept'): Record<string, string> =>
  Object.fromEntries(characterRows(build, screen).map((row) => [row.label, row.value]));

/** `build` with the given creation dots written straight into it, whatever the rules would allow. */
function withCreationDots(build: V20Build, dots: Record<string, number>): V20Build {
  const copy = structuredClone(build);
  for (const [ref, count] of Object.entries(dots)) {
    copy.traits[ref as keyof V20Build['traits']].creation = count;
  }
  return copy;
}

describe('initialsOf', () => {
  test.each([
    ['Éloïse Voss', 'ÉV'],
    ['Cher', 'C'],
    ['anne marie smith', 'AS'],
    ['  Lucita   de   Aragón ', 'LA'],
    ['', '?'],
    ['   ', '?'],
    ['李小龍', '李'],
    ['李 小龍', '李小'],
    ['Ñandú Pérez', 'ÑP'],
    ['Åsa', 'Å'],
    ['— Voss', 'V'],
    ['—', '?'],
  ])('%j is %j', (name, initials) => {
    expect(initialsOf(name)).toBe(initials);
  });

  test('keeps a letter with its combining mark', () => {
    expect(initialsOf('élise')).toBe('É');
  });
});

describe('identityOf', () => {
  test('an unnamed build reads "Unnamed character" with the initials "?", "Character builder" on top and nothing chosen', () => {
    expect(identityOf(blank())).toEqual({
      name: 'Unnamed character',
      initials: '?',
      subtitle: '',
      chronicle: '',
      topBar: 'Character builder',
      natureDemeanor: 'Not chosen',
    });
  });

  test('follows the name, clan, concept and chronicle', () => {
    const build = concept(
      { ...blank(), clan: 'Toreador' },
      { name: 'Éloïse Voss', concept: 'Antiquarian', chronicle: 'The Glass City' },
    );
    expect(identityOf(build)).toMatchObject({
      name: 'Éloïse Voss',
      initials: 'ÉV',
      subtitle: 'Toreador · Antiquarian · The Glass City',
      chronicle: 'The Glass City',
      topBar: 'The Glass City / Character builder',
    });
  });

  test.each([
    ['Toreador', '', '', 'Toreador'],
    ['', 'Antiquarian', '', 'Antiquarian'],
    ['', '', 'The Glass City', 'The Glass City'],
    ['Toreador', 'Antiquarian', 'The Glass City', 'Toreador · Antiquarian · The Glass City'],
    ['', '', '', ''],
  ])('the subtitle for clan %j, concept %j and chronicle %j is %j', (clanName, conceptText, chronicle, subtitle) => {
    const build = concept({ ...blank(), clan: clanName }, { concept: conceptText, chronicle });
    expect(identityOf(build).subtitle).toBe(subtitle);
  });

  test.each([
    ['Intellectual', '', 'Toreador · Intellectual · The Glass City'],
    ['', 'Antiquarian', 'Toreador · Antiquarian · The Glass City'],
    ['Intellectual', 'Antiquarian', 'Toreador · Intellectual · Antiquarian · The Glass City'],
    ['Intellectual', '  ', 'Toreador · Intellectual · The Glass City'],
  ] as const)('the subtitle for sample concept %j and concept text %j is %j', (conceptKind, conceptText, subtitle) => {
    const build = concept(
      { ...blank(), clan: 'Toreador' },
      { conceptKind, concept: conceptText, chronicle: 'The Glass City' },
    );
    expect(identityOf(build).subtitle).toBe(subtitle);
  });

  test('a sample concept alone is the whole subtitle', () => {
    expect(identityOf(concept(blank(), { conceptKind: 'Intellectual' })).subtitle).toBe('Intellectual');
  });

  test('values that are only whitespace count as not set', () => {
    const build = concept(
      { ...blank(), clan: ' ' },
      { name: '  ', concept: '\t', chronicle: ' \n ', nature: ' ', demeanor: '  ' },
    );
    expect(identityOf(build)).toEqual({
      name: 'Unnamed character',
      initials: '?',
      subtitle: '',
      chronicle: '',
      topBar: 'Character builder',
      natureDemeanor: 'Not chosen',
    });
  });

  test('the name and chronicle are shown trimmed', () => {
    const build = concept(blank(), { name: '  Éloïse Voss ', chronicle: ' The Glass City ' });
    expect(identityOf(build)).toMatchObject({ name: 'Éloïse Voss', topBar: 'The Glass City / Character builder' });
  });

  test.each([
    ['', '', 'Not chosen'],
    ['Visionary', '', 'Visionary / Not chosen'],
    ['', 'Bon Vivant', 'Not chosen / Bon Vivant'],
    ['Visionary', 'Bon Vivant', 'Visionary / Bon Vivant'],
  ])('the Nature / Demeanor readout for %j and %j is %j', (nature, demeanor, readout) => {
    expect(identityOf(concept(blank(), { nature, demeanor })).natureDemeanor).toBe(readout);
  });
});

describe('characterRows', () => {
  test('a new build has nothing chosen or allocated and 15 freebie points remaining', () => {
    expect(panel(blank())).toEqual({
      Concept: 'Not chosen',
      Clan: 'Not chosen',
      'Nature / Demeanor': 'Not chosen',
      Attributes: 'Not allocated',
      Abilities: 'Not allocated',
      Advantages: 'Not allocated',
      'Freebie points': '15 remaining',
    });
  });

  test('the rows are the panel rows, in order, with Humanity and Willpower from Finishing touches on', () => {
    expect(characterRows(blank(), 'concept').map((row) => row.key)).toEqual(
      PANEL_ROWS.map((row) => row.key).filter((key) => key !== 'humanity' && key !== 'willpower'),
    );
    expect(characterRows(blank(), 'finishing').map((row) => row.key)).toEqual(PANEL_ROWS.map((row) => row.key));
  });

  test.each([
    [{ conceptKind: 'Intellectual', concept: 'Antiquarian' } as const, 'Intellectual · Antiquarian'],
    [{ conceptKind: 'Intellectual', concept: '' } as const, 'Intellectual'],
    [{ conceptKind: '', concept: 'Antiquarian' } as const, 'Antiquarian'],
    [{ conceptKind: '', concept: '  ' } as const, 'Not chosen'],
  ])('the Concept row for %j is %j', (values, text) => {
    expect(panel(concept(blank(), values)).Concept).toBe(text);
  });

  test('the Clan row names the clan', () => {
    expect(panel(play(fresh(), clan('Toreador'))).Clan).toBe('Toreador');
  });

  test('the Nature / Demeanor row reads as the identity bar does', () => {
    expect(panel(concept(blank(), { nature: 'Visionary' }))['Nature / Demeanor']).toBe('Visionary / Not chosen');
  });

  test('Attributes lists the dots placed in each group, the primary group first', () => {
    const build = withCreationDots(
      { ...blank(), ranks: { ...blank().ranks, social: 'primary', mental: 'secondary', physical: 'tertiary' } },
      {
        'attribute:charisma': 3,
        'attribute:manipulation': 2,
        'attribute:appearance': 2,
        'attribute:perception': 2,
        'attribute:intelligence': 2,
        'attribute:wits': 1,
        'attribute:strength': 1,
        'attribute:dexterity': 1,
        'attribute:stamina': 1,
      },
    );
    expect(panel(build).Attributes).toBe('Social 7 · Mental 5 · Physical 3');
  });

  test('Attributes shows dots placed before the groups are ranked, in the order the groups are listed', () => {
    const build = withCreationDots(blank(), { 'attribute:strength': 2 });
    expect(panel(build).Attributes).toBe('Physical 2 · Social 0 · Mental 0');
  });

  test('Abilities lists the dots placed in each group, the primary group first', () => {
    const build = withCreationDots(
      { ...blank(), ranks: { ...blank().ranks, knowledges: 'primary', skills: 'secondary', talents: 'tertiary' } },
      {
        'ability:academics': 3,
        'ability:computer': 3,
        'ability:investigation': 3,
        'ability:law': 2,
        'ability:occult': 2,
        'ability:animalKen': 3,
        'ability:drive': 3,
        'ability:firearms': 3,
        'ability:alertness': 3,
        'ability:streetwise': 2,
      },
    );
    expect(panel(build).Abilities).toBe('Knowledges 13 · Skills 9 · Talents 5');
  });

  test('Advantages lists Disciplines, Backgrounds and Virtues dots placed', () => {
    const build = withCreationDots(blank(), { 'background:Resources': 3, 'virtue:courage': 2 });
    expect(panel(build).Advantages).toBe('Disciplines 0 · Backgrounds 3 · Virtues 2');
  });

  test('Freebie points counts down as freebie points are spent', () => {
    const spent = play(completeBuild(), freebie('attribute:wits', 3));
    expect(panel(spent)['Freebie points']).toBe('10 remaining');
  });

  test('Freebie points says how far over a stored build is', () => {
    const over = concept(blank(), {});
    over.settings = { ...over.settings, extraFreebies: 0 };
    over.traits['attribute:wits'] = { creation: 0, freebie: 4 };
    expect(panel(over)['Freebie points']).toBe('Overspent by 5');
  });

  test('Humanity and Willpower join the panel from Finishing touches on, with their dots', () => {
    const build = completeBuild();
    for (const screen of ['concept', 'clan', 'natureDemeanor', 'attributes', 'abilities', 'advantages'] as const) {
      expect(Object.keys(panel(build, screen))).not.toContain('Humanity');
      expect(Object.keys(panel(build, screen))).not.toContain('Willpower');
    }
    for (const screen of ['finishing', 'review'] as const) {
      const rows = characterRows(build, screen);
      expect(rows.find((row) => row.key === 'humanity')).toEqual({
        key: 'humanity',
        label: 'Humanity',
        value: '7',
        dots: { filled: 7, max: 10 },
      });
      // Courage 3 gives Willpower 3.
      expect(rows.find((row) => row.key === 'willpower')).toMatchObject({ label: 'Willpower', dots: { filled: 3, max: 10 } });
    }
  });

  test('a name typed on the concept screen does not change any panel row', () => {
    const named = play(fresh(), (build) => setConceptText(build, 'name', 'Éloïse Voss'));
    expect(panel(named)).toEqual(panel(blank()));
  });
});
