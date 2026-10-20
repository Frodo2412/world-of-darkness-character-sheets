import { describe, expect, test } from 'vitest';
import { blankBuild } from './build';
import { completeBuild, creation, generation, play } from './testing/play';
import { BACKGROUNDS } from './rules';
import { bloodPoolHint, conceptReport, finishReport, isFinishable, report, settingsReport } from './progress';
import { setBaseGeneration, setClan, setConceptText, setExtraFreebies } from './updates';

function played(generation: number, extra: string) {
  const first = setBaseGeneration(blankBuild('abc'), generation);
  return setExtraFreebies(first.build, extra).build;
}

describe('settingsReport', () => {
  test('a blank build shows the standard settings', () => {
    expect(settingsReport(blankBuild('abc'))).toEqual({
      baseGeneration: 13,
      extraFreebies: 0,
      freebieBudget: 15,
      effectiveGeneration: 13,
      maxTrait: 5,
      bloodPoolMax: 10,
      bloodPerTurn: 1,
    });
  });

  test("a Storyteller's house settings change the budget and limits", () => {
    expect(settingsReport(played(11, '75'))).toEqual({
      baseGeneration: 11,
      extraFreebies: 75,
      freebieBudget: 90,
      effectiveGeneration: 11,
      maxTrait: 5,
      bloodPoolMax: 12,
      bloodPerTurn: 1,
    });
  });

  test('a 4th generation build with the most extra freebie points', () => {
    expect(settingsReport(played(4, '999'))).toMatchObject({
      freebieBudget: 1014,
      maxTrait: 9,
      bloodPoolMax: 50,
      bloodPerTurn: 10,
    });
  });
});

describe('report', () => {
  test('is composed from the per-area reports', () => {
    const build = played(9, '30');
    expect(report(build)).toMatchObject({
      settings: settingsReport(build),
      concept: conceptReport(build),
    });
  });
});

describe('bloodPoolHint', () => {
  test.each([
    [13, 0, '0 to 10 at 13th generation'],
    [13, 1, '0 to 11 at 12th generation'],
    [6, 2, '0 to 50 at 4th generation'],
  ])('from base %ith with %i Generation dots it reads %j', (base, dots, expected) => {
    const build = play(blankBuild('abc'), generation(base), creation('background:Generation', dots));
    expect(bloodPoolHint(build)).toBe(expected);
    expect(report(build).bloodPoolHint).toBe(expected);
  });
});

describe('finishReport', () => {
  test('a complete build is not blocked and says nothing', () => {
    expect(finishReport(completeBuild('Brujah'))).toEqual({
      blocked: false,
      itemsLeft: 0,
      unspentFreebies: 15,
      label: 'Finish character',
      refusalMessage: 'This build is not finished: resolve the outstanding items first.',
    });
  });

  test('one item left reads in the singular', () => {
    const build = { ...completeBuild('Brujah'), bloodPool: null };
    expect(finishReport(build)).toMatchObject({
      blocked: true,
      itemsLeft: 1,
      label: 'Finish character · 1 item left',
      refusalMessage: 'This build is not finished: resolve the outstanding items first.',
    });
  });

  test('several items left read in the plural', () => {
    // A new build owes a clan, both rank sets, three allotments and the Blood Pool.
    expect(finishReport(blankBuild('abc'))).toMatchObject({
      blocked: true,
      itemsLeft: 7,
      label: 'Finish character · 7 items left',
    });
  });

  test('a build is finishable exactly when nothing is outstanding', () => {
    expect(isFinishable(completeBuild('Brujah'))).toBe(true);
    expect(isFinishable({ ...completeBuild('Brujah'), bloodPool: null })).toBe(false);
  });

  test('report carries it', () => {
    const build = blankBuild('abc');
    expect(report(build).finish).toEqual(finishReport(build));
  });
});

describe('conceptReport', () => {
  test('shows the concept text and clan as stored', () => {
    let build = setConceptText(blankBuild('abc'), 'name', 'Lucita').build;
    build = setClan(build, 'Lasombra').build;
    expect(conceptReport(build)).toEqual({
      fields: { name: 'Lucita', player: '', chronicle: '', nature: '', demeanor: '', concept: '', sire: '' },
      clan: 'Lasombra',
    });
  });
});

describe('report with more than six Backgrounds rated', () => {
  test('reports without error and counts every rated Background', () => {
    const build = blankBuild('abc');
    const eight = BACKGROUNDS.slice(0, 8);
    for (const name of eight) build.traits[`background:${name}`] = { creation: 1, freebie: 0 };

    const shown = report(build);

    expect(shown.allotments.backgrounds).toMatchObject({ placed: 8, overspent: true });
  });
});
