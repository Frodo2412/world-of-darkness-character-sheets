// How the book's combat values are written on the tables: "Normal", "+1", "Str +1", "Weapon".

import type { Manoeuvre, Effect, ManoeuvreDamage } from '../../domain/v20/combat/data/manoeuvres';
import type { Damage } from '../../domain/v20/combat/data/types';

/** "Normal" for no change and "+N" for N more; the entry's own word when it is "Special". */
export function accuracyText(accuracy: Manoeuvre['accuracy']): string {
  if (accuracy === 'special') return 'Special';
  return accuracy === 0 ? 'Normal' : `+${accuracy}`;
}

/** The difficulty a manoeuvre adds, as the table prints it; "+1 (off-hand only)" when it applies in some cases only. */
export function difficultyText({ difficulty, difficultyNote }: Pick<Manoeuvre, 'difficulty' | 'difficultyNote'>): string {
  const text = difficulty === 0 ? 'Normal' : `+${difficulty}`;
  return difficultyNote === undefined ? text : `${text} (${difficultyNote} only)`;
}

/** A damage pool as the book prints it: "Str", "Str +2" or a fixed "4". */
export function damageText({ strength, flat }: Damage): string {
  if (flat !== undefined) return String(flat);
  return strength === undefined || strength === 0 ? 'Str' : `Str +${strength}`;
}

/** A manoeuvre's damage: dice as above, "Weapon" (the weapon's own), "Special" or "None". */
export function manoeuvreDamageText(damage: ManoeuvreDamage): string {
  switch (damage.kind) {
    case 'dice':
      return damageText(damage.dice);
    case 'weapon':
      return 'Weapon';
    case 'special':
      return 'Special';
    case 'none':
      return 'None';
  }
}

const EFFECT_WORDS: Record<Effect, string> = {
  aggravated: 'Aggravated damage',
  'carries-over': 'Carries over on successive turns',
  knockdown: 'Causes knockdown',
  'reduces-attack': "Reduces an opponent's attack successes",
};

/** The table's footnote marks as words, "Aggravated damage; Causes knockdown". */
export const effectsText = (effects: readonly Effect[]): string => effects.map((effect) => EFFECT_WORDS[effect]).join('; ');

/** "p. 276". */
export const pageText = (page: number): string => `p. ${page}`;
