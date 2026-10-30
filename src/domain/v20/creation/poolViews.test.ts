import { describe, expect, test } from 'vitest';
import type { V20Build } from './build';
import type { TraitReport } from './progress';
import { allotmentStates } from './allotments';
import { PRIORITY_DUPLICATE, PRIORITY_UNIQUE, freebieLimitsOf, rankedView, type RankedGroupView, type RankedScreenView } from './poolViews';
import { creationFloor, rating } from './ratings';
import { abilitiesRanked, attributesRanked, clan, completeBuild, creation, freebie, fresh, play, rank } from './testing/play';
import { setRank, setRating } from './updates';

const PRONOUN =
  /\b(?:i|me|my|mine|myself|we|us|our|ours|ourselves|you|your|yours|yourself|he|him|his|himself|she|her|hers|herself|it|its|itself|they|them|their|theirs|themselves|who|whom|whose|which|that|this|these|those)\b/i;

const attributes = (build: V20Build) => rankedView(build, 'attributes');
const abilities = (build: V20Build) => rankedView(build, 'abilities');
const group = (view: RankedScreenView, key: string): RankedGroupView => view.groups.find((entry) => entry.key === key)!;

/** Social primary with `placed` of its 7 dots on Charisma and Manipulation. */
const socialPrimary = (placed: number): V20Build =>
  play(
    fresh(),
    rank('social', 'primary'),
    creation('attribute:charisma', 1 + Math.min(placed, 4)),
    ...(placed > 4 ? [creation('attribute:manipulation', 1 + placed - 4)] : []),
  );

describe('the priority select', () => {
  test('offers every rank with its dots, for every group, whoever holds a rank', () => {
    const view = attributes(play(fresh(), ...attributesRanked));
    expect(view.options.map((option) => option.text)).toEqual(['Primary · 7 dots', 'Secondary · 5 dots', 'Tertiary · 3 dots']);
    expect(abilities(fresh()).options.map((option) => [option.rank, option.dots])).toEqual([
      ['primary', 13],
      ['secondary', 9],
      ['tertiary', 5],
    ]);
  });

  test('says the order is unique while no rank is held twice, and nothing before any is held', () => {
    expect(attributes(fresh()).priority).toEqual({ unique: false, text: '' });
    expect(attributes(play(fresh(), rank('social', 'primary'))).priority).toEqual({ unique: true, text: PRIORITY_UNIQUE });
    expect(abilities(play(fresh(), ...abilitiesRanked)).priority.text).toBe('Priority order is unique');
  });

  test('stays unique after a swap in either allotment', () => {
    const swapped = play(fresh(), ...attributesRanked, ...abilitiesRanked, rank('social', 'primary'), rank('knowledges', 'primary'));
    expect(attributes(swapped).priority.unique).toBe(true);
    expect(abilities(swapped).priority.unique).toBe(true);
    expect(group(attributes(swapped), 'physical').rank).toBe('secondary');
    expect(group(abilities(swapped), 'talents').rank).toBe('tertiary');
  });

  test('says a rank is held twice, so an invalid order is never signalled by absence', () => {
    const stored: V20Build = { ...fresh(), ranks: { ...fresh().ranks, physical: 'primary', social: 'primary' } };
    expect(attributes(stored).priority).toEqual({ unique: false, text: PRIORITY_DUPLICATE });
    expect(PRIORITY_DUPLICATE).toBe('Priority order is not unique · Give each group a different rank');
  });

  test('the duplicate message names no one and uses no pronoun', () => {
    expect(PRIORITY_DUPLICATE).not.toMatch(PRONOUN);
  });
});

