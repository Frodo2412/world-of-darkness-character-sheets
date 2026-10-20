import { describe, expect, test } from 'vitest';
import {
  SIX_IS_THE_MOST,
  VIRTUES_DERIVATION,
  advantagesView,
  backgroundLabel,
  backgroundsView,
  disciplinesView,
  pressBackground,
  reconcilePicked,
  selectedBackgrounds,
  virtuesView,
  type BackgroundsView,
} from './advantageViews';
import type { V20Build } from './build';
import { rating } from './ratings';
import { BACKGROUNDS, CLANS, type BackgroundName } from './rules';
import { gateReason } from './screens';
import { DISCIPLINES_NEED_CLAN } from './wording';
import { addCreationDiscipline, buyDiscipline, clan, creation, extra, freebie, fresh, generation, play } from './testing/play';
import { setRating } from './updates';

const PRONOUN =
  /\b(?:i|me|my|mine|myself|we|us|our|ours|ourselves|you|your|yours|yourself|he|him|his|himself|she|her|hers|herself|it|its|itself|they|them|their|theirs|themselves|who|whom|whose|which|that|this|these|those)\b/i;

const NONE: ReadonlySet<BackgroundName> = new Set();
const picks = (...names: BackgroundName[]): ReadonlySet<BackgroundName> => new Set(names);
const backgrounds = (build: V20Build, picked = NONE, query = ''): BackgroundsView => backgroundsView(build, picked, query);
const chipNames = (view: BackgroundsView): string[] => view.chips.map((chip) => chip.name);
const rowOf = (view: BackgroundsView, name: string) => view.rows.find((row) => row.name === name)!;

/** Five Backgrounds each holding a dot, so the sixth takes the last place. */
const fiveHeld = (): V20Build =>
  play(
    fresh(),
    creation('background:Allies', 1),
    creation('background:Contacts', 1),
    creation('background:Herd', 1),
    creation('background:Mentor', 1),
    creation('background:Resources', 1),
  );

describe('the Disciplines card', () => {
  test.each(CLANS.filter((entry) => entry.name !== 'Caitiff'))('$name lists exactly its three Disciplines with a pool of 3', ({ name, disciplines }) => {
    const view = disciplinesView(play(fresh(), clan(name)));
    expect(view.rows.map((row) => row.ref)).toEqual(disciplines.map((discipline) => `discipline:${discipline}`));
    expect(view.rows.every((row) => !row.removable)).toBe(true);
    expect(view.pool).toMatchObject({ state: 'open', remainingText: '3 remaining', total: 3 });
    expect(view.gate).toBeNull();
    expect(view.canAdd).toBe(false);
    expect(view.line).toBe("Three dots across the clan's Disciplines.");
  });

  test('a Toreador has Auspex, Celerity and Presence, each from 0 up to the generation maximum', () => {
    const view = disciplinesView(play(fresh(), clan('Toreador')));
    expect(view.rows.map((row) => [row.label, row.rating, row.min, row.max, row.canRaise])).toEqual([
      ['Auspex', 0, 0, 5, true],
      ['Celerity', 0, 0, 5, true],
      ['Presence', 0, 0, 5, true],
    ]);
  });

  test('no clan has no rows and the same reason Continue gives, with the screen that fixes it', () => {
    const view = disciplinesView(fresh());
    expect(view.rows).toEqual([]);
    expect(view.gate).toEqual({ text: 'Choose a clan to place Discipline dots', goTo: 'clan' });
    expect(view.gate!.text).toBe(DISCIPLINES_NEED_CLAN);
    expect(view.gate).toEqual(gateReason(fresh(), 'advantages'));
    expect(view.canAdd).toBe(false);
    expect(view.line).toBe('Disciplines appear once a clan is chosen.');
  });

  test('a Caitiff has no row until one is added, and may then place dots on any Discipline', () => {
    const caitiff = play(fresh(), clan('Caitiff'));
    expect(disciplinesView(caitiff)).toMatchObject({ rows: [], canAdd: true, gate: null, line: 'Caitiff may place three dots on any Discipline.' });
    const placed = play(caitiff, addCreationDiscipline('Vicissitude'), creation('discipline:Vicissitude', 3));
    const view = disciplinesView(placed);
    expect(view.rows).toHaveLength(1);
    expect(view.rows[0]).toMatchObject({ ref: 'discipline:Vicissitude', label: 'Vicissitude', rating: 3, removable: true });
    expect(view.pool).toMatchObject({ state: 'complete', spentText: '3 / 3 spent · Complete', announcement: 'Disciplines: Complete' });
  });

  test('every plus is unavailable, with the reason, once the pool is placed', () => {
    const view = disciplinesView(play(fresh(), clan('Brujah'), creation('discipline:Celerity', 3)));
    expect(view.rows.map((row) => [row.label, row.canRaise, row.limit])).toEqual([
      ['Celerity', false, 'No dots left in Disciplines'],
      ['Potence', false, 'No dots left in Disciplines'],
      ['Presence', false, 'No dots left in Disciplines'],
    ]);
  });

  test('a clan row can be lowered while it holds dots, and at 0 says its minimum', () => {
    const view = disciplinesView(play(fresh(), clan('Brujah'), creation('discipline:Potence', 2)));
    expect(view.rows.find((row) => row.label === 'Potence')).toMatchObject({ rating: 2, canLower: true, lowerLimit: null });
    expect(view.rows.find((row) => row.label === 'Celerity')).toMatchObject({ canLower: false, lowerLimit: 'Minimum 0' });
  });
});

