import { describe, expect, test } from 'vitest';
import * as rules from './rules';
import { ARCHETYPES, CLANS, CLAN_NAMES, GENERATION_TABLE, STANDARD_FREEBIE_BUDGET } from './rules';

describe('generation table', () => {
  test('has one row for each generation from 4th to 13th, most potent first', () => {
    expect(GENERATION_TABLE.map((row) => row.generation)).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  test.each([
    [13, 5, 10, 1],
    [12, 5, 11, 1],
    [11, 5, 12, 1],
    [10, 5, 13, 1],
    [9, 5, 14, 2],
    [8, 5, 15, 3],
    [7, 6, 20, 4],
    [6, 7, 30, 6],
    [5, 8, 40, 8],
    [4, 9, 50, 10],
  ])('%ith generation: max trait %i, blood pool %i, %i blood per turn', (generation, maxTrait, bloodPoolMax, bloodPerTurn) => {
    expect(GENERATION_TABLE.find((row) => row.generation === generation)).toEqual({
      generation,
      maxTrait,
      bloodPoolMax,
      bloodPerTurn,
    });
  });
});

test('every build starts with 15 freebie points', () => {
  expect(STANDARD_FREEBIE_BUDGET).toBe(15);
});

test('rules.ts exports data only, no functions', () => {
  const functions = Object.entries(rules).filter(([, value]) => typeof value === 'function');
  expect(functions).toEqual([]);
});

describe('clans', () => {
  test('are the thirteen clans and Caitiff, in that order', () => {
    expect(CLAN_NAMES).toEqual([
      'Assamite',
      'Brujah',
      'Follower of Set',
      'Gangrel',
      'Giovanni',
      'Lasombra',
      'Malkavian',
      'Nosferatu',
      'Ravnos',
      'Toreador',
      'Tremere',
      'Tzimisce',
      'Ventrue',
      'Caitiff',
    ]);
  });

  test.each([
    ['Assamite', ['Celerity', 'Obfuscate', 'Quietus']],
    ['Brujah', ['Celerity', 'Potence', 'Presence']],
    ['Follower of Set', ['Obfuscate', 'Presence', 'Serpentis']],
    ['Gangrel', ['Animalism', 'Fortitude', 'Protean']],
    ['Giovanni', ['Dominate', 'Necromancy', 'Potence']],
    ['Lasombra', ['Dominate', 'Obtenebration', 'Potence']],
    ['Malkavian', ['Auspex', 'Dementation', 'Obfuscate']],
    ['Nosferatu', ['Animalism', 'Obfuscate', 'Potence']],
    ['Ravnos', ['Animalism', 'Chimerstry', 'Fortitude']],
    ['Toreador', ['Auspex', 'Celerity', 'Presence']],
    ['Tremere', ['Auspex', 'Dominate', 'Thaumaturgy']],
    ['Tzimisce', ['Animalism', 'Auspex', 'Vicissitude']],
    ['Ventrue', ['Dominate', 'Fortitude', 'Presence']],
    ['Caitiff', []],
  ])('%s has the clan Disciplines %j', (name, disciplines) => {
    expect(CLANS.find((clan) => clan.name === name)?.disciplines).toEqual(disciplines);
  });
});

test('Archetypes are unique and include Architect and Visionary', () => {
  expect(new Set(ARCHETYPES).size).toBe(ARCHETYPES.length);
  expect(ARCHETYPES).toEqual(expect.arrayContaining(['Architect', 'Visionary']));
});