describe('the pool meter', () => {
  test('an unranked group is not allocated', () => {
    const pool = group(attributes(fresh()), 'social').pool;
    expect(pool).toMatchObject({ state: 'unranked', segments: [], remainingText: 'Not allocated', spentText: 'Rank the group to place dots', announcement: 'Social: Not allocated' });
  });

  test('a group with dots to place reads remaining and allocation needed', () => {
    const pool = group(attributes(socialPrimary(4)), 'social').pool;
    expect(pool).toMatchObject({
      state: 'open',
      placed: 4,
      total: 7,
      remainingText: '3 remaining',
      spentText: '4 / 7 spent · Allocation needed',
      announcement: 'Social: 3 remaining',
    });
    expect(pool.segments).toEqual(['placed', 'placed', 'placed', 'placed', 'open', 'open', 'open']);
  });

  test('a ranked group with nothing placed has every dot open', () => {
    const pool = group(attributes(play(fresh(), rank('mental', 'tertiary'))), 'mental').pool;
    expect(pool).toMatchObject({ remainingText: '3 remaining', spentText: '0 / 3 spent · Allocation needed' });
    expect(pool.segments).toEqual(['open', 'open', 'open']);
  });

  test('a fully placed group is complete', () => {
    const pool = group(attributes(socialPrimary(7)), 'social').pool;
    expect(pool).toMatchObject({ state: 'complete', remainingText: '0 remaining', spentText: '7 / 7 spent · Complete', announcement: 'Social: Complete' });
    expect(pool.segments).toEqual(Array(7).fill('placed'));
  });

  test('the Abilities pools are 13, 9 and 5 with every ability at 0', () => {
    const view = abilities(play(fresh(), rank('knowledges', 'primary'), rank('skills', 'secondary'), rank('talents', 'tertiary')));
    expect(view.groups.map((entry) => [entry.key, entry.pool.remainingText])).toEqual([
      ['talents', '5 remaining'],
      ['skills', '9 remaining'],
      ['knowledges', '13 remaining'],
    ]);
    const rows = view.groups.flatMap((entry) => entry.rows);
    expect(rows).toHaveLength(30);
    expect(rows.map((row) => row.rating)).toEqual(Array(30).fill(0));
  });

  test('re-ranking keeps the dots, so the group reads overspent with extra segments', () => {
    const build = play(socialPrimary(7), rank('social', 'secondary'));
    const pool = group(attributes(build), 'social').pool;
    expect(pool).toMatchObject({ state: 'overspent', remainingText: 'Overspent by 2', spentText: '7 / 5 spent · Allocation needed', announcement: 'Social: Overspent by 2' });
    expect(pool.segments).toEqual([...Array(5).fill('placed'), 'over', 'over']);
    expect(rating(build, 'attribute:charisma')).toBe(5);
  });

  test('a tertiary group holding 7 dots is overspent by 4', () => {
    const build = play(socialPrimary(7), rank('social', 'tertiary'));
    expect(group(attributes(build), 'social').pool.remainingText).toBe('Overspent by 4');
  });

  test('a group left unranked by a swap while holding dots is overspent by all of them', () => {
    const build = play(fresh(), rank('physical', 'primary'), creation('attribute:strength', 4), rank('social', 'primary'));
    expect(group(attributes(build), 'physical').pool).toMatchObject({ state: 'overspent', remainingText: 'Overspent by 3' });
  });

  test('an unranked group still holding dots says to rank it, with the dots it holds', () => {
    const build = play(fresh(), rank('physical', 'primary'), creation('attribute:strength', 4), rank('social', 'primary'));
    const pool = group(attributes(build), 'physical').pool;
    expect(pool).toMatchObject({ state: 'overspent', placed: 3, total: 0, spentText: 'Rank the group to place dots · 3 dots held' });
    expect(pool.segments).toEqual(['over', 'over', 'over']);
    const single = play(fresh(), rank('physical', 'primary'), creation('attribute:strength', 2), rank('social', 'primary'));
    expect(group(attributes(single), 'physical').pool.spentText).toBe('Rank the group to place dots · 1 dot held');
  });

  test('matches allotmentStates for every group of a complete build', () => {
    const build = completeBuild();
    const reported = [...attributes(build).groups, ...abilities(build).groups];
    for (const state of allotmentStates(build).filter((entry) => entry.kind === 'ranked')) {
      expect(reported.find((entry) => entry.key === state.key)!.pool).toMatchObject({ placed: state.placed, total: state.dots });
    }
    expect(reported.every((entry) => entry.pool.state === 'complete' && entry.callout === null)).toBe(true);
  });
});

