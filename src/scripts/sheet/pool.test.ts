import { describe, expect, test } from 'vitest';
import { createPool } from './pool';

describe('createPool', () => {
  test('starts with nothing selected', () => {
    expect(createPool().selection()).toEqual({});
  });

  test('selects an attribute and an ability independently', () => {
    const pool = createPool();
    pool.toggle('attributes.intelligence');
    pool.toggle('abilities.investigation');
    expect(pool.selection()).toEqual({ attribute: 'attributes.intelligence', ability: 'abilities.investigation' });
  });

  test('selects a custom ability as the ability', () => {
    const pool = createPool();
    pool.toggle('customAbilities.knowledges');
    expect(pool.selection()).toEqual({ ability: 'customAbilities.knowledges' });
  });

  test('selecting another attribute replaces the first and leaves the ability', () => {
    const pool = createPool();
    pool.toggle('attributes.intelligence');
    pool.toggle('abilities.investigation');
    pool.toggle('attributes.strength');
    expect(pool.selection()).toEqual({ attribute: 'attributes.strength', ability: 'abilities.investigation' });
  });

  test('selecting another ability replaces the first, fixed or custom, and leaves the attribute', () => {
    const pool = createPool();
    pool.toggle('attributes.intelligence');
    pool.toggle('abilities.investigation');
    pool.toggle('customAbilities.knowledges');
    expect(pool.selection()).toEqual({ attribute: 'attributes.intelligence', ability: 'customAbilities.knowledges' });
  });

  test('selecting the selected attribute deselects it and leaves the ability', () => {
    const pool = createPool();
    pool.toggle('attributes.intelligence');
    pool.toggle('abilities.investigation');
    pool.toggle('attributes.intelligence');
    expect(pool.selection()).toEqual({ ability: 'abilities.investigation' });
  });

  test('selecting the selected ability deselects it and leaves the attribute', () => {
    const pool = createPool();
    pool.toggle('attributes.intelligence');
    pool.toggle('abilities.investigation');
    pool.toggle('abilities.investigation');
    expect(pool.selection()).toEqual({ attribute: 'attributes.intelligence' });
  });

  test('clear forgets both', () => {
    const pool = createPool();
    pool.toggle('attributes.intelligence');
    pool.toggle('abilities.investigation');
    pool.clear();
    expect(pool.selection()).toEqual({});
  });

  test('a reading is a copy: later changes do not alter it', () => {
    const pool = createPool();
    pool.toggle('attributes.intelligence');
    const before = pool.selection();
    pool.toggle('attributes.strength');
    expect(before).toEqual({ attribute: 'attributes.intelligence' });
  });
});
