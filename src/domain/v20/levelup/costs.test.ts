import { describe, expect, test } from 'vitest';
import { blankCharacter, type V20Character } from '../character';
import { CLANS } from '../creation/rules';
import { XP_COSTS } from '../experience/costs';
import { ABILITY_KEYS, ATTRIBUTE_KEYS } from '../traits';
import { advancementCost, clanClass } from './costs';
import type { Subject } from './subjects';

function character(clan: string, change: (character: V20Character) => void = () => {}): V20Character {
  const made = blankCharacter('abc');
  made.header.clan = clan;
  change(made);
  return made;
}

const xpOf = (made: V20Character, subject: Subject): number | 'maximum' | undefined => {
  const cost = advancementCost(made, subject);
  return cost === undefined ? undefined : cost.maximum ? 'maximum' : cost.xp;
};

describe('the V20 cost table', () => {
  test('a new Ability costs 3 and an existing one current × 2', () => {
    const made = character('Toreador', (c) => {
      c.abilities.stealth = 2;
      c.abilities.melee = 0;
    });

    expect(xpOf(made, 'abilities.melee')).toBe(3);
    expect(xpOf(made, 'abilities.stealth')).toBe(4);
  });

  test.each([
    [1, 2],
    [2, 4],
    [3, 6],
    [4, 8],
  ])('an Ability at %i costs %i', (rating, xp) => {
    expect(xpOf(character('', (c) => void (c.abilities.brawl = rating)), 'abilities.brawl')).toBe(xp);
  });

  test.each([
    [1, 4],
    [2, 8],
    [3, 12],
    [4, 16],
  ])('an Attribute at %i costs %i', (rating, xp) => {
    expect(xpOf(character('', (c) => void (c.attributes.strength = rating)), 'attributes.strength')).toBe(xp);
  });

  test.each([
    [1, 2],
    [2, 4],
    [3, 6],
    [4, 8],
  ])('a Virtue at %i costs %i', (rating, xp) => {
    expect(xpOf(character('', (c) => void (c.virtues.conscience = rating)), 'virtues.conscience')).toBe(xp);
  });

  test.each([
    [1, 2],
    [7, 14],
    [9, 18],
  ])('Humanity / Path at %i costs %i', (rating, xp) => {
    expect(xpOf(character('', (c) => void (c.humanity.rating = rating)), 'humanity.rating')).toBe(xp);
  });

  test.each([
    [1, 1],
    [6, 6],
    [9, 9],
  ])('permanent Willpower at %i costs its current rating, %i', (rating, xp) => {
    expect(xpOf(character('', (c) => void (c.willpower.permanent = rating)), 'willpower.permanent')).toBe(xp);
  });

  test('the formulas are read from the cost table, not restated: every multiplier is the table\'s', () => {
    const multiplier = (key: string) => {
      const entry = XP_COSTS.find((candidate) => candidate.key === key)!;
      return entry.cost.basis === 'current' ? entry.cost.multiplier : NaN;
    };
    const made = character('Toreador', (c) => {
      c.attributes.strength = 3;
      c.abilities.stealth = 3;
      c.virtues.courage = 3;
      c.humanity.rating = 3;
      c.willpower.permanent = 3;
    });

    expect(xpOf(made, 'attributes.strength')).toBe(3 * multiplier('attribute'));
    expect(xpOf(made, 'abilities.stealth')).toBe(3 * multiplier('ability'));
    expect(xpOf(made, 'virtues.courage')).toBe(3 * multiplier('virtue'));
    expect(xpOf(made, 'humanity.rating')).toBe(3 * multiplier('humanity'));
    expect(xpOf(made, 'willpower.permanent')).toBe(3 * multiplier('willpower'));
  });
});

