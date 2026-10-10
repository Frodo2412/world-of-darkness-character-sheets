import { describe, expect, test } from 'vitest';
import { MANOEUVRES } from '../../domain/v20/combat/data/manoeuvres';
import { accuracyText, damageText, difficultyText, effectsText, manoeuvreDamageText, pageText } from './text';

const manoeuvre = (name: string) => MANOEUVRES.find((entry) => entry.name === name)!;

describe('the words of the tables', () => {
  test('accuracy is Normal, +N or Special', () => {
    expect(accuracyText(0)).toBe('Normal');
    expect(accuracyText(10)).toBe('+10');
    expect(accuracyText('special')).toBe('Special');
  });

  test('difficulty is Normal or +N, and says when it applies to some attacks only', () => {
    expect(difficultyText(manoeuvre('Strike'))).toBe('Normal');
    expect(difficultyText(manoeuvre('Kick'))).toBe('+1');
    expect(difficultyText(manoeuvre('Two Weapons'))).toBe('+1 (off-hand only)');
  });

  test('damage is Str, Str +N or a fixed number', () => {
    expect(damageText({ strength: 0 })).toBe('Str');
    expect(damageText({ strength: 3 })).toBe('Str +3');
    expect(damageText({ flat: 4 })).toBe('4');
  });

  test('a manoeuvre\'s damage is dice, Weapon, Special or None', () => {
    expect(manoeuvreDamageText(manoeuvre('Kick').damage)).toBe('Str +1');
    expect(manoeuvreDamageText(manoeuvre('Weapon Strike').damage)).toBe('Weapon');
    expect(manoeuvreDamageText(manoeuvre('Disarm').damage)).toBe('Special');
    expect(manoeuvreDamageText(manoeuvre('Block').damage)).toBe('None');
  });

  test('the footnote marks are written as words', () => {
    expect(effectsText([])).toBe('');
    expect(effectsText(manoeuvre('Bite').effects)).toBe('Aggravated damage');
    expect(effectsText(['knockdown', 'carries-over'])).toBe('Causes knockdown; Carries over on successive turns');
  });

  test('a page reads "p. N"', () => {
    expect(pageText(276)).toBe('p. 276');
  });
});
