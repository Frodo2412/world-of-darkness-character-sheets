import { describe, expect, test } from 'vitest';
import { blankCharacter, type V20Character } from '../character';
import { MELEE_WEAPONS } from './data/weapons';
import { damageText, manoeuvreRows, meleeWeaponRows, rangedWeaponRows, weaponNamed } from './rows';

const character = (change: (c: V20Character) => void = () => {}): V20Character => {
  const base = blankCharacter('abc');
  base.attributes.dexterity = 3;
  base.attributes.strength = 2;
  base.abilities.brawl = 1;
  change(base);
  return base;
};

const row = (rows: ReturnType<typeof manoeuvreRows>, name: string) => rows.find((entry) => entry.name === name)!;

describe('damageText', () => {
  test('prints damage as the charts do', () => {
    expect(damageText({ strength: 0 })).toBe('Str');
    expect(damageText({ strength: 1 })).toBe('Str +1');
    expect(damageText({ flat: 4 })).toBe('4');
  });
});

describe('manoeuvreRows', () => {
  const rows = manoeuvreRows(character((c) => (c.health.hurt = 'lethal')), 'melee', undefined, undefined);

  test('lists the thirteen close combat manoeuvres', () => {
    expect(rows).toHaveLength(13);
    expect(manoeuvreRows(character(), 'ranged', undefined, undefined)).toHaveLength(5);
  });

  test("Strike shows the character's pool, the rulebook's accuracy, difficulty and damage", () => {
    expect(row(rows, 'Strike')).toMatchObject({
      pool: { dice: 3, formula: 'Dexterity 3 + Brawl 1 − wound 1' },
      accuracy: '0',
      difficulty: '6',
      damage: 'Str',
      damageDice: 2,
      tags: [],
    });
  });

  test('Kick is one harder and Bite adds a die of accuracy', () => {
    expect(row(rows, 'Kick')).toMatchObject({ difficulty: '7 (+1)', damage: 'Str +1', damageDice: 3 });
    expect(row(rows, 'Bite')).toMatchObject({ accuracy: '+1', damage: 'Str +1' });
  });

  test('a manoeuvre with a footnote effect says so', () => {
    expect(row(rows, 'Clinch').description).toBe('Carries over on successive turns');
    expect(row(rows, 'Bite').description).toBe('Aggravated damage · After a successful Clinch, Hold or Tackle.');
  });

  test('Claw is Unavailable with its reason and no pool', () => {
    const claw = row(rows, 'Claw');

    expect(claw.tags).toEqual(['Unavailable']);
    expect(claw.unavailable).toContain('Protean: Feral Claws');
    expect(claw.pool).toBeUndefined();
  });

  test('Weapon Strike says "Weapon required" until a weapon is selected, and then does not', () => {
    expect(row(rows, 'Weapon Strike').tags).toEqual(['Weapon required']);

    const armed = manoeuvreRows(character(), 'melee', MELEE_WEAPONS[0], undefined);
    expect(row(armed, 'Weapon Strike').tags).toEqual([]);
  });

  test('marks the selected manoeuvre', () => {
    const selected = manoeuvreRows(character(), 'melee', undefined, 'Kick');

    expect(selected.filter((entry) => entry.selected).map((entry) => entry.name)).toEqual(['Kick']);
  });

  test('every pool is 0 when the character is incapacitated', () => {
    const down = manoeuvreRows(character((c) => (c.health.incapacitated = 'lethal')), 'melee', undefined, undefined);

    expect(down.filter((entry) => entry.pool !== undefined).every((entry) => entry.pool!.dice === 0 && entry.pool!.incapacitated)).toBe(true);
  });

  test('Two Weapons shows both difficulties and the special manoeuvres their word', () => {
    const ranged = manoeuvreRows(character(), 'ranged', undefined, undefined);

    expect(row(ranged, 'Two Weapons').difficulty).toBe('6 / 7');
    expect(row(ranged, 'Multiple Shots').accuracy).toBe('Special');
    expect(row(ranged, 'Automatic Fire')).toMatchObject({ accuracy: '+10', difficulty: '8 (+2)', damage: 'Special' });
  });
});

describe('weapon rows', () => {
  test('the Sap shows damage, type, concealment and the pool with Melee 0', () => {
    const sap = meleeWeaponRows(character(), undefined).find((entry) => entry.name === 'Sap')!;

    expect(sap).toMatchObject({ damage: 'Str +1', type: 'bashing', conceal: 'P', pool: { dice: 3, formula: 'Dexterity 3 + Melee 0' } });
  });

  test('lists the six melee weapons', () => {
    expect(meleeWeaponRows(character(), undefined).map((entry) => entry.name)).toEqual(['Sap', 'Club', 'Knife', 'Sword', 'Axe', 'Stake']);
  });

  test('the light revolver shows what the chart prints', () => {
    const revolver = rangedWeaponRows(character((c) => (c.abilities.firearms = 2)), undefined).find((entry) => entry.name === 'Revolver, Lt.')!;

    expect(revolver).toMatchObject({ damage: '4', range: 12, rate: 3, clip: '6', conceal: 'P', pool: { dice: 5, formula: 'Dexterity 3 + Firearms 2' } });
  });

  test('a chambered round is written as the chart writes it, and automatic weapons are tagged', () => {
    const rows = rangedWeaponRows(character(), undefined);

    expect(rows.find((entry) => entry.name === 'Pistol, Lt.')!.clip).toBe('15+1');
    expect(rows.find((entry) => entry.name === 'SMG, Small')!.tags).toEqual(['Full-auto capable']);
    expect(rows.find((entry) => entry.name === 'Rifle')!.tags).toEqual([]);
  });

  test('marks the selected weapon', () => {
    expect(meleeWeaponRows(character(), 'Axe').filter((entry) => entry.selected).map((entry) => entry.name)).toEqual(['Axe']);
  });

  test('finds a weapon of either chart by name', () => {
    expect(weaponNamed('Sap')?.kind).toBe('melee');
    expect(weaponNamed('Rifle')?.kind).toBe('ranged');
    expect(weaponNamed('Nothing')).toBeUndefined();
    expect(weaponNamed(undefined)).toBeUndefined();
  });
});