describe('Disciplines cost by clan', () => {
  const withAuspex = (clan: string): V20Character => character(clan, (c) => void (c.disciplines[0] = { name: 'Auspex', rating: 2 }));

  test.each([
    ['Toreador', 10],
    ['toreador', 10],
    ['toreador ', 10],
    ['  TOREADOR', 10],
    ['Malkavian', 10],
    ['Brujah', 14],
    ['Caitiff', 12],
    ['Self-made', 12],
    ['', 12],
    ['   ', 12],
  ])('Auspex 2 → 3 for the clan text %j costs %i', (clan, xp) => {
    expect(xpOf(withAuspex(clan), 'disciplines.0')).toBe(xp);
  });

  test('a Discipline is matched by name whatever its case and spacing', () => {
    const made = character('Toreador', (c) => void (c.disciplines[0] = { name: '  presence ', rating: 3 }));

    expect(xpOf(made, 'disciplines.0')).toBe(15);
  });

  test('Presence at 3 is in-clan for a Toreador', () => {
    expect(clanClass(character('Toreador'), 'Presence')).toBe('in-clan');
    expect(clanClass(character('Toreador'), 'Dominate')).toBe('out-of-clan');
  });

  test.each(CLANS.filter((clan) => clan.disciplines.length > 0).map((clan) => clan.name))('every clan Discipline of %s is in-clan, and only those', (name) => {
    const clan = CLANS.find((entry) => entry.name === name)!;
    for (const discipline of clan.disciplines) expect(clanClass(character(name), discipline)).toBe('in-clan');
    expect(clanClass(character(name), 'Not a Discipline')).toBe('out-of-clan');
  });

  test('each rule is shown with its working', () => {
    const cost = advancementCost(character('Toreador', (c) => void (c.disciplines[0] = { name: 'Presence', rating: 3 })), 'disciplines.0');

    expect(cost).toMatchObject({ xp: 15, key: 'inClanDiscipline', rule: 'In-clan Discipline · current 3 × 5 = 15 XP', shortRule: 'In-clan Discipline · 3 × 5' });
  });

  test('a Discipline at rating 0, unnamed, or not there is not offered', () => {
    const made = character('Toreador', (c) => void (c.disciplines[0] = { name: 'Auspex', rating: 0 }));

    expect(advancementCost(made, 'disciplines.0')).toBeUndefined();
    expect(advancementCost(made, 'disciplines.1')).toBeUndefined();
    expect(advancementCost(made, 'disciplines.99')).toBeUndefined();
    made.disciplines[2] = { name: '   ', rating: 2 };
    expect(advancementCost(made, 'disciplines.2')).toBeUndefined();
  });
});

describe('maximums', () => {
  test('Courage 5 is at its maximum', () => {
    expect(xpOf(character('', (c) => void (c.virtues.courage = 5)), 'virtues.courage')).toBe('maximum');
  });

  test.each([
    ['attributes.strength', 5],
    ['abilities.brawl', 5],
    ['humanity.rating', 10],
    ['willpower.permanent', 10],
  ] as const)('%s tops out at %i', (subject, most) => {
    const made = character('Toreador', (c) => {
      c.attributes.strength = 5;
      c.abilities.brawl = 5;
      c.humanity.rating = 10;
      c.willpower.permanent = 10;
    });

    expect(xpOf(made, subject)).toBe('maximum');
    expect(xpOf(character('', (c) => {
      c.attributes.strength = most - 1;
      c.abilities.brawl = most - 1;
      c.humanity.rating = most - 1;
      c.willpower.permanent = most - 1;
    }), subject)).not.toBe('maximum');
  });

  test('a Discipline stored above five is at its maximum', () => {
    expect(xpOf(character('Toreador', (c) => void (c.disciplines[0] = { name: 'Presence', rating: 7 })), 'disciplines.0')).toBe('maximum');
  });
});

describe('every trait Level up offers can be priced', () => {
  test('all attributes and abilities of a blank character have a cost', () => {
    const made = character('Toreador');
    for (const key of ATTRIBUTE_KEYS) expect(advancementCost(made, `attributes.${key}`)).toMatchObject({ maximum: false });
    for (const key of ABILITY_KEYS) expect(advancementCost(made, `abilities.${key}`)).toMatchObject({ maximum: false, xp: 3 });
  });
});
