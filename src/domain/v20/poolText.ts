import type { DicePool } from './resources';
import { MINUS_SIGN } from './text';

/**
 * The words of a dice pool, with each trait's full label: "Dexterity 3 + Brawl 1 − wound 1". The
 * wound is written only once there is a whole pool to take it from. Every place a pool is shown or
 * spoken uses this.
 */
export function poolFormula({ attribute, ability, woundPenalty, total }: DicePool): string {
  const terms = [attribute, ability].filter((term) => term !== undefined).map((term) => `${term.label} ${term.rating}`);
  const formula = terms.join(' + ');
  return total !== undefined && woundPenalty !== undefined ? `${formula} ${MINUS_SIGN} wound ${woundPenalty}` : formula;
}
