import { describe, expect, test } from 'vitest';
import { blankBuild, type BuildTraitRef, type V20Build } from './build';
import type { ScreenId } from './rules';
import { gateReason, hint, isComplete, itemsLeft, phaseEyebrow, screenStatus, screenStatuses } from './screens';
import { abilitiesRanked, attributesRanked, clan, completeBuild, creation, fresh, play, rank } from './testing/play';
import { setConceptText } from './updates';

/** `build` with `ref` holding exactly `creationDots` creation dots, whatever the rules would allow. */
function withDots(build: V20Build, ref: Exclude<BuildTraitRef, `discipline:${string}`>, creationDots: number): V20Build {
  const copy = structuredClone(build);
  copy.traits[ref] = { creation: creationDots, freebie: 0 };
  return copy;
}

const named = (name: string): V20Build => play(fresh(), (build) => setConceptText(build, 'name', name));

describe('screenStatuses', () => {
  test('has a status for each of the nine screens, a blank build being To do except Nature & Demeanor, which is Optional', () => {
    expect(screenStatuses(blankBuild('abc'))).toEqual({
      concept: 'To do',
      clan: 'To do',
      natureDemeanor: 'Optional',
      attributes: 'To do',
      abilities: 'To do',
      advantages: 'To do',
      finishing: 'To do',
      review: 'To do',
      summary: 'To do',
    });
  });

  test('marks Attributes Done once every Attribute dot is placed, leaving Abilities To do', () => {
    const build = play(
      fresh(),
      clan('Brujah'),
      ...attributesRanked,
      creation('attribute:strength', 3),
      creation('attribute:dexterity', 3),
      creation('attribute:stamina', 4),
      creation('attribute:charisma', 3),
      creation('attribute:manipulation', 3),
      creation('attribute:appearance', 2),
      creation('attribute:perception', 2),
      creation('attribute:intelligence', 2),
      creation('attribute:wits', 2),
    );
    expect(screenStatuses(build)).toMatchObject({ clan: 'Done', attributes: 'Done', abilities: 'To do', natureDemeanor: 'Optional' });
  });

  test('a finished build has every screen but the Character sheet Done', () => {
    const build = play(completeBuild(), (current) => setConceptText(current, 'name', 'Éloïse Voss'));
    expect(screenStatuses(build)).toMatchObject({
      concept: 'Done',
      clan: 'Done',
      attributes: 'Done',
      abilities: 'Done',
      advantages: 'Done',
      finishing: 'Done',
      review: 'Done',
      summary: 'To do',
    });
  });
});

