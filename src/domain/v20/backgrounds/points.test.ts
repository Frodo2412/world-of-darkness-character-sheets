import { describe, expect, test } from 'vitest';
import { blankCharacter, type V20Character } from '../character';
import type { Merit } from '../dossier/types';
import { flawCards, meritCards, pointTotal } from './points';

const entry = (name: string, points: number, overrides: Partial<Merit> = {}): Merit => ({
  name,
  category: 'Physical',
  points,
  note: '',
  ...overrides,
});

describe('pointTotal', () => {
  test('is 0 for no entries', () => {
    expect(pointTotal([])).toBe(0);
  });

  test('is the points of one entry', () => {
    expect(pointTotal([entry('Acute Sense', 1)])).toBe(1);
  });

  test('adds the points of many entries', () => {
    expect(pointTotal([entry('Acute Sense', 1), entry('Eidetic Memory', 2), entry('Iron Will', 5)])).toBe(8);
  });

  test('counts an entry worth 0 points as nothing', () => {
    expect(pointTotal([entry('Acute Sense', 1), entry('Unpriced', 0)])).toBe(1);
  });
});

function withEntries(merits: Merit[], flaws: Merit[] = []): V20Character {
  return { ...blankCharacter('abc'), merits, flaws };
}

describe('meritCards and flawCards', () => {
  test('hold the named entries in play, with their category, points and note', () => {
    const character = withEntries([entry('Acute Sense', 1, { category: 'Physical', note: 'Smell' }), entry('', 3), entry('Eidetic Memory', 2, { category: 'Mental' })]);
    const { cards } = meritCards(character, 'play');
    expect(cards.map((card) => [card.index, card.name, card.category, card.points, card.note])).toEqual([
      [0, 'Acute Sense', 'Physical', 1, 'Smell'],
      [2, 'Eidetic Memory', 'Mental', 2, ''],
    ]);
  });

  test('read the Flaws, not the Merits, for flawCards', () => {
    const character = withEntries([entry('Acute Sense', 1)], [entry('Hunted', 1, { category: 'Social' })]);
    expect(flawCards(character, 'play').cards.map((card) => card.name)).toEqual(['Hunted']);
  });

  test('count and total the named entries in play', () => {
    const character = withEntries([entry('Acute Sense', 1), entry('', 4), entry('Eidetic Memory', 2)]);
    expect(meritCards(character, 'play')).toMatchObject({ count: 2, total: 3 });
  });

  test('count and total every entry in edit, unnamed ones included', () => {
    const character = withEntries([entry('Acute Sense', 1), entry('', 4), entry('Eidetic Memory', 2)]);
    expect(meritCards(character, 'edit')).toMatchObject({ count: 3, total: 7 });
  });

  test('are empty, with a total of 0, for a character with none', () => {
    expect(meritCards(blankCharacter('abc'), 'play')).toEqual({ cards: [], count: 0, total: 0 });
    expect(flawCards(blankCharacter('abc'), 'edit')).toEqual({ cards: [], count: 0, total: 0 });
  });
});