describe('the Backgrounds chips', () => {
  test('are the fourteen Backgrounds in the order of the list, none selected, none unavailable', () => {
    const view = backgrounds(fresh());
    expect(chipNames(view)).toEqual([...BACKGROUNDS]);
    expect(view.chips.every((chip) => !chip.selected && !chip.unavailable)).toBe(true);
    expect(view.rows).toEqual([]);
    expect(view.heading).toBe('All Backgrounds · 14');
    expect(view.selected).toBe('Selected · 0/6');
    expect(view.limit).toBeNull();
  });

  test('show (Sabbat) on Black Hand Membership and Rituals only, as a label: the stored name is unchanged', () => {
    const view = backgrounds(fresh());
    const labels = Object.fromEntries(view.chips.map((chip) => [chip.name, chip.label]));
    expect(labels['Black Hand Membership']).toBe('Black Hand Membership (Sabbat)');
    expect(labels['Rituals']).toBe('Rituals (Sabbat)');
    expect(view.chips.filter((chip) => chip.label !== chip.name).map((chip) => chip.name)).toEqual(['Black Hand Membership', 'Rituals']);
    expect(backgroundLabel('Resources')).toBe('Resources');
  });

  test('a Sabbat row keeps its label on screen and its stored name in the build', () => {
    const build = play(fresh(), creation('background:Rituals', 1));
    const row = rowOf(backgrounds(build), 'Rituals');
    expect(row).toMatchObject({ label: 'Rituals (Sabbat)', name: 'Rituals', ref: 'background:Rituals' });
  });

  test('a chip is selected when the build holds a dot on it or the screen picked it', () => {
    const build = play(fresh(), creation('background:Contacts', 2));
    const view = backgrounds(build, picks('Resources'));
    expect(view.chips.filter((chip) => chip.selected).map((chip) => chip.name)).toEqual(['Contacts', 'Resources']);
    expect(selectedBackgrounds(build, picks('Resources'))).toEqual(['Contacts', 'Resources']);
    expect(view.selected).toBe('Selected · 2/6');
  });

  test('each chosen chip has a row, in the order of the list, and nothing else has', () => {
    const view = backgrounds(play(fresh(), creation('background:Resources', 1)), picks('Contacts', 'Mentor'));
    expect(view.rows.map((row) => [row.name, row.rating])).toEqual([['Contacts', 0], ['Mentor', 0], ['Resources', 1]]);
  });

  test('says where the rows go while none is chosen', () => {
    expect(backgrounds(fresh()).empty).toBe('Choose a chip to add its row.');
    expect(backgrounds(fresh(), picks('Fame')).empty).toBeNull();
    expect(backgrounds(play(fresh(), creation('background:Fame', 1))).empty).toBeNull();
  });

  test('a row at 0 dots can be removed and a row holding dots cannot', () => {
    const view = backgrounds(play(fresh(), creation('background:Resources', 1)), picks('Contacts'));
    expect(rowOf(view, 'Contacts').removable).toBe(true);
    expect(rowOf(view, 'Resources').removable).toBe(false);
  });

  test('a row holding only freebie dots cannot be removed', () => {
    const view = backgrounds(play(fresh(), freebie('background:Fame', 1)));
    expect(rowOf(view, 'Fame')).toMatchObject({ removable: false, rating: 1, min: 1 });
  });
});

