import { describe, expect, test } from 'vitest';
import { blankCharacter, setHeaderField } from './character';
import { blankBuild, type ConceptField, type V20Build } from './creation/build';
import { ALL_CLANS, clearedFilter, countsLine, entriesOf, INITIAL_FILTER as SHIPPED_FILTER, ORDERS, UNASSIGNED, view, type LibraryFilter, type LibraryOrder } from './library';
import type { HeaderField } from './traits';

// Most of these tests read the entries in storage order, so they fix the order the player starts with.
const INITIAL_FILTER: LibraryFilter = { ...SHIPPED_FILTER, order: 'oldest' };

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
  test('a character with eight backgrounds is listed like any other', () => {
    const many = character('c1', { name: 'Éloïse Voss' });
    many.character.backgrounds.push({ name: 'Herd', rating: 1 }, { name: 'Fame', rating: 2, note: 'Local' });

    const [entry] = entriesOf({ characters: [many], builds: [] });

    expect(entry).toMatchObject({ kind: 'character', id: 'c1', name: 'Éloïse Voss' });
  });

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
        return view(entries, { ...INITIAL_FILTER, tab: key }).shown.map((entry) => entry.id);
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
        expect(view(entries, { ...INITIAL_FILTER, tab: own[0].key }).tab).toBe(own[0].key);
        expect(view(entries, { ...INITIAL_FILTER, tab: own[0].key }).shown.map((entry) => entry.id)).toEqual(['0001']);
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
  const idsOn = (label: string) => view(entries, { ...INITIAL_FILTER, tab: keyOf(label) }).shown.map((entry) => entry.id);

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
    expect(view(entries, { ...INITIAL_FILTER, tab: keyOf('Ashes of Milan') }).tab).toBe(keyOf('Ashes of Milan'));
  });

  test('a tab that no longer exists resolves to All and shows everything', () => {
    const goneKey = view(inChronicles('Gone', 'Ashes'), INITIAL_FILTER).tabs.find((tab) => tab.label === 'Gone')!.key;
    expect(view(entries, INITIAL_FILTER).tabs.map((tab) => tab.key)).not.toContain(goneKey);
    const result = view(entries, { ...INITIAL_FILTER, tab: goneKey });
    expect(result.tab).toBe(INITIAL_FILTER.tab);
    expect(result.shown).toHaveLength(5);
  });

  test('the Unassigned tab resolves to All once no chronicle exists to set it apart', () => {
    const unassignedKey = keyOf('Unassigned');
    const bare = inChronicles('', '');
    expect(view(bare, { ...INITIAL_FILTER, tab: unassignedKey })).toMatchObject({ tab: INITIAL_FILTER.tab });
    expect(view(bare, { ...INITIAL_FILTER, tab: unassignedKey }).shown).toHaveLength(2);
  });

  test('counts stay the same whichever tab is selected', () => {
    const counts = (tab: string) => view(entries, { ...INITIAL_FILTER, tab }).tabs.map((t) => t.count);
    expect(counts(keyOf('Ashes of Milan'))).toEqual(counts(INITIAL_FILTER.tab));
  });

  test('the counts line is shown of stored', () => {
    expect(view(entries, INITIAL_FILTER).countsLine).toBe('Showing 5 of 5 characters');
    expect(view(entries, { ...INITIAL_FILTER, tab: keyOf('Ashes of Milan') }).countsLine).toBe('Showing 1 of 5 characters');
    expect(view(entries, { ...INITIAL_FILTER, tab: keyOf('Unassigned') }).countsLine).toBe('Showing 2 of 5 characters');
  });

  test('the state is about what is stored, not what the tab shows', () => {
    expect(view(entries, { ...INITIAL_FILTER, tab: keyOf('Ashes of Milan') }).state).toBe('entries');
  });

  test('the entries handed in are not changed', () => {
    const before = structuredClone(entries);
    const given = [...entries];
    view(given, { ...INITIAL_FILTER, tab: keyOf('Unassigned') });
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
    const result = view(entries, { ...INITIAL_FILTER, tab: unassigned.key });
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


describe('view: search', () => {
  const stored = entriesOf({
    characters: [
      character('0001', {
        name: 'Éloïse Voss',
        clan: 'Toreador',
        concept: 'Antiquarian',
        player: 'Ana',
        chronicle: 'The Glass City',
      }),
      character('0002', { name: 'Gabriel Ash', clan: 'Ventrue', concept: 'Fixer', chronicle: 'The Glass City' }),
      character('0003', { name: 'Mara Delacroix', clan: 'Brujah', concept: 'Agitator' }),
    ],
    builds: [build('0004', { name: 'Silas Reed', clan: 'brujah', concept: 'Broker', chronicle: 'The Glass City' })],
  });
  const searched = (search: string, tab = INITIAL_FILTER.tab) =>
    view(stored, { ...INITIAL_FILTER, tab, search }).shown.map((entry) => entry.id);

  test('the initial filter searches for nothing', () => {
    expect(INITIAL_FILTER.search).toBe('');
  });

  test.each([
    ['name', 'voss', ['0001']],
    ['clan', 'ventrue', ['0002']],
    ['concept', 'agitat', ['0003']],
    ['the name of a build', 'silas', ['0004']],
    ['the clan of a build and of a character, spelled differently', 'brujah', ['0003', '0004']],
    ['the concept of a build', 'broker', ['0004']],
    ['text in the middle of a field', 'ntiqua', ['0001']],
    ['no field', 'zzz', []],
  ])('finds by %s', (_, search, ids) => {
    expect(searched(search)).toEqual(ids);
  });

  test.each([
    ['the player', 'Ana'],
    ['the chronicle', 'Glass'],
  ])('does not look at %s', (_, search) => {
    expect(searched(search)).toEqual([]);
  });

  describe('ignores case and accents, whichever side has them', () => {
    const idsFor = (name: string, search: string) =>
      view(entriesOf({ characters: [character('0001', { name })], builds: [] }), { ...INITIAL_FILTER, search }).shown.map(
        (entry) => entry.id,
      );

    test.each([
      ['Éloïse Voss', 'eloise'],
      ['Éloïse Voss', 'ELOISE'],
      ['Éloïse Voss', 'éLoÏsE'],
      ['Eloise', 'ÉLOÏSE'],
      ['Eloise', 'éloïse'],
    ])('%s is found by %s', (name, search) => {
      expect(idsFor(name, search)).toEqual(['0001']);
    });
  });

  test.each([
    ['spaces around it', '  voss  '],
    ['capitals', 'VOSS'],
  ])('is trimmed and case-folded: %s', (_, search) => {
    expect(searched(search)).toEqual(['0001']);
  });

  test.each(['', ' ', '   ', '\t'])('a search of only blanks (%j) matches everything', (search) => {
    expect(searched(search)).toEqual(['0001', '0002', '0003', '0004']);
  });

  test('is found by the name as displayed, numbered when repeated', () => {
    const unnamed = entriesOf({ characters: [character('0001'), character('0002')], builds: [] });
    const ids = (search: string) => view(unnamed, { ...INITIAL_FILTER, search }).shown.map((entry) => entry.id);
    expect(ids('unnamed')).toEqual(['0001', '0002']);
    expect(ids('2')).toEqual(['0002']);
    expect(ids('character 2')).toEqual(['0002']);
  });

  describe('with a tab', () => {
    const glassCity = view(stored, INITIAL_FILTER).tabs.find((tab) => tab.label === 'The Glass City')!.key;

    test('keeps only the entries both the tab and the search keep', () => {
      expect(searched('x', glassCity)).toEqual(['0002']);
    });

    test('a search that matches only outside the tab finds nothing in it', () => {
      expect(searched('mara', glassCity)).toEqual([]);
      expect(searched('mara')).toEqual(['0003']);
    });

    test('an empty search leaves the tab as it was', () => {
      expect(searched('', glassCity)).toEqual(['0001', '0002', '0004']);
    });
  });

  describe('an unreadable entry', () => {
    const withUnreadable = entriesOf({
      characters: [character('0001', { name: 'Lucita' }), { kind: 'unreadable', id: '0002' }],
      builds: [{ kind: 'unreadable', id: '0003' }],
    });
    const ids = (search: string) => view(withUnreadable, { ...INITIAL_FILTER, search }).shown.map((entry) => entry.id);

    test('matches an empty search', () => {
      expect(ids('')).toEqual(['0001', '0002', '0003']);
      expect(ids('   ')).toEqual(['0001', '0002', '0003']);
    });

    test.each(['e', 'unreadable', 'character', 'build', '0002'])('does not match %j', (search) => {
      expect(ids(search)).not.toContain('0002');
      expect(ids(search)).not.toContain('0003');
    });
  });

  test('the tab counts and the tab list are the same whatever is searched', () => {
    const tabsFor = (search: string) => view(stored, { ...INITIAL_FILTER, search }).tabs;
    expect(tabsFor('eloise')).toEqual(tabsFor(''));
    expect(tabsFor('zzz')).toEqual(tabsFor(''));
  });

  test('the counts line reads shown of stored, so it follows the search', () => {
    const line = (search: string) => view(stored, { ...INITIAL_FILTER, search }).countsLine;
    expect(line('eloise')).toBe('Showing 1 of 4 characters');
    expect(line('e')).toBe('Showing 4 of 4 characters');
    expect(line('zzz')).toBe('Showing 0 of 4 characters');
  });

  test('the breakdown describes every stored entry, whatever is searched', () => {
    expect(view(stored, { ...INITIAL_FILTER, search: 'zzz' }).breakdown).toBe(view(stored, INITIAL_FILTER).breakdown);
  });

  test('the entries handed in are not changed', () => {
    const before = structuredClone(stored);
    view(stored, { ...INITIAL_FILTER, search: 'eloise' });
    expect(stored).toEqual(before);
  });
});

describe('view: clan and status', () => {
  const stored = entriesOf({
    characters: [
      character('0001', { name: 'Éloïse Voss', clan: 'Toreador', concept: 'Antiquarian', chronicle: 'The Glass City' }),
      character('0002', { name: 'Gabriel Ash', clan: 'Ventrue', concept: 'Fixer', chronicle: 'The Glass City' }),
      character('0003', { name: 'Mara Delacroix', clan: 'Brujah', concept: 'Agitator' }),
    ],
    builds: [build('0004', { name: 'Silas Reed', clan: 'Brujah', concept: 'Broker', chronicle: 'The Glass City' })],
  });
  const glassCity = view(stored, INITIAL_FILTER).tabs.find((tab) => tab.label === 'The Glass City')!.key;
  const unassigned = view(stored, INITIAL_FILTER).tabs.find((tab) => tab.label === UNASSIGNED)!.key;
  const listed = (patch: Partial<LibraryFilter>, entries = stored) =>
    view(entries, { ...INITIAL_FILTER, ...patch }).shown.map((entry) => entry.id);
  const clansOf = (...clans: string[]) =>
    view(
      entriesOf({ characters: clans.map((clan, index) => character(String(index + 1).padStart(4, '0'), { clan })), builds: [] }),
      INITIAL_FILTER,
    ).clans;

  test('the initial filter is all clans and all statuses', () => {
    expect(INITIAL_FILTER).toMatchObject({ clan: ALL_CLANS, status: 'all' });
  });

  describe('the clans on offer', () => {
    test('are each distinct clan, alphabetical, keyed and labelled', () => {
      expect(view(stored, INITIAL_FILTER).clans).toEqual([
        { key: 'brujah', label: 'Brujah' },
        { key: 'toreador', label: 'Toreador' },
        { key: 'ventrue', label: 'Ventrue' },
      ]);
    });

    test('merge spellings that differ only by case or surrounding space, labelled as the oldest spells it, trimmed', () => {
      expect(clansOf(' brujah ', 'Brujah', 'BRUJAH')).toEqual([{ key: 'brujah', label: 'brujah' }]);
      expect(clansOf('Brujah', ' brujah ')).toEqual([{ key: 'brujah', label: 'Brujah' }]);
    });

    test('keep clans that differ by an accent apart', () => {
      // Alphabetically they read alike, so the key settles which is first.
      expect(clansOf('Élite', 'Elite')).toEqual([
        { key: 'elite', label: 'Elite' },
        { key: 'élite', label: 'Élite' },
      ]);
    });

    test('are in alphabetical order ignoring case and accents', () => {
      expect(clansOf('ventrue', 'Élite', 'Toreador', 'brujah', 'Assamite').map((clan) => clan.label)).toEqual([
        'Assamite',
        'brujah',
        'Élite',
        'Toreador',
        'ventrue',
      ]);
    });

    test('leave out blank clans', () => {
      expect(clansOf('', '   ', 'Gangrel')).toEqual([{ key: 'gangrel', label: 'Gangrel' }]);
      expect(clansOf('', ' ')).toEqual([]);
    });

    test('come from readable entries only, builds included', () => {
      const entries = entriesOf({
        characters: [{ kind: 'unreadable', id: '0001' }],
        builds: [build('0002', { clan: 'Gangrel' }), { kind: 'unreadable', id: '0003' }],
      });
      expect(view(entries, INITIAL_FILTER).clans).toEqual([{ key: 'gangrel', label: 'Gangrel' }]);
    });

    test('are the whole library’s, whatever else is filtered', () => {
      const all = view(stored, INITIAL_FILTER).clans;
      expect(view(stored, { ...INITIAL_FILTER, tab: unassigned }).clans).toEqual(all);
      expect(view(stored, { ...INITIAL_FILTER, search: 'zzz' }).clans).toEqual(all);
      expect(view(stored, { ...INITIAL_FILTER, status: 'ready' }).clans).toEqual(all);
    });
  });

  describe('a clan alone', () => {
    test('lists only that clan, spelled any way', () => {
      expect(listed({ clan: 'brujah' })).toEqual(['0003', '0004']);
      expect(listed({ clan: 'ventrue' })).toEqual(['0002']);
    });

    test('lists every entry of a merged clan', () => {
      const entries = entriesOf({
        characters: [character('0001', { clan: ' brujah ' }), character('0002', { clan: 'BRUJAH' })],
        builds: [build('0003', { clan: 'Brujah' })],
      });
      expect(listed({ clan: 'brujah' }, entries)).toEqual(['0001', '0002', '0003']);
    });

    test('does not list a clan that differs by an accent', () => {
      const entries = entriesOf({ characters: [character('0001', { clan: 'Élite' }), character('0002', { clan: 'Elite' })], builds: [] });
      expect(listed({ clan: 'elite' }, entries)).toEqual(['0002']);
    });

    test('is resolved to the clan itself', () => {
      expect(view(stored, { ...INITIAL_FILTER, clan: 'brujah' }).clan).toBe('brujah');
    });

    test('that no longer exists is all clans', () => {
      const result = view(stored, { ...INITIAL_FILTER, clan: 'nosferatu' });
      expect(result.clan).toBe(ALL_CLANS);
      expect(result.shown.map((entry) => entry.id)).toEqual(['0001', '0002', '0003', '0004']);
    });

    test('is all clans in a library with no clans at all', () => {
      expect(view(inChronicles('a'), { ...INITIAL_FILTER, clan: 'brujah' })).toMatchObject({ clan: ALL_CLANS });
    });

    test('leaves out an entry with no clan, which shows only under all clans', () => {
      const entries = entriesOf({ characters: [character('0001', { clan: '' }), character('0002', { clan: 'Gangrel' })], builds: [] });
      expect(listed({}, entries)).toEqual(['0001', '0002']);
      expect(listed({ clan: 'gangrel' }, entries)).toEqual(['0002']);
      expect(listed({ clan: '' }, entries)).toEqual(['0001', '0002']);
    });
  });

  describe('status alone', () => {
    test('all lists every entry', () => {
      expect(listed({ status: 'all' })).toEqual(['0001', '0002', '0003', '0004']);
    });

    test('ready lists characters only, not builds', () => {
      expect(listed({ status: 'ready' })).toEqual(['0001', '0002', '0003']);
    });
  });

  describe('every pair of filters combines with AND', () => {
    test.each([
      ['tab and clan', { tab: glassCity, clan: 'brujah' }, ['0004']],
      ['tab and status', { tab: glassCity, status: 'ready' as const }, ['0001', '0002']],
      ['tab and search', { tab: glassCity, search: 'x' }, ['0002']],
      ['clan and status', { clan: 'brujah', status: 'ready' as const }, ['0003']],
      ['clan and search', { clan: 'brujah', search: 'mara' }, ['0003']],
      ['status and search', { status: 'ready' as const, search: 'silas' }, []],
      ['status and search, matching a character', { status: 'ready' as const, search: 'gab' }, ['0002']],
      ['tab and clan with no overlap', { tab: unassigned, clan: 'ventrue' }, []],
      ['clan and search with no overlap', { clan: 'ventrue', search: 'mara' }, []],
    ])('%s', (_, patch, ids) => {
      expect(listed(patch)).toEqual(ids);
    });

    test('all four', () => {
      expect(listed({ tab: glassCity, clan: 'ventrue', status: 'ready', search: 'gab' })).toEqual(['0002']);
      expect(listed({ tab: glassCity, clan: 'brujah', status: 'ready', search: 'silas' })).toEqual([]);
    });
  });

  describe('an unreadable entry', () => {
    const withUnreadable = entriesOf({
      characters: [character('0001', { name: 'Lucita', clan: 'Toreador' }), { kind: 'unreadable', id: '0002' }],
      builds: [{ kind: 'unreadable', id: '0003' }],
    });

    test('is listed with the initial filter', () => {
      expect(listed({}, withUnreadable)).toEqual(['0001', '0002', '0003']);
    });

    test.each([
      ['a clan', { clan: 'toreador' }],
      ['ready to play', { status: 'ready' as const }],
      ['a search', { search: 'l' }],
    ])('is left out by %s', (_, patch) => {
      expect(listed(patch, withUnreadable)).toEqual(['0001']);
    });

    test('is listed again once the clan filter resolves to all clans', () => {
      expect(listed({ clan: 'nosferatu' }, withUnreadable)).toEqual(['0001', '0002', '0003']);
    });
  });

  describe('the status counts', () => {
    const counts = (patch: Partial<LibraryFilter>, entries = stored) =>
      view(entries, { ...INITIAL_FILTER, ...patch }).statusCounts;

    test('are all and ready for the selected tab', () => {
      expect(counts({})).toEqual({ all: 4, ready: 3 });
      expect(counts({ tab: glassCity })).toEqual({ all: 3, ready: 2 });
      expect(counts({ tab: unassigned })).toEqual({ all: 1, ready: 1 });
    });

    test('ignore the clan, the status and the search', () => {
      expect(counts({ clan: 'brujah' })).toEqual({ all: 4, ready: 3 });
      expect(counts({ status: 'ready' })).toEqual({ all: 4, ready: 3 });
      expect(counts({ search: 'eloise' })).toEqual({ all: 4, ready: 3 });
      expect(counts({ tab: glassCity, clan: 'toreador', status: 'ready', search: 'eloise' })).toEqual({ all: 3, ready: 2 });
    });

    test('count an unreadable entry among all but not among ready', () => {
      const entries = entriesOf({
        characters: [character('0001', { name: 'Lucita' }), { kind: 'unreadable', id: '0002' }],
        builds: [build('0003', { name: 'Beckett' })],
      });
      expect(counts({}, entries)).toEqual({ all: 3, ready: 1 });
    });

    test('are zero in an empty library', () => {
      expect(counts({}, [])).toEqual({ all: 0, ready: 0 });
    });

    test('follow the tab that resolves, when the chosen one is gone', () => {
      expect(counts({ tab: 'chronicle:gone' })).toEqual({ all: 4, ready: 3 });
    });
  });

  describe('the rest of the view', () => {
    test('the tab counts and the tabs are the same whatever clan and status are chosen', () => {
      const tabsFor = (patch: Partial<LibraryFilter>) => view(stored, { ...INITIAL_FILTER, ...patch }).tabs;
      expect(tabsFor({ clan: 'brujah' })).toEqual(tabsFor({}));
      expect(tabsFor({ status: 'ready' })).toEqual(tabsFor({}));
      expect(tabsFor({ clan: 'ventrue', status: 'ready', search: 'zzz' })).toEqual(tabsFor({}));
    });

    test('the counts line follows all four filters', () => {
      const line = (patch: Partial<LibraryFilter>) => view(stored, { ...INITIAL_FILTER, ...patch }).countsLine;
      expect(line({ clan: 'brujah' })).toBe('Showing 2 of 4 characters');
      expect(line({ status: 'ready' })).toBe('Showing 3 of 4 characters');
      expect(line({ tab: glassCity })).toBe('Showing 3 of 4 characters');
      expect(line({ search: 'a' })).toBe('Showing 4 of 4 characters');
      expect(line({ tab: glassCity, clan: 'brujah', status: 'ready' })).toBe('Showing 0 of 4 characters');
    });

    test('the breakdown describes every stored entry, whatever is filtered', () => {
      expect(view(stored, { ...INITIAL_FILTER, clan: 'ventrue', status: 'ready' }).breakdown).toBe(view(stored, INITIAL_FILTER).breakdown);
    });

    test('the state is no-match whenever something is stored and nothing is shown', () => {
      expect(view(stored, { ...INITIAL_FILTER, clan: 'ventrue', search: 'mara' }).state).toBe('no-match');
      expect(view(stored, { ...INITIAL_FILTER, tab: glassCity, clan: 'brujah', status: 'ready' }).state).toBe('no-match');
      expect(view(stored, { ...INITIAL_FILTER, clan: 'ventrue' }).state).toBe('entries');
    });

    test('a library of builds alone has nothing to show under ready to play', () => {
      const builds = entriesOf({ characters: [], builds: [build('0001', { name: 'Beckett' })] });
      expect(view(builds, { ...INITIAL_FILTER, status: 'ready' })).toMatchObject({ state: 'no-match', shown: [] });
    });

    test('the entries handed in are not changed', () => {
      const before = structuredClone(stored);
      view(stored, { tab: glassCity, clan: 'brujah', status: 'ready', search: 'x', order: 'oldest' });
      expect(stored).toEqual(before);
    });
  });
});

describe('view: state', () => {
  test('is entries while something is shown', () => {
    const entries = inChronicles('The Glass City', '');
    expect(view(entries, INITIAL_FILTER).state).toBe('entries');
    expect(view(entries, { ...INITIAL_FILTER, search: 'a' }).state).toBe('entries');
  });

  test('is empty when nothing is stored, whatever is searched', () => {
    expect(view([], INITIAL_FILTER).state).toBe('empty');
    expect(view([], { ...INITIAL_FILTER, search: 'zzz' }).state).toBe('empty');
  });

  test('is no-match when something is stored and the search leaves nothing to show', () => {
    const result = view(inChronicles('The Glass City', ''), { ...INITIAL_FILTER, search: 'zzz' });
    expect(result).toMatchObject({ state: 'no-match', shown: [], countsLine: 'Showing 0 of 2 characters' });
  });

  test('is no-match for a library of unreadable records, which no search matches', () => {
    const entries = entriesOf({ characters: [{ kind: 'unreadable', id: '0001' }], builds: [] });
    expect(view(entries, { ...INITIAL_FILTER, search: 'x' }).state).toBe('no-match');
    expect(view(entries, INITIAL_FILTER).state).toBe('entries');
  });

  test('is no-match in a tab too, and entries again once the search is cleared', () => {
    const entries = inChronicles('The Glass City', 'Ashes', '');
    const glass = view(entries, INITIAL_FILTER).tabs.find((tab) => tab.label === 'The Glass City')!.key;
    expect(view(entries, { ...INITIAL_FILTER, tab: glass, search: 'zzz' }).state).toBe('no-match');
    expect(view(entries, { ...INITIAL_FILTER, tab: glass, search: '' }).state).toBe('entries');
  });
});

describe('clearedFilter', () => {
  const chosen: LibraryFilter = { tab: 'chronicle:the glass city', clan: 'brujah', status: 'ready', search: 'zzz', order: 'name' };

  test('empties the search, the clan and the status and keeps the tab and the order', () => {
    expect(clearedFilter(chosen)).toEqual({ ...INITIAL_FILTER, tab: 'chronicle:the glass city', order: 'name' });
  });

  test.each([
    ['the search', { ...INITIAL_FILTER, tab: 'unassigned', search: 'zzz' }],
    ['the clan', { ...INITIAL_FILTER, tab: 'unassigned', clan: 'brujah' }],
    ['the status', { ...INITIAL_FILTER, tab: 'unassigned', status: 'ready' as const }],
  ])('clears %s on its own', (_, filter) => {
    expect(clearedFilter(filter)).toEqual({ ...INITIAL_FILTER, tab: 'unassigned' });
  });

  test('leaves a filter that restricts nothing but the tab as it was', () => {
    const filter = { ...INITIAL_FILTER, tab: 'unassigned' };
    expect(clearedFilter(filter)).toEqual(filter);
  });

  test('does not change the filter it is given', () => {
    const given = Object.freeze({ ...chosen });
    expect(clearedFilter(given)).not.toBe(given);
    expect(given).toEqual(chosen);
  });

  test('clears the filters that left nothing to show', () => {
    const entries = inChronicles('The Glass City', '');
    const searching = { ...INITIAL_FILTER, search: 'zzz', status: 'ready' as const };
    expect(view(entries, searching).state).toBe('no-match');
    expect(view(entries, clearedFilter(searching)).state).toBe('entries');
  });

  test('clears a clan that left nothing to show', () => {
    const entries = entriesOf({ characters: [character('0001', { clan: 'Gangrel', chronicle: 'a' }), character('0002', { clan: 'Brujah' })], builds: [] });
    const narrowed = { ...INITIAL_FILTER, tab: view(entries, INITIAL_FILTER).tabs[1].key, clan: 'brujah' };
    expect(view(entries, narrowed).state).toBe('no-match');
    expect(view(entries, clearedFilter(narrowed)).shown.map((entry) => entry.id)).toEqual(['0001']);
  });
});

describe('view: sort order', () => {
  test('the player starts with the newest first', () => {
    expect(SHIPPED_FILTER.order).toBe('newest');
  });

  const stored = entriesOf({
    characters: [
      character('0001', { name: 'Lucita', clan: 'Lasombra', chronicle: 'Milan' }),
      character('0003', { name: 'anatole' }),
      character('0004', { name: 'Élodie', clan: 'brujah' }),
      character('0005', { name: 'Zed', clan: 'Brujah' }),
    ],
    builds: [build('0002', { name: 'Beckett', clan: 'Gangrel' })],
  });
  const listed = (order: LibraryOrder, entries = stored, patch: Partial<LibraryFilter> = {}) =>
    view(entries, { ...INITIAL_FILTER, ...patch, order }).shown.map((entry) => ('name' in entry ? entry.name : entry.id));

  test('the labels are the ones the control offers, in order', () => {
    expect(Object.values(ORDERS).map(({ label }) => label)).toEqual([
      'Newest first',
      'Oldest first',
      'Name A–Z',
      'Clan A–Z',
    ]);
  });

  test.each([
    ['newest', ['Zed', 'Élodie', 'anatole', 'Beckett', 'Lucita']],
    ['oldest', ['Lucita', 'Beckett', 'anatole', 'Élodie', 'Zed']],
    ['name', ['anatole', 'Beckett', 'Élodie', 'Lucita', 'Zed']],
    ['clan', ['Élodie', 'Zed', 'Beckett', 'Lucita', 'anatole']],
  ] as const)('%s lists characters and builds interleaved', (order, names) => {
    expect(listed(order)).toEqual(names);
  });

  test('names that differ by case or accent sort together, then by creation', () => {
    const entries = entriesOf({
      characters: [character('1', { name: 'Zoë' }), character('2', { name: 'zoe' }), character('3', { name: 'Zoe' })],
      builds: [],
    });
    expect(listed('name', entries)).toEqual(['Zoë', 'zoe', 'Zoe 2']);
  });

  test('clans that differ by case or accent sort together, then by name', () => {
    const entries = entriesOf({
      characters: [
        character('1', { name: 'B', clan: 'Ventrue' }),
        character('2', { name: 'A', clan: 'ventrue' }),
        character('3', { name: 'C', clan: 'Brujah' }),
      ],
      builds: [],
    });
    expect(listed('clan', entries)).toEqual(['C', 'A', 'B']);
  });

  test('a blank clan comes after every named clan, ties settled by name', () => {
    const entries = entriesOf({
      characters: [character('1', { name: 'Y' }), character('2', { name: 'X' }), character('3', { name: 'W', clan: 'Toreador' })],
      builds: [],
    });
    expect(listed('clan', entries)).toEqual(['W', 'X', 'Y']);
  });

  describe('an unreadable entry', () => {
    const broken = entriesOf({
      characters: [
        character('0001', { name: 'Zed', clan: 'Brujah' }),
        { kind: 'unreadable' as const, id: '0002' },
        character('0004', { name: 'Unreadable zzz', clan: 'Ventrue' }),
      ],
      builds: [{ kind: 'unreadable' as const, id: '0003' }],
    });

    test.each([
      ['newest', ['0004', '0003', '0002', '0001']],
      ['oldest', ['0001', '0002', '0003', '0004']],
    ] as const)('sits at its creation position under %s', (order, ids) => {
      expect(view(broken, { ...INITIAL_FILTER, order }).shown.map((entry) => entry.id)).toEqual(ids);
    });

    test.each([
      ['name', ['Unreadable zzz', 'Zed', '0002', '0003']],
      ['clan', ['Zed', 'Unreadable zzz', '0002', '0003']],
    ] as const)('comes last under %s, after every readable entry, oldest first', (order, names) => {
      expect(listed(order, broken)).toEqual(names);
    });
  });

  test('sorts after filtering', () => {
    expect(listed('name', stored, { search: 'an' })).toEqual(['anatole', 'Beckett']);
  });

  test('leaves the entries it is given as they were', () => {
    const given = Object.freeze([...stored]);
    expect(() => view(given, { ...INITIAL_FILTER, order: 'name' })).not.toThrow();
    expect(given.map((entry) => entry.id)).toEqual(stored.map((entry) => entry.id));
  });
});
