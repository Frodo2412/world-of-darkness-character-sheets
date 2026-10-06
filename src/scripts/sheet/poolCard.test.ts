import { describe, expect, test } from 'vitest';
import type { DicePool } from '../../domain/v20/resources';
import { poolAnnouncement, poolReadout } from './poolCard';

const intelligence = { label: 'Intelligence', rating: 4 };
const investigation = { label: 'Investigation', rating: 3 };

const pool = (parts: Partial<DicePool>): DicePool => ({ incapacitated: false, ...parts });

describe('poolReadout', () => {
  test('asks for both when nothing is selected, with no formula and no total', () => {
    expect(poolReadout(pool({}))).toEqual({
      formula: '',
      prompt: 'Select an attribute and an ability',
      total: '',
      incapacitated: false,
    });
  });

  test('shows the attribute and asks for an ability', () => {
    expect(poolReadout(pool({ attribute: intelligence }))).toMatchObject({
      formula: 'Intelligence 4',
      prompt: 'Select an ability',
      total: '',
    });
  });

  test('shows the ability and asks for an attribute', () => {
    expect(poolReadout(pool({ ability: investigation }))).toMatchObject({
      formula: 'Investigation 3',
      prompt: 'Select an attribute',
      total: '',
    });
  });

  test('adds the two and totals them, with nothing left to ask', () => {
    expect(poolReadout(pool({ attribute: intelligence, ability: investigation, total: 7 }))).toEqual({
      formula: 'Intelligence 4 + Investigation 3',
      prompt: '',
      total: '7 dice',
      incapacitated: false,
    });
  });

  test('takes the wound off with a true minus sign', () => {
    expect(poolReadout(pool({ attribute: intelligence, ability: investigation, wound: 1, total: 6 }))).toMatchObject({
      formula: 'Intelligence 4 + Investigation 3 − wound 1',
      total: '6 dice',
    });
  });

  test('words a total of one as a die', () => {
    expect(poolReadout(pool({ attribute: intelligence, ability: investigation, total: 1 })).total).toBe('1 die');
  });

  test('leaves the wound out until both are selected', () => {
    expect(poolReadout(pool({ attribute: intelligence, wound: 2 })).formula).toBe('Intelligence 4');
  });

  test('says the character cannot act once something is selected', () => {
    expect(poolReadout(pool({ attribute: intelligence, incapacitated: true })).incapacitated).toBe(true);
  });

  test('says nothing about incapacitation while nothing is selected', () => {
    expect(poolReadout(pool({ incapacitated: true })).incapacitated).toBe(false);
  });

  test('totals nothing for an incapacitated character with both selected', () => {
    expect(
      poolReadout(pool({ attribute: intelligence, ability: investigation, total: 0, incapacitated: true })),
    ).toMatchObject({ formula: 'Intelligence 4 + Investigation 3', total: '0 dice', incapacitated: true });
  });
});

describe('poolAnnouncement', () => {
  test('is the formula and the total once both are selected', () => {
    expect(poolAnnouncement(pool({ attribute: intelligence, ability: investigation, total: 7 }))).toBe(
      'Dice pool: Intelligence 4 + Investigation 3, 7 dice',
    );
  });

  test('includes the wound', () => {
    expect(poolAnnouncement(pool({ attribute: intelligence, ability: investigation, wound: 1, total: 6 }))).toBe(
      'Dice pool: Intelligence 4 + Investigation 3 − wound 1, 6 dice',
    );
  });

  test.each([
    ['nothing', pool({})],
    ['an attribute', pool({ attribute: intelligence })],
    ['an ability', pool({ ability: investigation })],
  ])('is empty with only %s selected', (_, selected) => {
    expect(poolAnnouncement(selected)).toBe('');
  });
});
