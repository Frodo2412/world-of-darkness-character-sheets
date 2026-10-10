import { describe, expect, test } from 'vitest';
import { blankCharacter, type V20Character } from '../character';
import { CALLED_SHOTS } from './data/modifiers';
import { RANGED_WEAPONS } from './data/ranged';
import { MELEE_WEAPONS } from './data/weapons';
import { damagePool, DAMAGE_DIFFICULTY } from './damage';

const weapon = (name: string) => [...MELEE_WEAPONS, ...RANGED_WEAPONS].find((entry) => entry.name === name)!;
const calledShot = (key: string) => CALLED_SHOTS.find((entry) => entry.key === key)!;

function strong(strength: number, arrange: (character: V20Character) => void = () => {}): V20Character {
  const character = blankCharacter('abc');
  character.attributes.strength = strength;
  arrange(character);
  return character;
}

describe('damagePool', () => {
  test('Strength + 1 with Strength 3 and 2 extra successes is 6 dice', () => {
    expect(damagePool(strong(3), weapon('Sap'), 2)).toMatchObject({
      dice: 6,
      formula: 'Strength 3 + 1 + extra successes 2',
      type: 'bashing',
      difficulty: 6,
      extraSuccesses: 2,
    });
    expect(DAMAGE_DIFFICULTY).toBe(6);
  });

  test('a weapon with flat damage ignores Strength', () => {
    expect(damagePool(strong(3), weapon('Revolver, Lt.'), 0)).toMatchObject({ dice: 4, formula: '4', extraSuccesses: 0 });
    expect(damagePool(strong(0), weapon('Revolver, Lt.'), 0).dice).toBe(4);
  });

  test('a negative entry of extra successes counts as 0 and never lowers the weapon\'s own damage', () => {
    expect(damagePool(strong(3), weapon('Revolver, Lt.'), -2)).toMatchObject({ dice: 4, extraSuccesses: 0, formula: '4' });
    expect(damagePool(strong(3), weapon('Sap'), -9).dice).toBe(4);
  });

  test('a Strength of 0 with Str +1 reads 1 and the dice are never below 0', () => {
    expect(damagePool(strong(0), weapon('Sap'), 0)).toMatchObject({ dice: 1, formula: 'Strength 0 + 1' });
    expect(damagePool(strong(0), { ...weapon('Sap'), damage: { strength: 0 } }, 0).dice).toBe(0);
  });

  test('the called shot adds its damage from the Targeting table', () => {
    expect(damagePool(strong(2), weapon('Sap'), 0, calledShot('small'))).toMatchObject({ dice: 4, formula: 'Strength 2 + 1 + Target 1' });
    expect(damagePool(strong(2), weapon('Sap'), 0, calledShot('medium')).dice).toBe(3);
    expect(damagePool(strong(2), weapon('Sap'), 1, calledShot('precise')).dice).toBe(6);
  });

  test('a melee weapon has its type from the chart and a firearm has none', () => {
    expect(damagePool(strong(2), weapon('Knife'), 0).type).toBe('lethal');
    expect(damagePool(strong(2), weapon('Club'), 0).type).toBe('bashing');
    expect(damagePool(strong(2), weapon('Rifle'), 0)).not.toHaveProperty('type');
  });

  test('a wound does not take dice off the damage', () => {
    const hurt = strong(3, (c) => void (c.health.crippled = 'lethal'));

    expect(damagePool(hurt, weapon('Sap'), 0)).toMatchObject({ dice: 4, incapacitated: false });
  });

  test('an Incapacitated character does 0 dice of damage and says why', () => {
    const down = strong(3, (c) => {
      for (const level of Object.keys(c.health) as (keyof typeof c.health)[]) c.health[level] = 'lethal';
    });

    expect(damagePool(down, weapon('Sap'), 2)).toMatchObject({
      dice: 0,
      incapacitated: true,
      reason: 'Incapacitated: every pool is 0 dice.',
    });
  });
});