describe('each screen becomes done by its own rule', () => {
  test.each([
    ['a build named "Éloïse Voss"', named('Éloïse Voss'), 'concept', 'Done'],
    ['a build with no name', fresh(), 'concept', 'To do'],
    ['a build named with spaces only', named('   '), 'concept', 'To do'],
    ['a build with a clan', play(fresh(), clan('Toreador')), 'clan', 'Done'],
    ['a build with no clan', fresh(), 'clan', 'To do'],
    ['a build with Visionary as Nature', play(fresh(), (b) => setConceptText(b, 'nature', 'Visionary')), 'natureDemeanor', 'Done'],
    ['a build with only a Demeanor', play(fresh(), (b) => setConceptText(b, 'demeanor', 'Judge')), 'natureDemeanor', 'Done'],
    ['a build with neither', fresh(), 'natureDemeanor', 'Optional'],
    ['a build with a recorded Blood Pool of 10', completeBuild(), 'finishing', 'Done'],
    ['a build with a recorded Blood Pool of 0', { ...fresh(), bloodPool: 0 }, 'finishing', 'Done'],
    ['a build with no Blood Pool recorded', fresh(), 'finishing', 'To do'],
    ['a build with nothing outstanding', completeBuild(), 'review', 'Done'],
    ['a build with items outstanding', fresh(), 'review', 'To do'],
  ] as [string, V20Build, ScreenId, string][])('%s: %s marks %s %s', (_state, build, screen, status) => {
    expect(screenStatus(build, screen)).toBe(status);
  });

  test('a pool left unplaced, or placed beyond its allotment, keeps its screen To do', () => {
    const complete = completeBuild();
    expect(isComplete(complete, 'attributes')).toBe(true);
    expect(isComplete(withDots(complete, 'attribute:stamina', 2), 'attributes')).toBe(false);
    expect(isComplete(withDots(complete, 'attribute:stamina', 4), 'attributes')).toBe(false);
  });

  test('an unranked group is not placed even though it holds no dots', () => {
    expect(isComplete(fresh(), 'abilities')).toBe(false);
    expect(isComplete(play(fresh(), ...abilitiesRanked), 'abilities')).toBe(false);
  });

  test('Advantages needs a clan, because the Discipline dots cannot be placed without one', () => {
    const everythingButDisciplines = play(
      fresh(),
      creation('background:Resources', 1),
      creation('background:Contacts', 2),
      creation('background:Allies', 2),
      creation('virtue:conscience', 4),
      creation('virtue:selfControl', 3),
      creation('virtue:courage', 3),
    );
    expect(isComplete(everythingButDisciplines, 'advantages')).toBe(false);
    expect(isComplete(completeBuild(), 'advantages')).toBe(true);
  });

  test('a Caitiff places its Discipline dots on Disciplines of its own choosing', () => {
    expect(isComplete(completeBuild('Caitiff'), 'advantages')).toBe(true);
  });

  test('a Nosferatu is complete with Appearance fixed at nothing to place', () => {
    const build = completeBuild('Nosferatu');
    expect(build.traits['attribute:appearance'].creation).toBe(0);
    expect(isComplete(build, 'attributes')).toBe(true);
  });
});

/** `build` with each listed trait holding exactly the given creation dots. */
function withAll(build: V20Build, dots: [Exclude<BuildTraitRef, `discipline:${string}`>, number][]): V20Build {
  return dots.reduce((current, [ref, count]) => withDots(current, ref, count), build);
}

