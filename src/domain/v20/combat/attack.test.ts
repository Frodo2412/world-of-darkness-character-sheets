import { describe, expect, test } from 'vitest';
import { blankCharacter, type V20Character } from '../character';
import { attackPool, baseDifficulty, NO_MODIFIERS } from './attack';
import { CALLED_SHOTS, RANGE_BANDS } from './data/modifiers';
import { MANOEUVRES } from './data/manoeuvres';
import { RANGED_WEAPONS } from './data/ranged';
import { MELEE_WEAPONS } from './data/weapons';

const character = (change: (c: V20Character) => void = () => {}): V20Character => {
  const base = blankCharacter('abc');
  base.attributes.dexterity = 3;
  base.abilities.brawl = 1;
  base.abilities.firearms = 2;
  change(base);
  return base;
};

const manoeuvre = (name: string) => MANOEUVRES.find((entry) => entry.name === name)!;

describe('attackPool', () => {
  test('is the manoeuvre pool at the ordinary difficulty with no modifiers', () => {
    const pool = attackPool(character(), manoeuvre('Strike'), undefined);

    expect(pool).toMatchObject({ dice: 4, difficulty: 6, accuracy: '+0', formula: 'Dexterity 3 + Brawl 1' });
  });

  test('one more die and one more difficulty change the pool and the difficulty', () => {
    const pool = attackPool(character(), manoeuvre('Weapon Strike'), MELEE_WEAPONS[0], { ...NO_MODIFIERS, dice: 1, difficulty: 1 });

    expect(pool).toMatchObject({ dice: 4, difficulty: 7 });
  });

  test('is floored at 0 dice', () => {
    expect(attackPool(character(), manoeuvre('Strike'), undefined, { ...NO_MODIFIERS, dice: -9 }).dice).toBe(0);
  });

  test('a wound larger than the pool is not paid back by a dice modifier: the sum is floored once', () => {
    const crippled = character((c) => {
      c.attributes.dexterity = 1;
      c.abilities.brawl = 0;
      c.health.crippled = 'lethal';
    });

    expect(attackPool(crippled, manoeuvre('Strike'), undefined, { ...NO_MODIFIERS, dice: 3 }).dice).toBe(0);
  });

  test('is 0 dice, whatever is added, when the character is incapacitated', () => {
    const arranged = character((c) => (c.health.incapacitated = 'lethal'));

    expect(attackPool(arranged, manoeuvre('Strike'), undefined, { ...NO_MODIFIERS, dice: 5 })).toMatchObject({ dice: 0, incapacitated: true });
  });

  test("adds the manoeuvre's own difficulty and says its accuracy", () => {
    expect(attackPool(character(), manoeuvre('Kick'), undefined)).toMatchObject({ difficulty: 7, accuracy: '+0' });
    expect(attackPool(character(), manoeuvre('Bite'), undefined)).toMatchObject({ accuracy: '+1' });
    expect(attackPool(character(), manoeuvre('Dodge'), undefined).accuracy).toBe('Special');
  });

  test('every called shot adds its difficulty', () => {
    for (const shot of CALLED_SHOTS) {
      const pool = attackPool(character(), manoeuvre('Strike'), undefined, { ...NO_MODIFIERS, target: shot.key });
      expect(pool.difficulty, shot.label).toBe(6 + shot.difficulty);
    }
  });

  test('a ranged attack takes its difficulty from the range band: point blank, short and long', () => {
    const weapon = RANGED_WEAPONS[0];
    for (const band of RANGE_BANDS) {
      const pool = attackPool(character(), manoeuvre('Multiple Shots'), weapon, { ...NO_MODIFIERS, range: band.key });
      expect(pool.difficulty, band.label).toBe(band.difficulty);
    }
  });

  test('a ranged attack with no range chosen is at short range', () => {
    expect(attackPool(character(), manoeuvre('Multiple Shots'), RANGED_WEAPONS[0]).difficulty).toBe(6);
  });

  test('range and called shot and manoeuvre all add', () => {
    const pool = attackPool(character(), manoeuvre('Three-Round Burst'), RANGED_WEAPONS[5], { ...NO_MODIFIERS, range: 'short', target: 'small' });

    expect(pool.difficulty).toBe(6 + 1 + 2);
  });

  test('is kept between 2 and 10', () => {
    expect(attackPool(character(), manoeuvre('Strike'), undefined, { ...NO_MODIFIERS, difficulty: -9 }).difficulty).toBe(2);
    expect(attackPool(character(), manoeuvre('Strike'), undefined, { ...NO_MODIFIERS, difficulty: 9 }).difficulty).toBe(10);
  });

  test('the manoeuvre difficulty ignores what the player set', () => {
    const pool = attackPool(character(), manoeuvre('Kick'), undefined, { ...NO_MODIFIERS, difficulty: 2, target: 'precise' });

    expect(pool.manoeuvreDifficulty).toBe(7);
  });
});

describe('baseDifficulty', () => {
  test('is 6 for a close combat manoeuvre and the short range band for a ranged one', () => {
    expect(baseDifficulty(manoeuvre('Strike'), undefined, {})).toBe(6);
    expect(baseDifficulty(manoeuvre('Automatic Fire'), undefined, {})).toBe(6 + 2);
  });
});
