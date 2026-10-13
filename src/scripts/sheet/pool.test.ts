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

  test('select sets the attribute and the ability at once, replacing what was chosen', () => {
    const pool = createPool();
    pool.toggle('attributes.strength');
    pool.toggle('abilities.brawl');

    pool.select({ attribute: 'attributes.dexterity', ability: 'abilities.melee' });

    expect(pool.selection()).toEqual({ attribute: 'attributes.dexterity', ability: 'abilities.melee' });
  });

  test('select with only an attribute clears the ability', () => {
    const pool = createPool();
    pool.toggle('abilities.brawl');

    pool.select({ attribute: 'attributes.dexterity' });

    expect(pool.selection()).toEqual({ attribute: 'attributes.dexterity' });
  });

  test('select ignores a row given as undefined, and keeps no reference to what it was given', () => {
    const pool = createPool();
    const given = { attribute: 'attributes.dexterity', ability: undefined } as const;

    pool.select(given);

    expect(pool.selection()).toEqual({ attribute: 'attributes.dexterity' });
    expect('ability' in pool.selection()).toBe(false);
  });

  test('a toggle after select works on the selected rows', () => {
    const pool = createPool();
    pool.select({ attribute: 'attributes.dexterity', ability: 'abilities.melee' });

    pool.toggle('abilities.melee');

    expect(pool.selection()).toEqual({ attribute: 'attributes.dexterity' });
  });
});
