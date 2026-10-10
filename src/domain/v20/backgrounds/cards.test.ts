import { describe, expect, test } from 'vitest';
import { blankCharacter, type V20Character } from '../character';
import type { BackgroundRow } from '../dossier/types';
import { BACKGROUND_DOTS, backgroundCards, dotsOf } from './cards';

function withBackgrounds(...rows: BackgroundRow[]): V20Character {
  const character = blankCharacter('abc');
  rows.forEach((row, index) => {
    character.backgrounds[index] = row;
  });
  return character;
}

const names = (character: V20Character, mode: 'play' | 'edit'): string[] =>
  backgroundCards(character, mode).cards.map((card) => card.name);

describe('backgroundCards in play mode', () => {
  test('holds the named rows only, in the order stored', () => {
    const character = withBackgrounds({ name: 'Allies', rating: 2 }, { name: '', rating: 0 }, { name: 'Contacts', rating: 3 });
    expect(names(character, 'play')).toEqual(['Allies', 'Contacts']);
  });

  test('keeps each row\'s place in the stored list', () => {
    const character = withBackgrounds({ name: 'Allies', rating: 2 }, { name: '', rating: 0 }, { name: 'Contacts', rating: 3 });
    expect(backgroundCards(character, 'play').cards.map((card) => card.index)).toEqual([0, 2]);
  });

  test('treats a row with only spaces as unnamed, and trims a name it shows', () => {
    const character = withBackgrounds({ name: '   ', rating: 1 }, { name: '  Herd ', rating: 1 });
    const { cards } = backgroundCards(character, 'play');
    expect(cards.map((card) => card.name)).toEqual(['Herd']);
    expect(cards[0].nameText).toBe('  Herd ');
  });

  test('counts the named rows', () => {
    const character = withBackgrounds({ name: 'Allies', rating: 2 }, { name: 'Contacts', rating: 3 });
    expect(backgroundCards(character, 'play').count).toBe(2);
  });

  test('is empty for a character with no named rows', () => {
    expect(backgroundCards(blankCharacter('abc'), 'play')).toEqual({ cards: [], count: 0 });
  });
});

describe('backgroundCards in edit mode', () => {
  test('holds every row, blank ones included', () => {
    const character = withBackgrounds({ name: 'Allies', rating: 2 }, { name: 'Contacts', rating: 3 });
    expect(backgroundCards(character, 'edit').cards).toHaveLength(6);
  });

  test('counts every row', () => {
    const character = withBackgrounds({ name: 'Allies', rating: 2 }, { name: 'Contacts', rating: 3 });
    expect(backgroundCards(character, 'edit').count).toBe(6);
  });

  test('holds the rows past the sixth too', () => {
    const character = blankCharacter('abc');
    character.backgrounds.push({ name: 'Domain', rating: 1 }, { name: 'Status', rating: 2 });
    const { cards, count } = backgroundCards(character, 'edit');
    expect(cards.map((card) => card.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(count).toBe(8);
  });
});

describe('a card', () => {
  const row: BackgroundRow = {
    name: 'Allies',
    rating: 2,
    summary: 'Camille Arnaud · museum curator',
    note: 'Owes a favour',
    people: [
      { name: 'Camille Arnaud', role: 'museum curator' },
      { name: 'Lucien Voss', role: 'dockside fixer' },
    ],
  };

  test('carries the name, rating, summary, note and people', () => {
    const [card] = backgroundCards(withBackgrounds(row), 'play').cards;
    expect(card).toMatchObject({ name: 'Allies', rating: 2, dots: 2, summary: row.summary, note: row.note });
  });

  test('keeps the people in the order stored', () => {
    const [card] = backgroundCards(withBackgrounds(row), 'play').cards;
    expect(card.people.map((person) => person.name)).toEqual(['Camille Arnaud', 'Lucien Voss']);
  });

  test('reads a row stored without details as having none', () => {
    const [card] = backgroundCards(withBackgrounds({ name: 'Herd', rating: 1 }), 'play').cards;
    expect(card).toMatchObject({ summary: '', note: '', people: [] });
  });

  test('draws at most five dots while the stored rating stays as it is', () => {
    const [card] = backgroundCards(withBackgrounds({ name: 'Resources', rating: 8 }), 'play').cards;
    expect(card).toMatchObject({ rating: 8, dots: BACKGROUND_DOTS });
  });
});

describe('dotsOf', () => {
  test.each([
    [0, 0],
    [3, 3],
    [5, 5],
    [6, 5],
    [10, 5],
    [-2, 0],
  ])('a rating of %i is %i dots', (rating, dots) => {
    expect(dotsOf(rating)).toBe(dots);
  });
});

describe('a row with details but no name', () => {
  test.each<[string, BackgroundRow]>([
    ['a note', { name: '', rating: 0, note: 'Owes a favour' }],
    ['a summary', { name: '', rating: 0, summary: 'Someone' }],
    ['a rating', { name: '', rating: 2 }],
    ['a person', { name: '', rating: 0, people: [{ name: 'Odile', role: 'clerk' }] }],
    ['only spaces for a name', { name: '  ', rating: 0, note: 'x' }],
  ])('is flagged when it holds %s', (_label, row) => {
    expect(backgroundCards(withBackgrounds(row), 'edit').cards[0].needsName).toBe(true);
  });

  test('is not flagged when it is blank', () => {
    expect(backgroundCards(blankCharacter('abc'), 'edit').cards.some((card) => card.needsName)).toBe(false);
  });

  test('is not flagged once it has a name', () => {
    expect(backgroundCards(withBackgrounds({ name: 'Allies', rating: 0, note: 'x' }), 'edit').cards[0].needsName).toBe(false);
  });

  test('is not shown in play mode', () => {
    expect(names(withBackgrounds({ name: '', rating: 0, note: 'Owes a favour' }), 'play')).toEqual([]);
  });
});
