import { describe, expect, test } from 'vitest';
import { itemsLeftText, list, plural, screenIndex, screenTitle } from './wording';
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

test('plural keeps its noun in the right number', () => {
  expect([plural(1, 'dot'), plural(2, 'dot')]).toEqual(['1 dot', '2 dots']);
});
