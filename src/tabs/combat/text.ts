// How the book's combat values are written on the tables: "Normal", "+1", "Str +1", "Weapon".

import type { Manoeuvre, Effect, ManoeuvreDamage } from '../../domain/v20/combat/data/manoeuvres';
import type { CalledShot, RangeBand } from '../../domain/v20/combat/data/modifiers';
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

/** "Small (hand, head, cellphone)": a Target the way the picker offers it. */
export const calledShotLabel = ({ label, examples }: CalledShot): string => `${label} (${examples})`;

/** "+2", or "no modifier" for nothing: a Targeting table value. */
const modifierText = (value: number): string => (value === 0 ? 'no modifier' : `+${value}`);

/** What the chosen Target adds, as the Targeting table prints it: "Targeting table: difficulty +2, damage +1 (V20 p. 274)". */
export const calledShotNote = ({ difficulty, damage, page }: CalledShot): string =>
  `Targeting table: difficulty ${modifierText(difficulty)}, damage ${modifierText(damage)} (V20 p. ${page})`;

/** How far a Range is, as the Range maneuver words it: "Within 2 meters", "Up to 2 times the weapon's range". */
function reachText({ reach }: RangeBand): string {
  if ('withinMeters' in reach) return `Within ${reach.withinMeters} meters`;
  return reach.timesRange === 1 ? "Up to the weapon's range" : `Up to ${reach.timesRange} times the weapon's range`;
}

/** What the chosen Range means: "Point blank: within 2 meters, difficulty 4 (V20 p. 278)". */
export const rangeNote = (band: RangeBand): string =>
  `${band.label}: ${reachText(band).toLowerCase()}, difficulty ${band.difficulty} (V20 p. ${band.page})`;
