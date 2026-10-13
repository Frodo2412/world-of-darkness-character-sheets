import { describe, expect, test } from 'vitest';
import { XP_COSTS, costRule, type CostKey } from './costs';

describe('the V20 experience cost table', () => {
  test.each<[CostKey, string, string, object]>([
    ['newAbility', 'New Ability', '3', { basis: 'flat', xp: 3 }],
    ['ability', 'Ability', 'Current rating × 2', { basis: 'current', multiplier: 2 }],
    ['attribute', 'Attribute', 'Current rating × 4', { basis: 'current', multiplier: 4 }],
    ['inClanDiscipline', 'In-clan Discipline', 'Current rating × 5', { basis: 'current', multiplier: 5 }],
    ['outOfClanDiscipline', 'Out-of-clan Discipline', 'Current rating × 7', { basis: 'current', multiplier: 7 }],
    ['caitiffDiscipline', 'Caitiff Discipline', 'Current rating × 6', { basis: 'current', multiplier: 6 }],
    ['virtue', 'Virtue', 'Current rating × 2', { basis: 'current', multiplier: 2 }],
    ['humanity', 'Humanity / Path', 'Current rating × 2', { basis: 'current', multiplier: 2 }],
    ['willpower', 'Willpower', 'Current rating', { basis: 'current', multiplier: 1 }],
  ])('%s is %s: %s', (key, label, rule, cost) => {
    expect(costRule(key)).toEqual({ key, label, rule, cost });
  });

  test('lists each cost once, in the order of the table', () => {
    expect(XP_COSTS.map((entry) => entry.key)).toEqual([
      'newAbility',
      'ability',
      'attribute',
      'inClanDiscipline',
      'outOfClanDiscipline',
      'caitiffDiscipline',
      'virtue',
      'humanity',
      'willpower',
    ]);
  });
});
