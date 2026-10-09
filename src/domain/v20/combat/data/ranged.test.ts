import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { RANGED_WEAPONS } from './ranged';
import type { RangedWeapon } from './types';

const weapon = (name: string): RangedWeapon => {
  const found = RANGED_WEAPONS.find((entry) => entry.name === name);
  if (!found) throw new Error(`no weapon ${name}`);
  return found;
};

describe('RANGED_WEAPONS', () => {
  test('lists the eleven weapons of the Ranged Weapons Chart in its order', () => {
    expect(RANGED_WEAPONS.map((entry) => entry.name)).toEqual([
      'Revolver, Lt.', 'Revolver, Hvy.', 'Pistol, Lt.', 'Pistol, Hvy.', 'Rifle', 'SMG, Small', 'SMG, Large',
      'Assault Rifle', 'Shotgun', 'Shotgun, Semi-auto', 'Crossbow',
    ]);
  });

  test('every weapon has damage, range, rate, clip, concealment and the chart page', () => {
    for (const entry of RANGED_WEAPONS) {
      expect(entry.kind, entry.name).toBe('ranged');
      expect(Object.keys(entry.damage), entry.name).toEqual(['flat']);
      for (const value of [entry.damage.flat, entry.range, entry.rate, entry.clip]) {
        expect(Number.isInteger(value) && (value as number) > 0, entry.name).toBe(true);
      }
      expect('PJTN', entry.name).toContain(entry.conceal);
      expect(entry.page, entry.name).toBe(281);
      expect(typeof entry.chambered, entry.name).toBe('boolean');
      expect(typeof entry.automatic, entry.name).toBe('boolean');
    }
  });

  test('the chart row for each weapon', () => {
    const row = (name: string) => {
      const { damage, range, rate, clip, chambered, conceal } = weapon(name);
      return [damage.flat, range, rate, `${clip}${chambered ? '+1' : ''}`, conceal];
    };

    expect(row('Revolver, Lt.')).toEqual([4, 12, 3, '6', 'P']);
    expect(row('Revolver, Hvy.')).toEqual([6, 35, 2, '6', 'J']);
    expect(row('Pistol, Lt.')).toEqual([4, 20, 4, '15+1', 'P']);
    expect(row('Pistol, Hvy.')).toEqual([5, 25, 3, '13+1', 'J']);
    expect(row('Rifle')).toEqual([8, 200, 1, '3+1', 'N']);
    expect(row('SMG, Small')).toEqual([4, 20, 3, '17+1', 'J']);
    expect(row('SMG, Large')).toEqual([4, 50, 3, '30+1', 'T']);
    expect(row('Assault Rifle')).toEqual([7, 150, 3, '30+1', 'N']);
    expect(row('Shotgun')).toEqual([8, 20, 1, '5+1', 'T']);
    expect(row('Shotgun, Semi-auto')).toEqual([8, 20, 3, '6+1', 'T']);
    expect(row('Crossbow')).toEqual([5, 20, 1, '1', 'T']);
  });

  test('only the asterisked weapons are capable of bursts and full auto', () => {
    expect(RANGED_WEAPONS.filter((entry) => entry.automatic).map((entry) => entry.name)).toEqual([
      'SMG, Small', 'SMG, Large', 'Assault Rifle',
    ]);
  });

  test('examples are the chart\'s; the crossbow has none and carries its footnote', () => {
    expect(weapon('Revolver, Lt.').example).toBe('SW Bodyguard (.38 Special)');
    expect(weapon('Shotgun, Semi-auto').example).toBe('Benelli M4 Super 90 (12-Gauge)');
    expect(weapon('Crossbow')).not.toHaveProperty('example');
    expect(weapon('Crossbow').note).toMatch(/^The crossbow is included for characters who wish to try staking an opponent\./);
    expect(RANGED_WEAPONS.filter((entry) => entry.note !== undefined).map((entry) => entry.name)).toEqual(['Crossbow']);
  });

  test("the pinned example in the review file for Slice 8's feature file equals the data", () => {
    const review = readFileSync(new URL('../../../../../docs/specs/dossier-tabs-combat-review.md', import.meta.url), 'utf8');
    const { name, damage, range, rate, clip, chambered, conceal, page } = weapon('Revolver, Lt.');
    const pinned = `${name} | damage ${damage.flat} | range ${range} | rate ${rate} | clip ${clip}${chambered ? '+1' : ''} | conceal ${conceal} | p. ${page}`;

    expect(review).toContain(`Pinned ranged example: ${pinned}`);
  });
});