describe('gateReason', () => {
  const complete = completeBuild();

  describe('Attributes', () => {
    test.each([
      ['1 Physical Attribute dot is unplaced', [['attribute:stamina', 2]], '1 Physical dot remains · Allocate it to continue'],
      ['2 Physical Attribute dots are unplaced', [['attribute:stamina', 1]], '2 Physical dots remain · Allocate them to continue'],
      [
        '2 Physical and 1 Mental Attribute dots are unplaced',
        [
          ['attribute:stamina', 1],
          ['attribute:wits', 0],
        ],
        '2 Physical dots and 1 Mental dot remain · Allocate them to continue',
      ],
      [
        'all three groups hold unplaced dots',
        [
          ['attribute:strength', 0],
          ['attribute:dexterity', 0],
          ['attribute:stamina', 0],
          ['attribute:charisma', 0],
          ['attribute:manipulation', 0],
          ['attribute:appearance', 0],
          ['attribute:perception', 0],
          ['attribute:intelligence', 0],
          ['attribute:wits', 0],
        ],
        '7 Physical dots, 5 Social dots and 3 Mental dots remain · Allocate them to continue',
      ],
      [
        'Social is 4 dots over its allotment',
        [
          ['attribute:charisma', 5],
          ['attribute:manipulation', 4],
          ['attribute:appearance', 0],
        ],
        'Social is 4 dots over · Lower it to continue',
      ],
      [
        'Social is 1 dot over and Mental is 2 dots over',
        [
          ['attribute:charisma', 3],
          ['attribute:manipulation', 3],
          ['attribute:appearance', 0],
          ['attribute:perception', 2],
          ['attribute:intelligence', 2],
          ['attribute:wits', 1],
        ],
        'Social is 1 dot over and Mental is 2 dots over · Lower them to continue',
      ],
    ] as [string, [Exclude<BuildTraitRef, `discipline:${string}`>, number][], string][])('%s', (_unfinished, dots, reason) => {
      expect(gateReason(withAll(complete, dots), 'attributes')).toEqual({ text: reason });
    });

    test('no Attribute group having a priority asks for all three to be ranked', () => {
      expect(gateReason(fresh(), 'attributes')).toEqual({ text: 'Rank Physical, Social and Mental to continue' });
    });

    test('only the groups still without a priority are asked for', () => {
      const build = play(fresh(), rank('physical', 'primary'));
      expect(gateReason(build, 'attributes')).toEqual({ text: 'Rank Social and Mental to continue' });
      expect(gateReason(play(build, rank('social', 'secondary')), 'attributes')).toEqual({ text: 'Rank Mental to continue' });
    });

    test('an unranked group is asked for before dots left in the ranked ones', () => {
      const build = play(fresh(), rank('physical', 'primary'), rank('social', 'secondary'));
      expect(gateReason(build, 'attributes')?.text).toBe('Rank Mental to continue');
    });

    test('an overspent group is asked about before dots left in another', () => {
      const build = withAll(complete, [
        ['attribute:charisma', 5],
        ['attribute:manipulation', 4],
        ['attribute:appearance', 0],
        ['attribute:wits', 0],
      ]);
      expect(gateReason(build, 'attributes')?.text).toBe('Social is 4 dots over · Lower it to continue');
    });

    test('a placed pool has no reason', () => {
      expect(gateReason(complete, 'attributes')).toBeUndefined();
    });

    test('a Nosferatu is not asked to place a Social dot on Appearance', () => {
      const nosferatu = completeBuild('Nosferatu');
      expect(gateReason(nosferatu, 'attributes')).toBeUndefined();
      expect(gateReason(withDots(nosferatu, 'attribute:charisma', 2), 'attributes')).toEqual({
        text: '1 Social dot remains · Allocate it to continue',
      });
    });
  });

  describe('Abilities', () => {
    test('1 Skill dot unplaced is named for the Skills group in the singular', () => {
      expect(gateReason(withDots(complete, 'ability:melee', 2), 'abilities')).toEqual({
        text: '1 Skill dot remains · Allocate it to continue',
      });
    });

    test('several Ability groups aggregate with the plural of each noun', () => {
      const build = withAll(complete, [
        ['ability:brawl', 0],
        ['ability:melee', 2],
        ['ability:computer', 1],
      ]);
      expect(gateReason(build, 'abilities')?.text).toBe(
        '2 Talent dots, 1 Skill dot and 1 Knowledge dot remain · Allocate them to continue',
      );
    });

    test('no Ability group having a priority asks for all three to be ranked', () => {
      expect(gateReason(fresh(), 'abilities')).toEqual({ text: 'Rank Talents, Skills and Knowledges to continue' });
      expect(gateReason(play(fresh(), ...abilitiesRanked), 'abilities')?.text).toBe(
        '13 Talent dots, 9 Skill dots and 5 Knowledge dots remain · Allocate them to continue',
      );
    });

    test('an overspent group uses the group name as it is shown', () => {
      expect(gateReason(withDots(complete, 'ability:melee', 5), 'abilities')).toEqual({
        text: 'Skills are 2 dots over · Lower it to continue',
      });
    });
  });

  describe('Clan', () => {
    test('no clan chosen asks for one, with nowhere else to go', () => {
      expect(gateReason(fresh(), 'clan')).toEqual({ text: 'Choose a clan to continue' });
    });

    test.each(['Brujah', 'Caitiff'])('%s needs no reason', (name) => {
      expect(gateReason(play(fresh(), clan(name)), 'clan')).toBeUndefined();
    });
  });

  describe('Advantages', () => {
    test('no clan chosen says so and offers to go to Clan', () => {
      expect(gateReason(fresh(), 'advantages')).toEqual({
        text: 'Choose a clan to place Discipline dots',
        goTo: 'clan',
      });
    });

    test('no clan is the reason even while other pools are unplaced', () => {
      expect(gateReason({ ...complete, clan: '', disciplines: [] }, 'advantages')).toEqual({
        text: 'Choose a clan to place Discipline dots',
        goTo: 'clan',
      });
    });

    test('3 Background dots and 1 Virtue dot unplaced aggregate in pool order', () => {
      const build = withAll(complete, [
        ['background:Resources', 1],
        ['background:Contacts', 1],
        ['background:Allies', 0],
        ['virtue:courage', 1],
      ]);
      expect(gateReason(build, 'advantages')).toEqual({
        text: '3 Background dots and 1 Virtue dot remain · Allocate them to continue',
      });
    });

    test('a clan chosen with nothing placed lists all three pools', () => {
      expect(gateReason(play(fresh(), clan('Brujah')), 'advantages')?.text).toBe(
        '3 Discipline dots, 5 Background dots and 7 Virtue dots remain · Allocate them to continue',
      );
    });

    test('1 Discipline dot unplaced reads in the singular', () => {
      const short = {
        ...complete,
        disciplines: complete.disciplines.map((entry) => ({ ...entry, creation: entry.name === 'Potence' ? 0 : entry.creation })),
      };
      expect(gateReason(short, 'advantages')?.text).toBe('1 Discipline dot remains · Allocate it to continue');
    });

    test('an overspent pool is named as it is shown', () => {
      expect(gateReason(withDots(complete, 'background:Allies', 5), 'advantages')?.text).toBe(
        'Backgrounds are 3 dots over · Lower it to continue',
      );
    });

    test('a Caitiff is asked for Discipline dots until it has placed three', () => {
      expect(gateReason(completeBuild('Caitiff'), 'advantages')).toBeUndefined();
      expect(gateReason(play(fresh(), clan('Caitiff')), 'advantages')?.text).toBe(
        '3 Discipline dots, 5 Background dots and 7 Virtue dots remain · Allocate them to continue',
      );
    });

    test('a placed screen has no reason', () => {
      expect(gateReason(complete, 'advantages')).toBeUndefined();
    });
  });

  test.each(['concept', 'natureDemeanor', 'finishing', 'review', 'summary'] as const)(
    '%s is not gated, whatever the build holds',
    (screen) => {
      expect(gateReason(fresh(), screen)).toBeUndefined();
      expect(gateReason(complete, screen)).toBeUndefined();
    },
  );
});

