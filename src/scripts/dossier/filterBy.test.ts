import { describe, expect, it } from 'vitest';
import { filterBy } from './filterBy';

const powers = [
  { name: 'Celerity', summary: 'Supernatural speed' },
  { name: 'Auspex', summary: 'Heightened senses' },
  { name: 'Obtenebration', summary: undefined },
];
const fieldsOf = (power: (typeof powers)[number]) => [power.name, power.summary];

describe('filterBy', () => {
  it('keeps the items that match, in their order', () => {
    expect(filterBy(powers, 'S', fieldsOf).map((p) => p.name)).toEqual(['Celerity', 'Auspex']);
    expect(filterBy(powers, 'speed', fieldsOf).map((p) => p.name)).toEqual(['Celerity']);
  });

  it('looks across the fields an item gives', () => {
    expect(filterBy(powers, 'auspex senses', fieldsOf).map((p) => p.name)).toEqual(['Auspex']);
  });

  it('keeps every item for an empty query', () => {
    expect(filterBy(powers, '  ', fieldsOf)).toHaveLength(3);
  });

  it('keeps none when nothing matches', () => {
    expect(filterBy(powers, 'zzz', fieldsOf)).toEqual([]);
  });

  it('copes with a field an item lacks', () => {
    expect(filterBy(powers, 'obtenebration', fieldsOf)).toHaveLength(1);
  });
});