describe('the six Backgrounds', () => {
  test('six held rows make every other chip unavailable, with the reason, and leave the six available to clear', () => {
    const build = play(fiveHeld(), freebie('background:Fame', 1));
    const view = backgrounds(build);
    expect(view.chips.filter((chip) => chip.unavailable)).toHaveLength(8);
    expect(view.chips.filter((chip) => chip.selected).every((chip) => !chip.unavailable)).toBe(true);
    expect(view.limit).toBe('Six is the most');
    expect(view.limit).toBe(SIX_IS_THE_MOST);
    expect(view.selected).toBe('Selected · 6/6');
  });

  test('five held and a sixth picked at 0 dots count as six', () => {
    const view = backgrounds(fiveHeld(), picks('Fame'));
    expect(view.chips.filter((chip) => chip.unavailable)).toHaveLength(8);
    expect(view.limit).toBe('Six is the most');
    expect(view.chips.find((chip) => chip.name === 'Fame')).toMatchObject({ selected: true, unavailable: false });
  });

  test('five held with nothing picked leave a sixth place open', () => {
    const view = backgrounds(fiveHeld());
    expect(view.chips.some((chip) => chip.unavailable)).toBe(false);
    expect(view.limit).toBeNull();
  });

  test('a picked chip that is also held counts once', () => {
    expect(backgrounds(fiveHeld(), picks('Allies')).limit).toBeNull();
  });

  test('pressing an unavailable chip is refused with the reason and nothing else', () => {
    expect(pressBackground(fiveHeld(), picks('Fame'), 'Status')).toEqual({ kind: 'refuse', reason: 'Six is the most' });
  });

  test('pressing a chip with a place left chooses it', () => {
    expect(pressBackground(fiveHeld(), NONE, 'Status')).toEqual({ kind: 'choose' });
    expect(pressBackground(fresh(), NONE, 'Status')).toEqual({ kind: 'choose' });
  });
});

describe('pressing a chosen chip', () => {
  test('clears a picked chip at 0 dots', () => {
    expect(pressBackground(fresh(), picks('Resources'), 'Resources')).toEqual({ kind: 'clear' });
  });

  test('is refused while the build holds creation dots, naming what to lower', () => {
    const build = play(fresh(), creation('background:Contacts', 2));
    expect(pressBackground(build, NONE, 'Contacts')).toEqual({ kind: 'refuse', reason: 'Lower Contacts to 0 first.' });
  });

  test('sends freebie dots to Finishing touches', () => {
    const build = play(fresh(), freebie('background:Contacts', 1));
    expect(pressBackground(build, NONE, 'Contacts')).toEqual({
      kind: 'refuse',
      reason: 'Remove the freebie dots of Contacts on Finishing touches first.',
      step: 'finishing',
    });
  });

  test('clears the picked chip that holds no dots, even while five other Backgrounds are held', () => {
    expect(pressBackground(fiveHeld(), picks('Fame'), 'Fame')).toEqual({ kind: 'clear' });
  });

  test('names a Sabbat Background as the row and the chip show it', () => {
    const creationDots = play(fresh(), creation('background:Rituals', 1));
    expect(pressBackground(creationDots, NONE, 'Rituals')).toEqual({ kind: 'refuse', reason: 'Lower Rituals (Sabbat) to 0 first.' });
    const freebieDots = play(fresh(), freebie('background:Black Hand Membership', 1));
    expect(pressBackground(freebieDots, NONE, 'Black Hand Membership')).toEqual({
      kind: 'refuse',
      reason: 'Remove the freebie dots of Black Hand Membership (Sabbat) on Finishing touches first.',
      step: 'finishing',
    });
  });
});