describe('itemsLeft', () => {
  test.each([
    [0, '0 items left'],
    [1, '1 item left'],
    [3, '3 items left'],
  ])('%i reads "%s"', (count, text) => {
    expect(itemsLeft(count)).toBe(text);
  });
});

describe('hint', () => {
  test('Finishing touches says what is left when only the Blood Pool is not recorded', () => {
    expect(hint({ ...completeBuild(), bloodPool: null }, 'finishing')).toBe('1 item left · Review it next');
  });

  test('counts everything outstanding, not only the Finishing touches', () => {
    expect(hint({ ...completeBuild(), bloodPool: null, clan: '' }, 'finishing')).toMatch(/^\d+ items left · Review them next$/);
  });

  test('Finishing touches has no hint once nothing is left', () => {
    expect(hint(completeBuild(), 'finishing')).toBeUndefined();
  });

  test.each(['concept', 'clan', 'natureDemeanor', 'attributes', 'abilities', 'advantages', 'review', 'summary'] as const)(
    '%s has no hint',
    (screen) => {
      expect(hint(fresh(), screen)).toBeUndefined();
    },
  );
});

describe('phase eyebrow', () => {
  test.each([
    ['concept', 'Phase 01 / Character concept'],
    ['clan', 'Phase 01 / Character concept'],
    ['natureDemeanor', 'Phase 01 / Character concept'],
    ['attributes', 'Phase 02 / Attributes'],
    ['abilities', 'Phase 03 / Abilities'],
    ['advantages', 'Phase 04 / Advantages'],
    ['finishing', 'Phase 05 / Finishing touches'],
    ['review', 'Phase 05 / Finishing touches'],
    ['summary', 'Phase 05 / Finishing touches'],
  ] as const)('reads %s as "%s"', (screen, eyebrow) => {
    expect(phaseEyebrow(screen)).toBe(eyebrow);
  });
});