describe('the plus limits and the callout', () => {
  test('a group not fully placed raises a callout naming the group, the counts and the traits', () => {
    const build = play(fresh(), rank('physical', 'tertiary'), creation('attribute:strength', 3));
    const callout = group(attributes(build), 'physical').callout!;
    expect(callout).toEqual({
      heading: 'Finish Physical before moving on',
      summary: '2 of 3 additional Physical dots are placed and 1 remains',
      traits: ['Strength', 'Dexterity', 'Stamina'],
      traitsText: 'Dots can go on Strength, Dexterity and Stamina.',
    });
  });

  test('uses the plural for more than one dot remaining', () => {
    const build = play(fresh(), rank('physical', 'tertiary'));
    expect(group(attributes(build), 'physical').callout!.summary).toBe('0 of 3 additional Physical dots are placed and 3 remain');
  });

  test('no callout while unranked, complete or overspent', () => {
    expect(group(attributes(fresh()), 'social').callout).toBeNull();
    expect(group(attributes(socialPrimary(7)), 'social').callout).toBeNull();
    expect(group(attributes(play(socialPrimary(7), rank('social', 'tertiary'))), 'social').callout).toBeNull();
  });

  test('a Skills callout counts Skill dots and leaves out Crafts at 3', () => {
    const build = play(fresh(), rank('skills', 'tertiary'), creation('ability:crafts', 3), creation('ability:drive', 1));
    const callout = group(abilities(build), 'skills').callout!;
    expect(callout.summary).toBe('4 of 5 Skill dots are placed and 1 remains');
    expect(callout.traits).toHaveLength(9);
    expect(callout.traits).not.toContain('Crafts');
    expect(callout.traits).toContain('Drive');
  });

  test('a Nosferatu callout leaves out Appearance, which is fixed', () => {
    const build = play(fresh(), clan('Nosferatu'), rank('social', 'primary'));
    const view = group(attributes(build), 'social');
    expect(view.callout!.traits).toEqual(['Charisma', 'Manipulation']);
    expect(view.rows.find((row) => row.ref === 'attribute:appearance')).toMatchObject({ canRaise: false, limit: 'Fixed for Nosferatu', max: 0 });
  });

  test('an Attribute at the generation maximum stays out of the callout', () => {
    const build = play(fresh(), rank('physical', 'primary'), creation('attribute:strength', 5));
    const view = group(attributes(build), 'physical');
    expect(view.rows[0]).toMatchObject({ max: 5, canRaise: false, limit: 'Maximum 5' });
    expect(view.callout!.traits).toEqual(['Dexterity', 'Stamina']);
  });

  test('an Ability at 3 is at its maximum even though the generation allows more', () => {
    const build = play(fresh(), rank('skills', 'secondary'), creation('ability:crafts', 3));
    expect(group(abilities(build), 'skills').rows.find((row) => row.ref === 'ability:crafts')).toMatchObject({ max: 3, canRaise: false, limit: 'Maximum 3' });
  });

  test('a group with no dots left has every plus unavailable, with the reason', () => {
    const rows = group(attributes(socialPrimary(7)), 'social').rows;
    expect(rows.filter((row) => row.limit === 'No dots left in Social').length).toBeGreaterThan(0);
    expect(rows.some((row) => row.canRaise)).toBe(false);
  });

  test('an unranked group says to rank it first', () => {
    const rows = group(attributes(fresh()), 'mental').rows;
    expect(rows.every((row) => !row.canRaise && row.limit === 'Rank Mental first')).toBe(true);
  });

  const builds: [string, V20Build][] = [
    ['fresh', fresh()],
    ['ranked', play(fresh(), ...attributesRanked, ...abilitiesRanked)],
    ['mid-way', play(fresh(), ...attributesRanked, ...abilitiesRanked, creation('attribute:strength', 5), creation('ability:crafts', 3), creation('ability:law', 2))],
    ['overspent', play(socialPrimary(7), rank('social', 'tertiary'))],
    ['Nosferatu', play(fresh(), clan('Nosferatu'), ...attributesRanked)],
    ['complete', completeBuild('Nosferatu')],
    ['freebie dots', play(fresh(), ...attributesRanked, ...abilitiesRanked, creation('attribute:strength', 2), freebie('attribute:strength', 3), freebie('attribute:dexterity', 2), freebie('ability:law', 1))],
  ];

  test('a row states its rating, so the page never reads one', () => {
    const build = play(fresh(), clan('Nosferatu'), ...attributesRanked, creation('attribute:strength', 3));
    const rows = attributes(build).groups.flatMap((entry) => entry.rows);
    for (const row of rows) expect(row.rating, row.ref).toBe(rating(build, row.ref));
    expect(rows.find((row) => row.ref === 'attribute:strength')!.rating).toBe(3);
    expect(rows.find((row) => row.ref === 'attribute:appearance')!.rating).toBe(0);
  });

  test('a minus says why it cannot act: free dot, nothing to lower, fixed, or freebie dots', () => {
    const build = play(fresh(), clan('Nosferatu'), ...attributesRanked, ...abilitiesRanked, creation('attribute:strength', 3), creation('ability:law', 2), freebie('attribute:dexterity', 2));
    const row = (view: RankedScreenView, ref: string) => view.groups.flatMap((entry) => entry.rows).find((entry) => entry.ref === ref)!;
    expect(row(attributes(build), 'attribute:strength')).toMatchObject({ canLower: true, lowerLimit: null });
    expect(row(attributes(build), 'attribute:stamina')).toMatchObject({ canLower: false, lowerLimit: 'Minimum 1, free dot' });
    expect(row(attributes(build), 'attribute:appearance')).toMatchObject({ canLower: false, lowerLimit: 'Fixed for Nosferatu' });
    expect(row(attributes(build), 'attribute:dexterity')).toMatchObject({ canLower: false, lowerLimit: 'Minimum 2, freebie dots are removed on Finishing touches' });
    expect(row(abilities(build), 'ability:law')).toMatchObject({ canLower: true, lowerLimit: null });
    expect(row(abilities(build), 'ability:crafts')).toMatchObject({ canLower: false, lowerLimit: 'Minimum 0' });
  });

  test.each(builds)('a minus is available exactly when the build would lower the dot (%s)', (_name, build) => {
    for (const view of [attributes(build), abilities(build)]) {
      for (const row of view.groups.flatMap((entry) => entry.rows)) {
        const applied = setRating(build, row.ref, rating(build, row.ref) - 1, 'creation').status === 'applied';
        expect(row.canLower, row.ref).toBe(applied);
        expect(row.lowerLimit === null, row.ref).toBe(row.canLower);
      }
    }
  });

  test.each(builds)('a row\'s min is the lowest rating the build lets creation dots reach (%s)', (_name, build) => {
    for (const view of [attributes(build), abilities(build)]) {
      for (const row of view.groups.flatMap((entry) => entry.rows)) {
        const now = rating(build, row.ref);
        const reachable = Array.from({ length: now + 1 }, (_, target) => target).filter(
          (target) => target === now || setRating(build, row.ref, target, 'creation').status === 'applied',
        );
        expect(row.min, row.ref).toBe(Math.min(...reachable));
        expect(row.min, row.ref).toBe(creationFloor(build, row.ref));
      }
    }
  });

  test.each(builds)('a plus is available exactly when the build would place the dot (%s)', (_name, build) => {
    for (const view of [attributes(build), abilities(build)]) {
      for (const row of view.groups.flatMap((entry) => entry.rows)) {
        const applied = setRating(build, row.ref, rating(build, row.ref) + 1, 'creation').status === 'applied';
        expect(row.canRaise, row.ref).toBe(applied);
        expect(row.limit === null, row.ref).toBe(row.canRaise);
      }
    }
  });
});