describe('the chips the screen keeps chosen', () => {
  const all = (names: ReadonlySet<BackgroundName>) => [...names];

  test('adds a Background the build holds a dot on', () => {
    const build = play(fresh(), creation('background:Contacts', 2));
    expect(all(reconcilePicked(build, picks('Resources')))).toEqual(['Resources', 'Contacts']);
  });

  test('keeps every chip chosen at 0 dots while held and chosen stay within six', () => {
    const build = fiveHeld();
    expect(all(reconcilePicked(build, picks('Allies')))).toEqual(['Allies', 'Contacts', 'Herd', 'Mentor', 'Resources']);
    expect(all(reconcilePicked(fresh(), picks('Fame', 'Status', 'Domain', 'Herd', 'Mentor', 'Allies')))).toHaveLength(6);
  });

  test('drops the empty chips that no longer fit once the build holds a dot on one more, earliest chosen kept', () => {
    // Six chips chosen at 0 dots, then a freebie dot is bought on a seventh Background.
    const chosen = picks('Allies', 'Contacts', 'Domain', 'Fame', 'Herd', 'Mentor');
    const build = play(fresh(), freebie('background:Status', 1));
    const kept = reconcilePicked(build, chosen);
    expect(all(kept)).toEqual(['Allies', 'Contacts', 'Domain', 'Fame', 'Herd', 'Status']);
    expect(backgrounds(build, kept).selected).toBe('Selected · 6/6');
  });

  test('never drops a Background the build holds a dot on', () => {
    const build = play(fiveHeld(), freebie('background:Status', 1));
    const kept = reconcilePicked(build, picks('Domain', 'Fame', 'Allies'));
    expect(all(kept).sort()).toEqual(['Allies', 'Contacts', 'Herd', 'Mentor', 'Resources', 'Status']);
  });

  test('leaves a stored build holding more than six as it is', () => {
    const six = play(fiveHeld(), freebie('background:Status', 1));
    const build: V20Build = { ...six, traits: { ...six.traits, 'background:Fame': { ...six.traits['background:Fame'], freebie: 1 } } };
    expect(all(reconcilePicked(build, picks('Domain')))).toHaveLength(7);
  });
});

describe('searching the Backgrounds', () => {
  test('"re" keeps only Resources and Retainers', () => {
    const view = backgrounds(fresh(), NONE, 're');
    expect(chipNames(view)).toEqual(['Resources', 'Retainers']);
    expect(view.heading).toBe('All Backgrounds · 2');
    expect(view.results).toBe('2 Backgrounds listed');
  });

  test('ignores case and the space around the query', () => {
    expect(chipNames(backgrounds(fresh(), NONE, '  CONTACTS '))).toEqual(['Contacts']);
    expect(backgrounds(fresh(), NONE, 'Contacts').results).toBe('1 Background listed');
  });

  test('says nothing matches, naming the query', () => {
    const view = backgrounds(fresh(), NONE, ' zzz ');
    expect(view.chips).toEqual([]);
    expect(view.results).toBe('No Background matches "zzz".');
    expect(view.heading).toBe('All Backgrounds · 0');
  });

  test('finds a Sabbat Background by the label it is shown with', () => {
    expect(chipNames(backgrounds(fresh(), NONE, 'sabbat'))).toEqual(['Black Hand Membership', 'Rituals']);
  });

  test('keeps the state of a chip that is listed and the rows of chips that are not', () => {
    const build = play(fresh(), creation('background:Contacts', 2));
    const view = backgrounds(build, picks('Resources'), 're');
    expect(view.chips.find((chip) => chip.name === 'Resources')).toMatchObject({ selected: true });
    expect(view.rows.map((row) => row.name)).toEqual(['Contacts', 'Resources']);
  });

  test('a blank query lists all fourteen', () => {
    expect(backgrounds(fresh(), NONE, '   ').chips).toHaveLength(14);
    expect(backgrounds(fresh()).results).toBe('14 Backgrounds listed');
  });

  test('the unavailable state follows the six chosen, not the search', () => {
    const view = backgrounds(play(fiveHeld(), freebie('background:Fame', 1)), NONE, 're');
    expect(view.chips.map((chip) => [chip.name, chip.unavailable])).toEqual([['Resources', false], ['Retainers', true]]);
  });
});

