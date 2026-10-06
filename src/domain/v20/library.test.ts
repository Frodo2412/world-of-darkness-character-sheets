import { describe, expect, test } from 'vitest';
import { blankCharacter, setHeaderField } from './character';
import { blankBuild, type ConceptField, type V20Build } from './creation/build';
import { countsLine, entriesOf, INITIAL_FILTER, view } from './library';
import type { HeaderField } from './traits';

const character = (id: string, fields: Partial<Record<HeaderField, string>> = {}) => ({
  kind: 'character' as const,
  character: (Object.entries(fields) as [HeaderField, string][]).reduce(
    (current, [key, value]) => setHeaderField(current, key, value),
    blankCharacter(id),
  ),
});

const build = (id: string, fields: Partial<Record<ConceptField | 'clan', string>> = {}) => {
  const { clan, ...concept } = fields;
  const started: V20Build = blankBuild(id);
  return {
    kind: 'build' as const,
    build: { ...started, clan: clan ?? '', concept: { ...started.concept, ...concept } },
  };
};

describe('entriesOf', () => {
  test('a character carries what the library shows of it', () => {
    const [entry] = entriesOf({
      characters: [
        character('c1', {
          name: 'Éloïse Voss',
          clan: 'Toreador',
          generation: '10',
          concept: 'Antiquarian',
          nature: 'Visionary',
          demeanor: 'Bon Vivant',
          chronicle: 'The Glass City',
        }),
      ],
      builds: [],
    });
    expect(entry).toEqual({
      kind: 'character',
      id: 'c1',
      name: 'Éloïse Voss',
      monogram: 'EV',
      summary: 'Toreador · 10th generation · Antiquarian',
      temperament: 'Visionary / Bon Vivant',
      chronicle: 'The Glass City',
      clan: 'Toreador',
      concept: 'Antiquarian',
      chronicleKey: 'the glass city',
      clanKey: 'toreador',
    });
  });

  test('a character with nothing filled in falls back to a name and shows nothing else', () => {
    const [entry] = entriesOf({ characters: [character('c1')], builds: [] });
    expect(entry).toMatchObject({
      name: 'Unnamed character',
      monogram: '',
      summary: '',
      temperament: '',
      chronicle: '',
      clan: '',
      concept: '',
      chronicleKey: '',
      clanKey: '',
    });
  });

  test('a character with only a nature shows no divider and no summary', () => {
    const [entry] = entriesOf({
      characters: [character('c1', { name: 'Lucita', nature: 'Visionary' })],
      builds: [],
    });
    expect(entry).toMatchObject({ name: 'Lucita', temperament: 'Visionary', summary: '' });
  });

  test('a chronicle of spaces is unassigned', () => {
    const [entry] = entriesOf({
      characters: [character('c1', { name: 'Lucita', chronicle: '   ' })],
      builds: [],
    });
    expect(entry).toMatchObject({ chronicle: '', chronicleKey: '' });
  });

  test('the keys fold case, accents and surrounding space', () => {
    const [entry] = entriesOf({
      characters: [character('c1', { chronicle: ' Évora Nights ', clan: ' TOREADOR ' })],
      builds: [],
    });
    expect(entry).toMatchObject({
      chronicle: 'Évora Nights',
      chronicleKey: 'evora nights',
      clan: 'TOREADOR',
      clanKey: 'toreador',
    });
  });

  test('a build summarises clan and concept, with no generation', () => {
    const [entry] = entriesOf({
      characters: [],
      builds: [
        build('b1', {
          name: 'Beckett',
          clan: 'Gangrel',
          concept: 'Wanderer',
          nature: 'Loner',
          demeanor: 'Scholar',
          chronicle: 'The Glass City',
        }),
      ],
    });
    expect(entry).toEqual({
      kind: 'build',
      id: 'b1',
      name: 'Beckett',
      monogram: 'B',
      summary: 'Gangrel · Wanderer',
      temperament: 'Loner / Scholar',
      chronicle: 'The Glass City',
      clan: 'Gangrel',
      concept: 'Wanderer',
      chronicleKey: 'the glass city',
      clanKey: 'gangrel',
    });
  });

  test('a build with nothing filled in falls back to a name', () => {
    const [entry] = entriesOf({ characters: [], builds: [build('b1')] });
    expect(entry).toMatchObject({ kind: 'build', name: 'Unnamed build', monogram: '', summary: '' });
  });

  test('characters and builds are listed together, oldest first by id', () => {
    const entries = entriesOf({
      characters: [character('0002', { name: 'Lucita' }), character('0004', { name: 'Fatima' })],
      builds: [build('0001', { name: 'Beckett' }), build('0003', { name: 'Ines' })],
    });
    expect(entries.map((entry) => [entry.kind, entry.id])).toEqual([
      ['build', '0001'],
      ['character', '0002'],
      ['build', '0003'],
      ['character', '0004'],
    ]);
  });

  test('is empty when nothing is stored', () => {
    expect(entriesOf({ characters: [], builds: [] })).toEqual([]);
  });

  test('an unreadable record of each kind carries only its kind and id', () => {
    const entries = entriesOf({
      characters: [{ kind: 'unreadable', id: '0001' }],
      builds: [{ kind: 'unreadable', id: '0002' }],
    });
    expect(entries).toEqual([
      { kind: 'unreadable-character', id: '0001' },
      { kind: 'unreadable-build', id: '0002' },
    ]);
  });

  test('a record that throws while being read becomes unreadable and the rest survive', () => {
    const broken = character('0002', { name: 'Broken' });
    Object.defineProperty(broken.character, 'header', {
      get() {
        throw new Error('cannot be read');
      },
    });
    const brokenBuild = build('0004', { name: 'Broken build' });
    Object.defineProperty(brokenBuild.build, 'concept', { value: null });

    const entries = entriesOf({
      characters: [character('0001', { name: 'Lucita' }), broken],
      builds: [build('0003', { name: 'Beckett' }), brokenBuild],
    });

    expect(entries.map((entry) => [entry.kind, entry.id])).toEqual([
      ['character', '0001'],
      ['unreadable-character', '0002'],
      ['build', '0003'],
      ['unreadable-build', '0004'],
    ]);
  });

  describe('repeated display names', () => {
    const names = (records: Parameters<typeof entriesOf>[0]) =>
      entriesOf(records).map((entry) => ('name' in entry ? entry.name : undefined));

    test('are numbered per kind in creation order', () => {
      expect(
        names({
          characters: [character('0001'), character('0003'), character('0005')],
          builds: [build('0002'), build('0004')],
        }),
      ).toEqual([
        'Unnamed character',
        'Unnamed build',
        'Unnamed character 2',
        'Unnamed build 2',
        'Unnamed character 3',
      ]);
    });

    test('number two characters sharing a real name, and leave the monogram alone', () => {
      const entries = entriesOf({
        characters: [character('0001', { name: 'Lucita' }), character('0002', { name: 'Lucita' })],
        builds: [],
      });
      expect(entries).toMatchObject([
        { name: 'Lucita', monogram: 'L' },
        { name: 'Lucita 2', monogram: 'L' },
      ]);
    });

    test('are not told apart from another kind that shares the name', () => {
      expect(
        names({
          characters: [character('0001', { name: 'Lucita' })],
          builds: [build('0002', { name: 'Lucita' })],
        }),
      ).toEqual(['Lucita', 'Lucita']);
    });

    test('skip a number another entry already carries', () => {
      expect(
        names({
          characters: [
            character('0001'),
            character('0002', { name: 'Unnamed character 2' }),
            character('0003'),
          ],
          builds: [],
        }),
      ).toEqual(['Unnamed character', 'Unnamed character 2', 'Unnamed character 3']);
    });

    test('skip a number carried by an entry created later', () => {
      expect(
        names({
          characters: [
            character('0001'),
            character('0002'),
            character('0003', { name: 'Unnamed character 2' }),
          ],
          builds: [],
        }),
      ).toEqual(['Unnamed character', 'Unnamed character 3', 'Unnamed character 2']);
    });

    test('ignore unreadable records', () => {
      expect(
        names({
          characters: [{ kind: 'unreadable', id: '0001' }, character('0002'), character('0003')],
          builds: [],
        }),
      ).toEqual([undefined, 'Unnamed character', 'Unnamed character 2']);
    });
  });
});

