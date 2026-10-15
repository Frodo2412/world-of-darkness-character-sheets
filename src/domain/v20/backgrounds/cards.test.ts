import { describe, expect, test } from 'vitest';
import { blankCharacter, type V20Character } from '../character';
import type { BackgroundRow } from '../dossier/types';
import { backgroundCards, namedBackgroundCount } from './cards';

function withBackgrounds(...rows: BackgroundRow[]): V20Character {
  const character = blankCharacter('abc');
  rows.forEach((row, index) => (index < character.backgrounds.length ? (character.backgrounds[index] = row) : character.backgrounds.push(row)));
  return character;
}

describe('backgroundCards', () => {
  test('play mode shows the named rows only, in stored order, with their index', () => {
    const character = withBackgrounds({ name: 'Allies', rating: 2 }, { name: '', rating: 0 }, { name: ' Resources ', rating: 3 });

    expect(backgroundCards(character, 'play').map((card) => [card.index, card.name, card.rating])).toEqual([
      [0, 'Allies', 2],
      [2, 'Resources', 3],
    ]);
  });

  test('edit mode shows every row, the unnamed ones as slots', () => {
    const character = withBackgrounds({ name: 'Allies', rating: 2 }, { name: 'Mentor', rating: 1 });

    const cards = backgroundCards(character, 'edit');

    expect(cards).toHaveLength(6);
    expect(cards.filter((card) => card.blank)).toHaveLength(4);
    expect(cards.filter((card) => card.needsName)).toEqual([]);
  });

  test('flags a row that has details but no name', () => {
    const character = withBackgrounds({ name: '', rating: 0, note: 'Owes her a portrait' }, { name: '', rating: 2 }, { name: '', rating: 0, people: [{ name: 'Sophie', role: '' }] });

    const flagged = backgroundCards(character, 'edit').filter((card) => card.needsName);

    expect(flagged.map((card) => card.index)).toEqual([0, 1, 2]);
  });

  test('a row with only whitespace is not flagged', () => {
    const character = withBackgrounds({ name: '  ', rating: 0, note: '   ', summary: ' ', people: [{ name: ' ', role: '' }] });

    expect(backgroundCards(character, 'edit')[0].needsName).toBe(false);
  });

  test('carries the summary, note and people in their stored order', () => {
    const character = withBackgrounds({
      name: 'Allies',
      rating: 2,
      summary: 'Camille Arnaud · museum curator',
      note: 'Arranges private viewings.',
      people: [
        { name: 'Camille Arnaud', role: 'curator' },
        { name: 'Dr. Laurent', role: 'conservator' },
      ],
    });

    const [card] = backgroundCards(character, 'play');

    expect(card.summary).toBe('Camille Arnaud · museum curator');
    expect(card.note).toBe('Arranges private viewings.');
    expect(card.people.map((person) => person.name)).toEqual(['Camille Arnaud', 'Dr. Laurent']);
  });

  test('a row saved without details has empty ones', () => {
    const [card] = backgroundCards(withBackgrounds({ name: 'Herd', rating: 1 }), 'play');

    expect(card).toMatchObject({ summary: '', note: '', people: [] });
  });

  test('draws at most five dots while the stored number stays as it is', () => {
    const [card] = backgroundCards(withBackgrounds({ name: 'Generation', rating: 8 }), 'play');

    expect(card).toMatchObject({ rating: 8, dots: 5 });
  });

  test('lists more than six rows', () => {
    const rows = Array.from({ length: 8 }, (_, index) => ({ name: `Row ${index}`, rating: 1 }));

    expect(backgroundCards(withBackgrounds(...rows), 'play')).toHaveLength(8);
  });

  test('does not hand out the stored people to be changed', () => {
    const character = withBackgrounds({ name: 'Allies', rating: 1, people: [{ name: 'Sophie', role: 'archivist' }] });

    backgroundCards(character, 'play')[0].people[0].name = 'Changed';

    expect(character.backgrounds[0].people?.[0].name).toBe('Sophie');
  });
});

describe('namedBackgroundCount', () => {
  test('counts the named rows', () => {
    expect(namedBackgroundCount(withBackgrounds({ name: 'Allies', rating: 1 }, { name: ' ', rating: 3 }, { name: 'Herd', rating: 0 }))).toBe(2);
    expect(namedBackgroundCount(blankCharacter('abc'))).toBe(0);
  });
});
