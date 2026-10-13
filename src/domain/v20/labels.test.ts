import { describe, expect, it } from 'vitest';
import { countLabel, pointsLabel, pointsTotalLabel } from './labels';

describe('countLabel', () => {
  it('uses the singular for exactly one', () => {
    expect(countLabel(1, 'entry', 'entries')).toBe('1 entry');
  });

  it('uses the plural for none, two and many', () => {
    expect(countLabel(0, 'entry', 'entries')).toBe('0 entries');
    expect(countLabel(2, 'entry', 'entries')).toBe('2 entries');
    expect(countLabel(1000, 'entry', 'entries')).toBe('1000 entries');
  });
});

describe('pointsLabel', () => {
  it('is short, for a row', () => {
    expect(pointsLabel(0)).toBe('0 pts');
    expect(pointsLabel(1)).toBe('1 pt');
    expect(pointsLabel(2)).toBe('2 pts');
    expect(pointsLabel(120)).toBe('120 pts');
  });
});

describe('pointsTotalLabel', () => {
  it('is spelled out, for a section header', () => {
    expect(pointsTotalLabel(0)).toBe('0 points');
    expect(pointsTotalLabel(1)).toBe('1 point');
    expect(pointsTotalLabel(3)).toBe('3 points');
    expect(pointsTotalLabel(120)).toBe('120 points');
  });
});