describe('the Backgrounds pool and plus limits', () => {
  test('a new build has 5 dots to place and every plus available', () => {
    const view = backgrounds(fresh(), picks('Resources'));
    expect(view.pool).toMatchObject({ state: 'open', remainingText: '5 remaining', spentText: '0 / 5 spent · Allocation needed' });
    expect(rowOf(view, 'Resources')).toMatchObject({ canRaise: true, limit: null, canLower: false, lowerLimit: 'Minimum 0' });
  });

  test('once placed, the pool is complete and every plus is unavailable with the reason', () => {
    const build = play(fresh(), creation('background:Resources', 3), creation('background:Herd', 2));
    const view = backgrounds(build, picks('Fame'));
    expect(view.pool).toMatchObject({ state: 'complete', spentText: '5 / 5 spent · Complete', announcement: 'Backgrounds: Complete' });
    expect(view.rows.map((row) => [row.name, row.canRaise, row.limit])).toEqual([
      ['Fame', false, 'No dots left in Backgrounds'],
      ['Herd', false, 'No dots left in Backgrounds'],
      ['Resources', false, 'No dots left in Backgrounds'],
    ]);
  });

  test('a row reaches the generation maximum, not the Abilities cap of 3', () => {
    const build = play(fresh(), creation('background:Resources', 5));
    expect(rowOf(backgrounds(build), 'Resources')).toMatchObject({ rating: 5, max: 5, canRaise: false, limit: 'Maximum 5' });
    expect(rowOf(backgrounds(play(fresh(), creation('background:Resources', 4)), NONE), 'Resources')).toMatchObject({ max: 5 });
  });

  test('a freebie dot sets the row floor and says where it is removed', () => {
    const view = backgrounds(play(fresh(), freebie('background:Fame', 2)));
    expect(rowOf(view, 'Fame')).toMatchObject({ min: 2, canLower: false, lowerLimit: 'Minimum 2, freebie dots are removed on Finishing touches' });
  });
});

describe('the Generation Background', () => {
  const top = (base: number) => rowOf(backgrounds(play(fresh(), generation(base)), picks('Generation')), 'Generation');

  test.each([
    [13, 5],
    [10, 5],
    [9, 5],
    [8, 4],
    [6, 2],
    [5, 1],
    [4, 0],
  ])('at base %ith generation it reaches %i dots', (base, max) => {
    expect(top(base).max).toBe(max);
  });

  test('at its top the plus is unavailable and says why, in words that name the best generation', () => {
    const build = play(fresh(), generation(6), creation('background:Generation', 2));
    expect(rowOf(backgrounds(build), 'Generation')).toMatchObject({ rating: 2, max: 2, canRaise: false, limit: 'Maximum 2, 4th generation is the best' });
  });

  test('a 4th generation base offers none', () => {
    expect(top(4)).toMatchObject({ canRaise: false, limit: 'Maximum 0, 4th generation is the best' });
  });

  test('below its top the plus is available and says nothing', () => {
    expect(top(6)).toMatchObject({ canRaise: true, limit: null });
  });

  test('a limit that is the pool\'s is not rewritten as the generation\'s', () => {
    const complete = play(fresh(), generation(6), creation('background:Resources', 5));
    expect(rowOf(backgrounds(complete, picks('Generation')), 'Generation').limit).toBe('No dots left in Backgrounds');
  });

  test.each([
    [13, 0],
    [13, 4],
    [13, 5],
    [9, 5],
    [8, 3],
    [8, 4],
    [6, 1],
    [6, 2],
    [5, 0],
    [5, 1],
    [4, 0],
  ])('the plus is available exactly when the build would place the dot (base %i, %i dots)', (base, dots) => {
    const placed = setRating(play(fresh(), generation(base)), 'background:Generation', dots, 'creation');
    // The dots are within what the base allows, so the build holds them.
    expect(placed.status).toBe('applied');
    const row = rowOf(backgrounds(placed.build, picks('Generation')), 'Generation');
    expect(row.canRaise).toBe(setRating(placed.build, 'background:Generation', dots + 1, 'creation').status === 'applied');
  });
});

