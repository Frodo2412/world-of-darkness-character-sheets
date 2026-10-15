import { describe, expect, test } from 'vitest';
import { blankCharacter, type V20Character } from '../character';
import { availability } from './availability';
import { addPending, type Pending } from './pending';

function toreador(change: (character: V20Character) => void = () => {}): V20Character {
  const made = blankCharacter('abc');
  made.header.clan = 'Toreador';
  made.abilities.stealth = 2;
  made.attributes.strength = 2;
  change(made);
  return made;
}

describe('availability', () => {
  test('an exact budget is affordable', () => {
    expect(availability(toreador(), 8, [], 'attributes.strength')).toEqual({ state: 'affordable', xp: 8 });
  });

  test('one XP short is unavailable and says by how much', () => {
    expect(availability(toreador(), 7, [], 'attributes.strength')).toEqual({ state: 'unavailable', xp: 8, shortfall: 1 });
  });

  test('nothing to spend, and a negative balance, are shortfalls of the whole cost and more', () => {
    expect(availability(toreador(), 0, [], 'attributes.strength')).toEqual({ state: 'unavailable', xp: 8, shortfall: 8 });
    expect(availability(toreador(), -2, [], 'attributes.strength')).toEqual({ state: 'unavailable', xp: 8, shortfall: 10 });
  });

  test('a trait at its maximum is at its maximum however much there is', () => {
    expect(availability(toreador((c) => void (c.virtues.courage = 5)), 100, [], 'virtues.courage')).toEqual({ state: 'maximum' });
  });

  test('a trait already chosen is pending, not offered twice', () => {
    const pending = addPending(toreador(), 8, [], 'abilities.stealth');

    expect(availability(toreador(), 8, pending, 'abilities.stealth')).toEqual({ state: 'pending' });
  });

  test('a later choice is judged against what is left after the earlier ones', () => {
    const made = toreador();
    const pending = addPending(made, 8, [], 'abilities.stealth');

    expect(availability(made, 8, pending, 'attributes.strength')).toEqual({ state: 'unavailable', xp: 8, shortfall: 4 });
    expect(availability(made, 12, pending, 'attributes.strength')).toEqual({ state: 'affordable', xp: 8 });
  });

  test('a trait that is not offered has no availability', () => {
    expect(availability(toreador(), 8, [], 'disciplines.0')).toBeUndefined();
  });

  test('pending nothing leaves the whole balance', () => {
    const none: Pending = [];

    expect(availability(toreador(), 4, none, 'abilities.stealth')).toEqual({ state: 'affordable', xp: 4 });
  });
});