describe('the summary and the copy', () => {
  test('names the strongest and the tertiary category', () => {
    const build = play(fresh(), rank('social', 'primary'), rank('mental', 'secondary'), rank('physical', 'tertiary'));
    expect(attributes(build).summary).toEqual(['Strongest: Social', 'Tertiary: Physical']);
  });

  test('says only what is ranked, and when nothing is', () => {
    expect(attributes(play(fresh(), rank('mental', 'primary'))).summary).toEqual(['Strongest: Mental']);
    expect(attributes(fresh()).summary).toEqual(['No priorities set yet.']);
  });

  test('a lone Secondary is still said, so a ranked build never reads as having no priorities', () => {
    expect(attributes(play(fresh(), rank('mental', 'secondary'))).summary).toEqual(['Secondary: Mental']);
    const tied: V20Build = { ...fresh(), ranks: { ...fresh().ranks, talents: 'secondary', skills: 'secondary' } };
    expect(abilities(tied).summary).toEqual(['Secondary: Talents and Skills']);
  });

  test('names every group on a tie', () => {
    const stored: V20Build = { ...fresh(), ranks: { ...fresh().ranks, physical: 'primary', social: 'primary', mental: 'tertiary' } };
    expect(attributes(stored).summary).toEqual(['Strongest: Physical and Social', 'Tertiary: Mental']);
  });

  test('the Attributes card states the automatic dot, the Abilities card the cap', () => {
    expect(attributes(fresh()).intro).toBe('Dot counts include 1 automatic dot in each trait.');
    expect(abilities(fresh()).intro).toBe('Every Ability starts at 0 and stops at 3 before freebie points.');
  });

  test('each Abilities group states the cap as its tag and no Attributes group has one', () => {
    expect(abilities(fresh()).groups.map((entry) => [entry.key, entry.tag])).toEqual([
      ['talents', 'All ratings 0–3'],
      ['skills', 'All ratings 0–3'],
      ['knowledges', 'All ratings 0–3'],
    ]);
    expect(attributes(fresh()).groups.map((entry) => entry.tag)).toEqual([null, null, null]);
  });

  test('every Attribute of a Toreador build shows at least one dot once ranked', () => {
    const build = play(fresh(), clan('Toreador'), ...attributesRanked);
    for (const row of attributes(build).groups.flatMap((entry) => entry.rows)) expect(rating(build, row.ref)).toBeGreaterThanOrEqual(1);
  });

  test('no line in any state uses the character name or a pronoun', () => {
    const named = play(fresh(), (build) => ({ status: 'applied', build: { ...build, concept: { ...build.concept, name: 'Marcus' } }, notices: [] }));
    const states = [
      fresh(),
      named,
      play(named, ...attributesRanked, ...abilitiesRanked, creation('attribute:strength', 3), creation('ability:crafts', 3)),
      play(named, clan('Nosferatu'), rank('social', 'primary')),
      play(socialPrimary(7), rank('social', 'tertiary')),
      completeBuild(),
      setRank(play(named, ...attributesRanked), 'mental', 'primary').build,
      { ...named, ranks: { ...named.ranks, physical: 'primary', social: 'primary' } } as V20Build,
    ];
    for (const build of states) {
      for (const view of [attributes(build), abilities(build)]) {
        const lines = [
          view.intro,
          view.priority.text,
          ...view.options.map((option) => option.text),
          ...view.summary,
          ...view.groups.flatMap((entry) => [
            entry.pool.remainingText,
            entry.pool.spentText,
            entry.pool.announcement,
            entry.tag ?? '',
            entry.callout?.heading ?? '',
            entry.callout?.summary ?? '',
            entry.callout?.traitsText ?? '',
            ...entry.rows.flatMap((row) => [row.limit ?? '', row.lowerLimit ?? '']),
          ]),
        ];
        for (const line of lines) {
          expect(line, line).not.toMatch(PRONOUN);
          expect(line, line).not.toContain('Marcus');
        }
      }
    }
  });
});

