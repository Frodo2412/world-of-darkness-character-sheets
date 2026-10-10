import { describe, expect, test } from 'vitest';
import { blankCharacter, type V20Character } from '../character';
import type { OtherTrait } from '../dossier/types';
import { otherTraitCards } from './others';

const trait = (name: string, overrides: Partial<OtherTrait> = {}): OtherTrait => ({ name, kind: '', note: '', ...overrides });

function withTraits(...otherTraits: OtherTrait[]): V20Character {
  return { ...blankCharacter('abc'), otherTraits };
}

describe('otherTraitCards', () => {
  test('hold the named traits in play and every trait in edit, with their place in the list', () => {
    const character = withTraits(trait('Languages'), trait(''), trait('Hobby'));
    expect(otherTraitCards(character, 'play').cards.map((card) => [card.index, card.name])).toEqual([[0, 'Languages'], [2, 'Hobby']]);
    expect(otherTraitCards(character, 'edit').cards).toHaveLength(3);
  });

  test('count what they hold', () => {
    const character = withTraits(trait('Languages'), trait(''));
    expect(otherTraitCards(character, 'play').count).toBe(1);
    expect(otherTraitCards(character, 'edit').count).toBe(2);
  });

  test('carry the kind and the note', () => {
    const [card] = otherTraitCards(withTraits(trait('Languages', { kind: 'Skill', note: 'French · native' })), 'play').cards;
    expect(card).toMatchObject({ kind: 'Skill', note: 'French · native' });
  });

  test('give an unrated trait no rating and no dots', () => {
    const [card] = otherTraitCards(withTraits(trait('Languages')), 'play').cards;
    expect(card.rating).toBeUndefined();
    expect(card.dots).toBeUndefined();
  });

  test('give a rated trait its rating as stored and at most five dots, a rating of 0 included', () => {
    const cards = otherTraitCards(withTraits(trait('Fencing', { rating: 3 }), trait('Archery', { rating: 8 }), trait('Untrained', { rating: 0 })), 'play').cards;
    expect(cards.map((card) => [card.rating, card.dots])).toEqual([[3, 3], [8, 5], [0, 0]]);
  });

  test('are empty for a character with none', () => {
    expect(otherTraitCards(blankCharacter('abc'), 'play')).toEqual({ cards: [], count: 0 });
  });
});
