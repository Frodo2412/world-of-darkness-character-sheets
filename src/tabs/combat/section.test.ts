import { describe, expect, test } from 'vitest';
import { listedCount, listing, SECTION_FILTERS } from './section';

const counts = (section: Parameters<typeof listing>[0], query = '') => {
  const listed = listing(section, query);
  return [listed.meleeManoeuvres.length, listed.rangedManoeuvres.length, listed.meleeWeapons.length, listed.rangedWeapons.length];
};

describe('listing', () => {
  test('All lists thirteen close combat and five ranged manoeuvres, six melee and eleven ranged weapons', () => {
    expect(counts('all')).toEqual([13, 5, 6, 11]);
    expect(listedCount(listing('all', ''))).toBe(35);
  });

  test('Close combat lists the melee tables only', () => {
    expect(counts('melee')).toEqual([13, 0, 6, 0]);
  });

  test('Ranged combat lists the ranged tables only', () => {
    expect(counts('ranged')).toEqual([0, 5, 0, 11]);
  });

  test('the filter offers the three sections, All first', () => {
    expect(SECTION_FILTERS.map(({ value }) => value)).toEqual(['all', 'melee', 'ranged']);
    expect(SECTION_FILTERS.map(({ label }) => label)).toEqual(['All', 'Close combat', 'Ranged combat']);
  });

  test('a search finds a weapon by its name and leaves no manoeuvre', () => {
    const listed = listing('all', 'stake');

    expect(listed.meleeWeapons.map(({ name }) => name)).toEqual(['Stake']);
    expect(counts('all', 'stake')).toEqual([0, 0, 1, 0]);
  });

  test('a search finds the two revolvers and nothing else', () => {
    expect(listing('all', 'revolver').rangedWeapons.map(({ name }) => name)).toEqual(['Revolver, Lt.', 'Revolver, Hvy.']);
    expect(counts('all', 'revolver')).toEqual([0, 0, 0, 2]);
  });

  test('a search finds a weapon by its note', () => {
    expect(listing('all', 'blunt').meleeWeapons.map(({ name }) => name)).toEqual(['Sap', 'Club']);
  });

  test('a search finds a manoeuvre by its name, in either section', () => {
    expect(listing('all', 'burst').rangedManoeuvres.map(({ name }) => name)).toEqual(['Three-Round Burst']);
    expect(listing('all', 'weapon').meleeManoeuvres.map(({ name }) => name)).toEqual(['Weapon Strike']);
  });

  test('a search is narrowed by the section', () => {
    expect(counts('melee', 'revolver')).toEqual([0, 0, 0, 0]);
    expect(listedCount(listing('melee', 'revolver'))).toBe(0);
  });

  test('a query nothing has leaves nothing', () => {
    expect(listedCount(listing('all', 'zzzz'))).toBe(0);
  });
});