describe('the plus of every Background row', () => {
  const builds: [string, V20Build][] = [
    ['new', fresh()],
    ['partly placed', play(fresh(), creation('background:Resources', 3), creation('background:Contacts', 1))],
    ['placed', play(fresh(), creation('background:Resources', 3), creation('background:Herd', 2))],
    ['six held', play(fiveHeld(), freebie('background:Fame', 1))],
    ['freebie dots', play(fresh(), freebie('background:Fame', 2), creation('background:Allies', 1))],
    ['6th generation', play(fresh(), generation(6), creation('background:Generation', 2))],
  ];

  test.each(builds)('is available exactly when the build would place the dot (%s)', (_name, build) => {
    const view = backgrounds(build, picks(...BACKGROUNDS.slice(0, 1)));
    for (const row of view.rows) {
      const applied = setRating(build, row.ref, rating(build, row.ref) + 1, 'creation').status === 'applied';
      expect(row.canRaise, row.ref).toBe(applied);
      expect(row.limit === null, row.ref).toBe(row.canRaise);
    }
  });
});

describe('the Virtues card', () => {
  test('each Virtue shows its free dot, with 7 dots to place', () => {
    const view = virtuesView(fresh());
    expect(view.rows.map((row) => [row.label, row.rating, row.min, row.max])).toEqual([
      ['Conscience', 1, 1, 5],
      ['Self-Control', 1, 1, 5],
      ['Courage', 1, 1, 5],
    ]);
    expect(view.pool).toMatchObject({ state: 'open', remainingText: '7 remaining', spentText: '0 / 7 spent · Allocation needed' });
    expect(view.line).toBe('Seven dots over the free dot each Virtue has.');
    expect(view.rows.every((row) => row.canLower === false && row.lowerLimit === 'Minimum 1, free dot')).toBe(true);
  });

  test('with 6 of the 7 placed a callout says 1 dot remains, naming the Virtues that can take it', () => {
    const view = virtuesView(play(fresh(), creation('virtue:conscience', 4), creation('virtue:selfControl', 3)));
    expect(view.callout).toEqual({
      heading: 'Finish Virtues before moving on',
      summary: '5 of 7 additional Virtue dots are placed and 2 remain',
      traits: ['Conscience', 'Self-Control', 'Courage'],
      traitsText: 'Dots can go on Conscience, Self-Control and Courage.',
    });
    const six = virtuesView(play(fresh(), creation('virtue:conscience', 4), creation('virtue:selfControl', 3), creation('virtue:courage', 2)));
    expect(six.callout!.summary).toBe('6 of 7 additional Virtue dots are placed and 1 remains');
  });

  test('no callout once the pool is complete', () => {
    const complete = virtuesView(play(fresh(), creation('virtue:conscience', 4), creation('virtue:selfControl', 3), creation('virtue:courage', 3)));
    expect(complete.callout).toBeNull();
    expect(complete.pool).toMatchObject({ state: 'complete', announcement: 'Virtues: Complete' });
    expect(complete.rows.every((row) => !row.canRaise && row.limit === 'No dots left in Virtues')).toBe(true);
  });

  test('a Virtue stops at 5', () => {
    const view = virtuesView(play(fresh(), creation('virtue:conscience', 5)));
    expect(view.rows[0]).toMatchObject({ rating: 5, canRaise: false, limit: 'Maximum 5' });
  });

  test('states that Humanity and Willpower follow the Virtues', () => {
    expect(virtuesView(fresh()).derivation).toBe('Humanity and Willpower are derived from the Virtues.');
    expect(VIRTUES_DERIVATION).toContain('derived from the Virtues');
  });
});

