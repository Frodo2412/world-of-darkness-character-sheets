import { describe, expect, it } from 'vitest';
import { poolFormula } from './poolText';
import type { DicePool } from './resources';

const dexterity = { label: 'Dexterity', rating: 3 };
const brawl = { label: 'Brawl', rating: 1 };
const pool = (parts: Partial<DicePool>): DicePool => ({ incapacitated: false, ...parts });

describe('poolFormula', () => {
  it('writes both traits with their full labels', () => {
    expect(poolFormula(pool({ attribute: dexterity, ability: brawl, total: 4 }))).toBe('Dexterity 3 + Brawl 1');
  });

  it('writes the wound after the traits, with a true minus sign', () => {
    expect(poolFormula(pool({ attribute: dexterity, ability: brawl, woundPenalty: 1, total: 3 }))).toBe(
      'Dexterity 3 + Brawl 1 − wound 1',
    );
  });

  it('writes a trait rated 0 as it is, Melee 0 included', () => {
    expect(poolFormula(pool({ attribute: dexterity, ability: { label: 'Melee', rating: 0 }, total: 3 }))).toBe(
      'Dexterity 3 + Melee 0',
    );
  });

  it('writes the one trait chosen so far, with no wound until there is a whole pool', () => {
    expect(poolFormula(pool({ attribute: dexterity, woundPenalty: 1 }))).toBe('Dexterity 3');
    expect(poolFormula(pool({ ability: brawl }))).toBe('Brawl 1');
  });

  it('writes nothing when nothing is chosen', () => {
    expect(poolFormula(pool({}))).toBe('');
  });

  it('writes the traits alone when the character is incapacitated, since the pool is 0 whatever they are', () => {
    expect(poolFormula(pool({ attribute: dexterity, ability: brawl, total: 0, incapacitated: true }))).toBe(
      'Dexterity 3 + Brawl 1',
    );
  });
});
