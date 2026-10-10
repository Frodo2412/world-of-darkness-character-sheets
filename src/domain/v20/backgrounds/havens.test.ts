import { describe, expect, test } from 'vitest';
import { blankCharacter, type V20Character } from '../character';
import type { Haven } from '../dossier/types';
import { havenCards } from './havens';

const haven = (name: string, overrides: Partial<Haven> = {}): Haven => ({
  name,
  kind: 'Primary',
  description: '',
  location: '',
  access: '',
  security: '',
  ...overrides,
});

function withHavens(...havens: Haven[]): V20Character {
  return { ...blankCharacter('abc'), havens };
}

describe('havenCards', () => {
  test('holds the named havens in play, in the order stored, with their place in the list', () => {
    const character = withHavens(haven('The Orangery'), haven(''), haven('Rue Mouffetard flat', { kind: 'Secondary' }));
    const { cards, count } = havenCards(character, 'play');
    expect(cards.map((card) => [card.index, card.name, card.kind])).toEqual([
      [0, 'The Orangery', 'Primary'],
      [2, 'Rue Mouffetard flat', 'Secondary'],
    ]);
    expect(count).toBe(2);
  });

  test('holds every haven in edit, unnamed ones included, and counts them all', () => {
    const character = withHavens(haven('The Orangery'), haven('  '));
    const { cards, count } = havenCards(character, 'edit');
    expect(cards.map((card) => card.nameText)).toEqual(['The Orangery', '  ']);
    expect(count).toBe(2);
  });

  test('carries the details a haven has', () => {
    const full = haven('The Orangery', { description: 'A glassed-in greenhouse', location: 'Quai de la Tournelle', access: 'Back stair only', security: 'Two ghouls' });
    expect(havenCards(withHavens(full), 'play').cards[0]).toMatchObject({
      description: 'A glassed-in greenhouse',
      location: 'Quai de la Tournelle',
      access: 'Back stair only',
      security: 'Two ghouls',
    });
  });

  test('is empty for a character with no havens', () => {
    expect(havenCards(blankCharacter('abc'), 'play')).toEqual({ cards: [], count: 0 });
  });

  test('trims the name it shows and keeps the name as stored for editing', () => {
    const [card] = havenCards(withHavens(haven('  The Orangery ')), 'play').cards;
    expect(card).toMatchObject({ name: 'The Orangery', nameText: '  The Orangery ' });
  });
});
