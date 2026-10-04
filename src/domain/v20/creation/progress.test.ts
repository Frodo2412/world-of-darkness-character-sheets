import { describe, expect, test } from 'vitest';
import { blankBuild } from './build';
import { report, settingsReport } from './progress';
import { setBaseGeneration, setExtraFreebies } from './updates';

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
  test('is composed from the settings report', () => {
    const build = played(9, '30');
    expect(report(build)).toEqual({ settings: settingsReport(build) });
  });
});
