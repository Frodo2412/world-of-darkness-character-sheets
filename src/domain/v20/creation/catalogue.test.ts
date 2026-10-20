import { describe, expect, it } from 'vitest';
import { matchByName } from './catalogue';

const clans = [{ name: 'Brujah' }, { name: 'Gangrel' }, { name: 'Giovanni' }, { name: 'Toreador' }];
const names = (items: readonly { name: string }[]) => items.map((item) => item.name);

describe('matchByName', () => {
  it.each([
    ['gi', ['Giovanni']],
    ['G', ['Gangrel', 'Giovanni']],
    ['GANG', ['Gangrel']],
    ['  tor  ', ['Toreador']],
    ['ngrel', ['Gangrel']],
    ['zzz', []],
  ])('keeps the names holding "%s", in their order', (query, expected) => {
    expect(names(matchByName(clans, query))).toEqual(expected);
  });

  it.each(['', '   '])('keeps every item for the blank query %j', (query) => {
    expect(matchByName(clans, query)).toEqual(clans);
  });

  it('keeps the items themselves, not copies', () => {
    expect(matchByName(clans, 'bru')[0]).toBe(clans[0]);
  });
});