describe('countsLine', () => {
  test.each([
    [0, 0, 'Showing 0 of 0 characters'],
    [1, 1, 'Showing 1 of 1 characters'],
    [3, 3, 'Showing 3 of 3 characters'],
    [2, 5, 'Showing 2 of 5 characters'],
    [0, 4, 'Showing 0 of 4 characters'],
  ])('shown %i of stored %i reads %j', (shown, stored, line) => {
    expect(countsLine(shown, stored)).toBe(line);
  });
});

describe('view', () => {
  const stored = entriesOf({
    characters: [character('0001', { name: 'Lucita' }), { kind: 'unreadable', id: '0003' }],
    builds: [build('0002', { name: 'Beckett' })],
  });

  test('shows every entry, oldest first, with the initial filter', () => {
    const result = view(stored, INITIAL_FILTER);
    expect(result.shown).toEqual(stored);
    expect(result.shown.map((entry) => entry.id)).toEqual(['0001', '0002', '0003']);
    expect(result.state).toBe('entries');
  });

  test('counts unreadable entries among those shown and stored', () => {
    expect(view(stored, INITIAL_FILTER).countsLine).toBe('Showing 3 of 3 characters');
  });

  test('is empty when nothing is stored', () => {
    expect(view([], INITIAL_FILTER)).toMatchObject({
      shown: [],
      state: 'empty',
      countsLine: 'Showing 0 of 0 characters',
    });
  });
});
