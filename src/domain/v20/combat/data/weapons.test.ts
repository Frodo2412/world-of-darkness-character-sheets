import { describe, expect, test } from 'vitest';
import { MELEE_WEAPONS } from './weapons';

const weapon = (name: string) => MELEE_WEAPONS.find((entry) => entry.name === name);

describe('MELEE_WEAPONS', () => {
  test('lists the six weapons of the Melee Weapons Chart in its order', () => {
    expect(MELEE_WEAPONS.map((entry) => entry.name)).toEqual(['Sap', 'Club', 'Knife', 'Sword', 'Axe', 'Stake']);
  });

  test('every weapon has damage, a type, concealment and a page in chapter nine', () => {
    for (const entry of MELEE_WEAPONS) {
      expect(entry.kind, entry.name).toBe('melee');
      expect(Object.keys(entry.damage), entry.name).toEqual(['strength']);
      expect(Number.isInteger(entry.damage.strength), entry.name).toBe(true);
      expect(['bashing', 'lethal'], entry.name).toContain(entry.type);
      expect(['P', 'J', 'T', 'N'], entry.name).toContain(entry.conceal);
      expect(entry.page, entry.name).toBeGreaterThanOrEqual(274);
      expect(entry.page, entry.name).toBeLessThanOrEqual(281);
      if (entry.note !== undefined) expect(entry.note.trim(), entry.name).not.toBe('');
    }
  });

  test('Sap is Strength + 1 bashing, concealable in a pocket', () => {
    expect(weapon('Sap')).toMatchObject({ damage: { strength: 1 }, type: 'bashing', conceal: 'P', page: 280 });
  });

  test('the chart row for each weapon', () => {
    const row = (name: string) => [weapon(name)?.damage.strength, weapon(name)?.conceal];

    expect(row('Club')).toEqual([2, 'T']);
    expect(row('Knife')).toEqual([1, 'J']);
    expect(row('Sword')).toEqual([2, 'T']);
    expect(row('Axe')).toEqual([3, 'N']);
    expect(row('Stake')).toEqual([1, 'T']);
  });

  test('only the blunt objects (Sap, Club) inflict bashing damage', () => {
    expect(MELEE_WEAPONS.filter((entry) => entry.type === 'bashing').map((entry) => entry.name)).toEqual(['Sap', 'Club']);
  });

  test('Stake carries the chart footnote about the heart', () => {
    expect(weapon('Stake')?.note).toBe(
      'May paralyze a vampire if driven through the heart. The attacker must target the heart (difficulty 9) and score three damage successes.',
    );
    expect(weapon('Knife')).not.toHaveProperty('note');
  });
});
