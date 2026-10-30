import { describe, expect, it } from 'vitest';
import { statusAfter } from './pool';

describe('statusAfter', () => {
  const press = { group: 'physical', before: 'Physical: 6 remaining' };

  it('says the new pool for the group a press changed', () => {
    expect(statusAfter(press, 'physical', 'Physical: 5 remaining', 'Physical: 6 remaining')).toBe('Physical: 5 remaining');
  });

  it('says "Complete" when the last dot is placed', () => {
    const last = { group: 'social', before: 'Social: 1 remaining' };
    expect(statusAfter(last, 'social', 'Social: Complete', '')).toBe('Social: Complete');
  });

  it('leaves every other group empty, so a press elsewhere is not said twice', () => {
    expect(statusAfter(press, 'social', 'Social: 7 remaining', 'Social: 4 remaining')).toBe('');
  });

  it('leaves the region as it was when the build refused the press, which changed nothing', () => {
    expect(statusAfter(press, 'physical', 'Physical: 6 remaining', 'Physical: 6 remaining')).toBe('Physical: 6 remaining');
    expect(statusAfter(press, 'physical', 'Physical: 6 remaining', '')).toBe('');
  });

  it('is empty without a press: a re-rank changes the pool but is told once, by its own notice', () => {
    expect(statusAfter(null, 'physical', 'Physical: 5 remaining', 'Physical: 6 remaining')).toBe('');
  });
});
