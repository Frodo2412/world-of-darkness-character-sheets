import { describe, expect, test } from 'vitest';
import { itemsLeftText, list, numberWord, plural, screenIndex, screenTitle, searchListWords } from './wording';
import { SCREENS } from './rules';

describe('list', () => {
  test.each([
    [[], ''],
    [['Physical'], 'Physical'],
    [['Physical', 'Social'], 'Physical and Social'],
    [['Physical', 'Social', 'Mental'], 'Physical, Social and Mental'],
  ])('reads %j as %j', (items, text) => {
    expect(list(items)).toBe(text);
  });
});

describe('itemsLeftText', () => {
  test.each([
    [1, '1 item left'],
    [3, '3 items left'],
  ])('reads %i as %j', (count, text) => {
    expect(itemsLeftText(count)).toBe(text);
  });
});

describe('screens', () => {
  test('each is found by its place in the nine and shown under its title', () => {
    expect(SCREENS.map(({ id }) => screenIndex(id))).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(SCREENS.map(({ id }) => screenTitle(id))).toEqual(SCREENS.map(({ title }) => title));
  });
});

test.each([
  [3, 'three'],
  [6, 'six'],
  [12, 'twelve'],
  [13, '13'],
])('numberWord reads %i as %j', (count, word) => {
  expect(numberWord(count)).toBe(word);
});

test('plural keeps its noun in the right number', () => {
  expect([plural(1, 'dot'), plural(2, 'dot')]).toEqual(['1 dot', '2 dots']);
});

describe('searchListWords', () => {
  test('heads the list with its count and says how many are listed', () => {
    expect(searchListWords('clan', 'clans', 14, '')).toEqual({ heading: 'All Clans · 14', results: '14 clans listed' });
    expect(searchListWords('clan', 'clans', 1, 'gang')).toEqual({ heading: 'All Clans · 1', results: '1 clan listed' });
  });

  test('names the search that kept nothing, trimmed, in the noun as written', () => {
    expect(searchListWords('Background', 'Backgrounds', 0, '  zz ')).toEqual({
      heading: 'All Backgrounds · 0',
      results: 'No Background matches "zz".',
    });
  });
});