describe('freebieLimitsOf', () => {
  const trait = (overrides: Partial<TraitReport> = {}): TraitReport => ({
    ref: 'attribute:strength',
    label: 'Strength',
    rating: 3,
    creationRating: 2,
    freebieDots: 0,
    max: 5,
    floor: 1,
    locked: false,
    valueText: '3 of 5',
    ...overrides,
  });

  test('lets a rating between its floor and top go either way, with nothing to explain', () => {
    expect(freebieLimitsOf(trait(), 'Brujah')).toEqual({ min: 1, max: 5, canRaise: true, limit: null, canLower: true, lowerLimit: null });
  });

  test('stops the plus at the top and the minus at the floor, each with its words', () => {
    expect(freebieLimitsOf(trait({ rating: 5 }), 'Brujah')).toMatchObject({ canRaise: false, limit: 'Maximum 5', canLower: true });
    expect(freebieLimitsOf(trait({ rating: 1 }), 'Brujah')).toMatchObject({ canLower: false, lowerLimit: 'Minimum 1, free dot' });
    expect(freebieLimitsOf(trait({ rating: 5, floor: 5 }), 'Brujah')).toMatchObject({ lowerLimit: 'Minimum 5, free dots' });
    expect(freebieLimitsOf(trait({ rating: 0, floor: 0 }), 'Brujah').lowerLimit).toBe('Minimum 0');
  });

  test('says the Virtues hold Humanity and Willpower at their floor', () => {
    const humanity = trait({ ref: 'humanity', label: 'Humanity', rating: 4, floor: 4 });
    const willpower = trait({ ref: 'willpower', label: 'Willpower', rating: 2, floor: 2 });
    expect(freebieLimitsOf(humanity, 'Brujah').lowerLimit).toBe('Minimum 4, from Virtues');
    expect(freebieLimitsOf(willpower, 'Brujah').lowerLimit).toBe('Minimum 2, from Virtues');
  });

  test('fixes a trait the clan fixes, for both buttons', () => {
    const locked = trait({ rating: 0, floor: 0, max: 0, locked: true });
    expect(freebieLimitsOf(locked, 'Nosferatu')).toEqual({
      min: 0,
      max: 0,
      canRaise: false,
      limit: 'Fixed for Nosferatu',
      canLower: false,
      lowerLimit: 'Fixed for Nosferatu',
    });
  });
});
