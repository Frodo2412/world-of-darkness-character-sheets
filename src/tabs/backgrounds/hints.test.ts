import { describe, expect, test } from 'vitest';
import { forgetHintsOf } from './hints';

describe('forgetHintsOf', () => {
  test('drops every note of one family, whichever entry it was beside, and keeps the other families’', () => {
    const hints = new Map([
      ['merits:1', 'Points kept at 0 or more'],
      ['merits:2', 'Points kept at 0 or more'],
      ['flaws:2', 'Points kept at 0 or more'],
    ]);

    forgetHintsOf(hints, 'merits');

    expect([...hints.keys()]).toEqual(['flaws:2']);
  });

  test('does not mistake a family whose name starts with another’s', () => {
    const hints = new Map([['otherTraits:0', 'x'], ['other:0', 'y']]);

    forgetHintsOf(hints, 'other');

    expect([...hints.keys()]).toEqual(['otherTraits:0']);
  });
});
