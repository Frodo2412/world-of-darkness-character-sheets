import { describe, expect, test } from 'vitest';
import { blankCharacter, type V20Character } from '../../domain/v20/character';
import type { DamageType, HealthLevelKey } from '../../domain/v20/traits';
import { BLOOD_SEGMENT_LIMIT, trackerForm, woundChange } from './resourceCards';

const marked = (damage: Partial<Record<HealthLevelKey, DamageType>>): V20Character => {
  const character = blankCharacter('abc');
  return { ...character, health: { ...character.health, ...damage } };
};

describe('woundChange', () => {
  test('is announced when a wound appears', () => {
    expect(woundChange(marked({}), marked({ wounded: 'bashing' }))).toBe('Wounded, minus 2 dice');
  });

  test('is announced when the wound clears', () => {
    expect(woundChange(marked({ wounded: 'bashing' }), marked({}))).toBe('No wound penalty');
  });

  test('is announced when the wound moves to another level with the same penalty', () => {
    expect(woundChange(marked({ hurt: 'bashing' }), marked({ hurt: 'bashing', injured: 'bashing' }))).toBe(
      'Injured, minus 1 die',
    );
  });

  test('is announced when the character becomes incapacitated', () => {
    expect(woundChange(marked({ crippled: 'lethal' }), marked({ crippled: 'lethal', incapacitated: 'lethal' }))).toBe(
      'Incapacitated',
    );
  });

  test.each<[DamageType, DamageType]>([
    ['empty', 'bashing'],
    ['bashing', 'lethal'],
    ['lethal', 'aggravated'],
    ['aggravated', 'empty'],
  ])('is not announced when Bruised goes from %s to %s on an unwounded character', (from, to) => {
    expect(woundChange(marked({ bruised: from }), marked({ bruised: to }))).toBeUndefined();
  });

  test('is not announced when a wounded level changes damage type only', () => {
    expect(woundChange(marked({ hurt: 'bashing' }), marked({ hurt: 'lethal' }))).toBeUndefined();
  });

  test('is not announced when a lesser level is marked under a worse wound', () => {
    expect(woundChange(marked({ crippled: 'lethal' }), marked({ crippled: 'lethal', hurt: 'bashing' }))).toBeUndefined();
  });
});

describe('trackerForm', () => {
  test('is one segment each up to the limit, which is 20', () => {
    expect(BLOOD_SEGMENT_LIMIT).toBe(20);
    expect(trackerForm(20)).toBe('segments');
    expect(trackerForm(13)).toBe('segments');
  });

  test('is one bar above the limit', () => {
    expect(trackerForm(21)).toBe('bar');
    expect(trackerForm(50)).toBe('bar');
  });
});