/** What pressing the Resources chip says when it is refused; empty when it is not. */
function refusal(build: V20Build): string {
  const press = pressBackground(build, picks('Resources'), 'Resources');
  return press.kind === 'refuse' ? press.reason : '';
}

describe('the screen', () => {
  test('puts the three allotments in its intro', () => {
    expect(advantagesView(fresh(), NONE, '').intro).toBe('Place 3 Discipline dots, 5 Background dots and 7 Virtue dots.');
  });

  test('is made of the three cards', () => {
    const view = advantagesView(play(fresh(), clan('Toreador')), picks('Resources'), 're');
    expect(view.disciplines.rows).toHaveLength(3);
    expect(chipNames(view.backgrounds)).toEqual(['Resources', 'Retainers']);
    expect(view.virtues.rows).toHaveLength(3);
  });

  test('no line in any state names the character or uses a pronoun', () => {
    const named: V20Build = { ...fresh(), concept: { ...fresh().concept, name: 'Marcus' } };
    const states: V20Build[] = [
      named,
      play(named, clan('Caitiff')),
      play(named, clan('Toreador'), creation('discipline:Auspex', 3), creation('background:Resources', 5), creation('virtue:conscience', 4)),
      play(named, generation(6), creation('background:Generation', 2), freebie('background:Contacts', 1), clan('Brujah'), extra(30), buyDiscipline('Auspex')),
      play(fiveHeld(), freebie('background:Fame', 1)),
    ];
    for (const build of states) {
      for (const query of ['', 'sabbat', 'zzz']) {
        const view = advantagesView(build, picks('Resources', 'Generation'), query);
        const lines = [
          view.intro,
          view.disciplines.line,
          view.disciplines.gate?.text ?? '',
          view.disciplines.pool.remainingText,
          view.disciplines.pool.spentText,
          view.disciplines.pool.announcement,
          ...view.disciplines.rows.flatMap((row) => [row.limit ?? '', row.lowerLimit ?? '']),
          view.backgrounds.line,
          view.backgrounds.heading,
          view.backgrounds.results,
          view.backgrounds.selected,
          view.backgrounds.limit ?? '',
          view.backgrounds.empty ?? '',
          view.backgrounds.pool.remainingText,
          view.backgrounds.pool.spentText,
          view.backgrounds.pool.announcement,
          ...view.backgrounds.chips.map((chip) => chip.label),
          ...view.backgrounds.rows.flatMap((row) => [row.limit ?? '', row.lowerLimit ?? '']),
          view.virtues.line,
          view.virtues.derivation,
          view.virtues.callout?.heading ?? '',
          view.virtues.callout?.summary ?? '',
          view.virtues.callout?.traitsText ?? '',
          ...view.virtues.rows.flatMap((row) => [row.limit ?? '', row.lowerLimit ?? '']),
          refusal(build),
        ];
        for (const line of lines) {
          expect(line, line).not.toMatch(PRONOUN);
          expect(line, line).not.toContain('Marcus');
        }
      }
    }
  });

  test('every original one-liner is at most 12 words', () => {
    const lines = [
      disciplinesView(fresh()).line,
      disciplinesView(play(fresh(), clan('Brujah'))).line,
      disciplinesView(play(fresh(), clan('Caitiff'))).line,
      backgrounds(fresh()).line,
      backgrounds(fresh()).empty!,
      virtuesView(fresh()).line,
      virtuesView(fresh()).derivation,
      SIX_IS_THE_MOST,
    ];
    for (const line of lines) expect(line.split(/\s+/).length, line).toBeLessThanOrEqual(12);
  });
});
