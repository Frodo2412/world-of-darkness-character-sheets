import { describe, expect, test } from 'vitest';
import { blankCharacter, setHeaderField } from './character';
import { blankBuild, type ConceptField, type V20Build } from './creation/build';
import { countsLine, entriesOf, INITIAL_FILTER, UNASSIGNED, view } from './library';
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
      chronicleLabel: 'The Glass City',
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
      chronicleLabel: UNASSIGNED,
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
    expect(entry).toMatchObject({
      chronicle: '',
      chronicleLabel: 'Unassigned',
      chronicleKey: '',
    });
  });

  test('the keys ignore case and surrounding space', () => {
    const [entry] = entriesOf({
      characters: [character('c1', { chronicle: ' The Glass City ', clan: ' TOREADOR ' })],
      builds: [],
    });
    expect(entry).toMatchObject({
      chronicle: 'The Glass City',
      chronicleKey: 'the glass city',
      clan: 'TOREADOR',
      clanKey: 'toreador',
    });
  });

  test('the keys keep accents: "Élysée" and "Elysee" are different chronicles and clans', () => {
    const entryWith = (chronicle: string, clan: string) => {
      const [entry] = entriesOf({ characters: [character('c1', { chronicle, clan })], builds: [] });
      return entry;
    };
    expect(entryWith('Élysée', 'Élysée')).toMatchObject({ chronicleKey: 'élysée', clanKey: 'élysée' });
    expect(entryWith('Elysee', 'Elysee')).toMatchObject({ chronicleKey: 'elysee', clanKey: 'elysee' });
  });

  test('a build with a blank chronicle is labelled unassigned', () => {
    const [entry] = entriesOf({ characters: [], builds: [build('b1', { chronicle: '  ' })] });
    expect(entry).toMatchObject({ chronicle: '', chronicleLabel: UNASSIGNED });
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
      chronicleLabel: 'The Glass City',
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

    test('are the same name when they differ only in case', () => {
      expect(
        names({
          characters: [character('0001', { name: 'Lucita' }), character('0002', { name: 'lucita' })],
          builds: [],
        }),
      ).toEqual(['Lucita', 'lucita 2']);
    });

    test('are the same name when they differ only in runs of space', () => {
      expect(
        names({
          characters: [
            character('0001', { name: 'Ana Maria' }),
            character('0002', { name: 'Ana  Maria' }),
          ],
          builds: [],
        }),
      ).toEqual(['Ana Maria', 'Ana  Maria 2']);
    });

    test('are different names when they differ in accents', () => {
      expect(
        names({
          characters: [character('0001', { name: 'Eloise' }), character('0002', { name: 'Éloïse' })],
          builds: [],
        }),
      ).toEqual(['Eloise', 'Éloïse']);
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

    test('skip a number another entry carries, compared the same way', () => {
      expect(
        names({
          characters: [
            character('0001', { name: 'Lucita' }),
            character('0002', { name: 'lucita' }),
            character('0003', { name: 'LUCITA  2' }),
          ],
          builds: [],
        }),
      ).toEqual(['Lucita', 'lucita 3', 'LUCITA  2']);
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

  test.each([
    ['one unreadable record', { characters: [{ kind: 'unreadable' as const, id: '0001' }], builds: [] }],
    ['one build', { characters: [], builds: [build('0001', { name: 'Beckett' })] }],
  ])('is not empty when only %s is stored', (_, records) => {
    expect(view(entriesOf(records), INITIAL_FILTER)).toMatchObject({
      state: 'entries',
      countsLine: 'Showing 1 of 1 characters',
    });
  });

  test('is empty when nothing is stored', () => {
    expect(view([], INITIAL_FILTER)).toMatchObject({
      shown: [],
      state: 'empty',
      countsLine: 'Showing 0 of 0 characters',
    });
  });
});

/** Characters filed under `chronicles`, oldest first; '' leaves the chronicle blank. */
const inChronicles = (...chronicles: string[]) =>
  entriesOf({
    characters: chronicles.map((chronicle, index) =>
      character(String(index + 1).padStart(4, '0'), { chronicle }),
    ),
    builds: [],
  });

/** Each tab as the strip will print it: its label, a dot, its count. */
const printed = (entries: Parameters<typeof view>[0], filter = INITIAL_FILTER) =>
  view(entries, filter).tabs.map((tab) => `${tab.label} · ${tab.count}`);

describe('view: chronicle tabs', () => {
  test('the initial filter selects the All tab', () => {
    const result = view(inChronicles('The Glass City'), INITIAL_FILTER);
    expect(result.tab).toBe(result.tabs[0].key);
    expect(result.tabs[0]).toMatchObject({ label: 'All characters', count: 1 });
  });

  test('with no chronicle anywhere there is only the All tab', () => {
    expect(printed(inChronicles('', '   '))).toEqual(['All characters · 2']);
  });

  test('each chronicle has a tab, alphabetical, after All', () => {
    expect(printed(inChronicles('The Glass City', 'The Glass City', 'Ashes of Milan'))).toEqual([
      'All characters · 3',
      'Ashes of Milan · 1',
      'The Glass City · 2',
    ]);
  });

  test('chronicles are ordered ignoring case and accents', () => {
    expect(printed(inChronicles('zebra', 'Élysée', 'Beta', 'alpha')).slice(1)).toEqual([
      'alpha · 1',
      'Beta · 1',
      'Élysée · 1',
      'zebra · 1',
    ]);
  });

  test.each([
    ['three spellings', ['The Glass City', ' the glass city ', 'THE GLASS CITY'], 'The Glass City · 3'],
    ['the oldest spelling is not the tidiest', [' the glass city ', 'The Glass City'], 'the glass city · 2'],
  ])('one chronicle however it is spelled: %s', (_, spellings, tab) => {
    expect(printed(inChronicles(...spellings)).slice(1)).toEqual([tab]);
  });

  test('accents tell chronicles apart', () => {
    expect(printed(inChronicles('Élysée', 'Elysee')).slice(1)).toEqual(['Elysee · 1', 'Élysée · 1']);
  });

  test('a build counts in its chronicle', () => {
    const entries = entriesOf({
      characters: [character('0001', { chronicle: 'The Glass City' })],
      builds: [build('0002', { chronicle: 'The Glass City' })],
    });
    expect(printed(entries)).toEqual(['All characters · 2', 'The Glass City · 2']);
  });

  test('tab keys are stable across what is stored', () => {
    const glassKey = (...chronicles: string[]) =>
      view(inChronicles(...chronicles), INITIAL_FILTER).tabs.find((tab) => tab.label === 'Glass')!.key;
    expect(glassKey('Ashes', 'Glass')).toBe(glassKey('Glass', ' glass '));
  });

  test('every tab has its own key', () => {
    const keys = view(inChronicles('A', 'B', ''), INITIAL_FILTER).tabs.map((tab) => tab.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('an empty library has only the All tab, counting nothing', () => {
    expect(printed([])).toEqual(['All characters · 0']);
  });

  test('Unassigned comes last, counting the entries with no chronicle', () => {
    expect(printed(inChronicles('The Glass City', '', 'Ashes of Milan', '   '))).toEqual([
      'All characters · 4',
      'Ashes of Milan · 1',
      'The Glass City · 1',
      'Unassigned · 2',
    ]);
  });

  test('Unassigned is left out when every entry has a chronicle', () => {
    expect(printed(inChronicles('The Glass City', 'The Glass City'))).toEqual([
      'All characters · 2',
      'The Glass City · 2',
    ]);
  });

  test('an unreadable entry counts as unassigned, and a build in its chronicle', () => {
    const entries = entriesOf({
      characters: [
        character('0001', { chronicle: 'The Glass City' }),
        { kind: 'unreadable', id: '0003' },
      ],
      builds: [build('0002', { chronicle: 'The Glass City' }), { kind: 'unreadable', id: '0004' }],
    });
    expect(printed(entries)).toEqual(['All characters · 4', 'The Glass City · 2', 'Unassigned · 2']);
  });

  test('unreadable entries alone make no chronicle, so no Unassigned tab', () => {
    const entries = entriesOf({ characters: [{ kind: 'unreadable', id: '0001' }], builds: [] });
    expect(printed(entries)).toEqual(['All characters · 1']);
  });

  describe('a chronicle named like a special tab', () => {
    test.each([
      ['Unassigned', ' unassigned ', ['Ashes · 1', '"Unassigned" · 2', 'Unassigned · 1']],
      ['All characters', 'ALL CHARACTERS', ['"All characters" · 2', 'Ashes · 1', 'Unassigned · 1']],
    ])('%j is its own chronicle, labelled in quotation marks', (name, spelling, tabs) => {
      expect(printed(inChronicles(name, spelling, 'Ashes', '')).slice(1)).toEqual(tabs);
    });

    test('its tab is not the special tab: keys never collide', () => {
      const keys = view(inChronicles('Unassigned', 'All characters', 'Ashes', ''), INITIAL_FILTER).tabs.map(
        (tab) => tab.key,
      );
      expect(keys).toHaveLength(5);
      expect(new Set(keys).size).toBe(5);
    });

    test('a chronicle named Unassigned leaves the real Unassigned tab to the blank ones', () => {
      const result = view(inChronicles('Unassigned', ''), INITIAL_FILTER);
      expect(result.tabs.map((tab) => [tab.label, tab.count])).toEqual([
        ['All characters', 2],
        ['"Unassigned"', 1],
        ['Unassigned', 1],
      ]);
    });

    test.each([
      ['Unassigned', ['"Unassigned" · 1', '""Unassigned"" · 1', 'Unassigned · 1']],
      ['All characters', ['"All characters" · 1', '""All characters"" · 1', 'Unassigned · 1']],
    ])('a second chronicle typed as "%s" with its quotation marks keeps its own label', (name, tabs) => {
      expect(printed(inChronicles(`"${name}"`, name, '')).slice(1)).toEqual(tabs);
    });

    test('quotation marks are added until the label is unique', () => {
      const labels = view(inChronicles('Unassigned', '"Unassigned"', '""Unassigned""', ''), INITIAL_FILTER).tabs.map(
        (tab) => tab.label,
      );
      expect(labels).toEqual([
        'All characters',
        '""Unassigned""',
        '"Unassigned"',
        '"""Unassigned"""',
        'Unassigned',
      ]);
      expect(new Set(labels).size).toBe(labels.length);
    });

    test('labels are told apart ignoring case, as the tabs would read the same', () => {
      const labels = view(inChronicles('Unassigned', '"UNASSIGNED"', ''), INITIAL_FILTER).tabs.map(
        (tab) => tab.label,
      );
      expect(new Set(labels.map((label) => label.toLowerCase())).size).toBe(labels.length);
    });

    describe('selecting the tab of such a chronicle', () => {
      const entries = entriesOf({
        characters: [
          character('0001', { name: 'Anatole', chronicle: 'Unassigned' }),
          character('0002', { name: 'Beckett', chronicle: 'All characters' }),
          character('0003', { name: 'Fatima', chronicle: 'Ashes' }),
          character('0004', { name: 'Lucita' }),
        ],
        builds: [],
      });
      const idsOn = (label: string) => {
        const key = view(entries, INITIAL_FILTER).tabs.find((tab) => tab.label === label)!.key;
        return view(entries, { tab: key }).shown.map((entry) => entry.id);
      };

      test('"Unassigned" lists that chronicle, not the blank entries', () => {
        expect(idsOn('"Unassigned"')).toEqual(['0001']);
        expect(idsOn('Unassigned')).toEqual(['0004']);
      });

      test('"All characters" lists that chronicle, not everything', () => {
        expect(idsOn('"All characters"')).toEqual(['0002']);
        expect(idsOn('All characters')).toEqual(['0001', '0002', '0003', '0004']);
      });
    });

    test.each(['all', 'unassigned:x', 'chronicle:x', 'a:b'])(
      'a chronicle called %j has an unquoted label, its own key and its own entries',
      (name) => {
        const entries = inChronicles(name, 'Other', '');
        const { tabs } = view(entries, INITIAL_FILTER);
        const own = tabs.filter((tab) => tab.label === name);
        expect(own).toHaveLength(1);
        expect(new Set(tabs.map((tab) => tab.key)).size).toBe(tabs.length);
        expect(view(entries, { tab: own[0].key }).tab).toBe(own[0].key);
        expect(view(entries, { tab: own[0].key }).shown.map((entry) => entry.id)).toEqual(['0001']);
      },
    );
  });
});

describe('view: the selected tab', () => {
  const records = {
    characters: [
      character('0001', { name: 'Lucita', chronicle: 'The Glass City' }),
      character('0002', { name: 'Beckett' }),
      character('0003', { name: 'Anatole', chronicle: ' the glass city ' }),
      { kind: 'unreadable' as const, id: '0005' },
    ],
    builds: [build('0004', { name: 'Fatima', chronicle: 'Ashes of Milan' })],
  };
  const entries = entriesOf(records);
  const keyOf = (label: string) => view(entries, INITIAL_FILTER).tabs.find((tab) => tab.label === label)!.key;
  const idsOn = (label: string) => view(entries, { tab: keyOf(label) }).shown.map((entry) => entry.id);

  test('All shows everything', () => {
    expect(idsOn('All characters')).toEqual(['0001', '0002', '0003', '0004', '0005']);
  });

  test('a chronicle shows its readable entries, builds included', () => {
    expect(idsOn('The Glass City')).toEqual(['0001', '0003']);
    expect(idsOn('Ashes of Milan')).toEqual(['0004']);
  });

  test('Unassigned shows the blank chronicles and every unreadable entry', () => {
    expect(idsOn('Unassigned')).toEqual(['0002', '0005']);
  });

  test('the resolved tab is the selected one', () => {
    expect(view(entries, { tab: keyOf('Ashes of Milan') }).tab).toBe(keyOf('Ashes of Milan'));
  });

  test('a tab that no longer exists resolves to All and shows everything', () => {
    const goneKey = view(inChronicles('Gone', 'Ashes'), INITIAL_FILTER).tabs.find((tab) => tab.label === 'Gone')!.key;
    expect(view(entries, INITIAL_FILTER).tabs.map((tab) => tab.key)).not.toContain(goneKey);
    const result = view(entries, { tab: goneKey });
    expect(result.tab).toBe(INITIAL_FILTER.tab);
    expect(result.shown).toHaveLength(5);
  });

  test('the Unassigned tab resolves to All once no chronicle exists to set it apart', () => {
    const unassignedKey = keyOf('Unassigned');
    const bare = inChronicles('', '');
    expect(view(bare, { tab: unassignedKey })).toMatchObject({ tab: INITIAL_FILTER.tab });
    expect(view(bare, { tab: unassignedKey }).shown).toHaveLength(2);
  });

  test('counts stay the same whichever tab is selected', () => {
    const counts = (tab: string) => view(entries, { tab }).tabs.map((t) => t.count);
    expect(counts(keyOf('Ashes of Milan'))).toEqual(counts(INITIAL_FILTER.tab));
  });

  test('the counts line is shown of stored', () => {
    expect(view(entries, INITIAL_FILTER).countsLine).toBe('Showing 5 of 5 characters');
    expect(view(entries, { tab: keyOf('Ashes of Milan') }).countsLine).toBe('Showing 1 of 5 characters');
    expect(view(entries, { tab: keyOf('Unassigned') }).countsLine).toBe('Showing 2 of 5 characters');
  });

  test('the state is about what is stored, not what the tab shows', () => {
    expect(view(entries, { tab: keyOf('Ashes of Milan') }).state).toBe('entries');
  });

  test('the entries handed in are not changed', () => {
    const before = structuredClone(entries);
    const given = [...entries];
    view(given, { tab: keyOf('Unassigned') });
    expect(given).toEqual(before);
    expect(entries).toEqual(before);
  });
});

describe('view: the breakdown', () => {
  test.each([
    ['one chronicle and one unassigned', ['The Glass City', 'The Glass City', ''], '2 in The Glass City · 1 unassigned'],
    ['several chronicles', ['The Glass City', 'Ashes of Milan', 'Ashes of Milan', ''], '3 in 2 chronicles · 1 unassigned'],
    ['no unassigned entry', ['The Glass City', 'The Glass City'], '2 in The Glass City'],
    ['several chronicles and no unassigned entry', ['A', 'B'], '2 in 2 chronicles'],
    ['one chronicle spelled three ways: the oldest spelling', [' the glass city ', 'The Glass City', 'THE GLASS CITY'], '3 in the glass city'],
    ['no chronicle at all', ['', '   '], ''],
    ['mixed spellings beside another chronicle', ['A', 'a', 'B'], '3 in 2 chronicles'],
  ])('with %s reads %j', (_, chronicles, breakdown) => {
    expect(view(inChronicles(...chronicles), INITIAL_FILTER).breakdown).toBe(breakdown);
  });

  test('is empty for an empty library', () => {
    expect(view([], INITIAL_FILTER).breakdown).toBe('');
  });

  test('is empty for a library holding only an unreadable record, since no chronicle exists', () => {
    const entries = entriesOf({ characters: [{ kind: 'unreadable', id: '0001' }], builds: [] });
    expect(view(entries, INITIAL_FILTER).breakdown).toBe('');
  });

  test('counts builds, and unreadable entries as unassigned', () => {
    const entries = entriesOf({
      characters: [character('0001', { chronicle: 'The Glass City' }), { kind: 'unreadable', id: '0003' }],
      builds: [build('0002', { chronicle: 'The Glass City' })],
    });
    expect(view(entries, INITIAL_FILTER).breakdown).toBe('2 in The Glass City · 1 unassigned');
  });

  test('does not follow the selected tab', () => {
    const entries = inChronicles('The Glass City', 'The Glass City', '');
    const unassigned = view(entries, INITIAL_FILTER).tabs.find((tab) => tab.label === 'Unassigned')!;
    const result = view(entries, { tab: unassigned.key });
    expect(result.shown).toHaveLength(1);
    expect(result.breakdown).toBe('2 in The Glass City · 1 unassigned');
  });

  test('names a single chronicle as its tab does: one called like a special tab is quoted', () => {
    expect(view(inChronicles('Unassigned', 'Unassigned', ''), INITIAL_FILTER).breakdown).toBe(
      '2 in "Unassigned" · 1 unassigned',
    );
  });

  test('names a single chronicle by the same unique label as its tab', () => {
    const result = view(inChronicles('"Unassigned"', ''), INITIAL_FILTER);
    expect(result.breakdown).toBe('1 in "Unassigned" · 1 unassigned');
    expect(result.tabs[1].label).toBe('"Unassigned"');
  });
});

