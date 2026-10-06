import type { V20Character } from '../../domain/v20/character';
import { diceLabel } from '../../domain/v20/identity';
import { dicePool, type DicePool, type PoolSelection } from '../../domain/v20/resources';
import { MINUS_SIGN, lookup, showBlock, showOptional } from './draw';

export interface PoolReadout {
  formula: string;
  prompt: string;
  total: string;
  /** The "cannot act" notice: only while something is selected. */
  incapacitated: boolean;
}

/** The terms the player chose, and the wound once there is a whole pool to take it from. */
function formulaOf({ attribute, ability, woundPenalty, total }: DicePool): string {
  const terms = [attribute, ability].filter((term) => term !== undefined).map((term) => `${term.label} ${term.rating}`);
  const formula = terms.join(' + ');
  return total !== undefined && woundPenalty !== undefined ? `${formula} ${MINUS_SIGN} wound ${woundPenalty}` : formula;
}

function promptOf({ attribute, ability }: DicePool): string {
  if (attribute && ability) return '';
  if (attribute) return 'Select an ability';
  if (ability) return 'Select an attribute';
  return 'Select an attribute and an ability';
}

/** The words of the Selected pool card; an empty string is a line the card does not show. */
export function poolReadout(pool: DicePool): PoolReadout {
  return {
    formula: formulaOf(pool),
    prompt: promptOf(pool),
    total: pool.total === undefined ? '' : diceLabel(pool.total),
    incapacitated: pool.incapacitated && (pool.attribute !== undefined || pool.ability !== undefined),
  };
}

/** What a selection says to assistive technology: the whole pool, and only once it is whole. */
export function poolAnnouncement(pool: DicePool): string {
  return pool.total === undefined ? '' : `Dice pool: ${formulaOf(pool)}, ${diceLabel(pool.total)}`;
}

/** Writes the card's live region: the pool when a selection completes it, else nothing, so the next one is heard afresh. */
export function announcePool(root: ParentNode, character: V20Character, selection: PoolSelection): void {
  const region = lookup(root, '[data-live="pool"]');
  const text = poolAnnouncement(dicePool(character, selection));
  // Said again only when it differs, so a health change that leaves the total alone stays silent.
  if (region.textContent !== text) region.textContent = text;
}

/** Draws the Selected pool card from the character and the selection; the rows' selected state is drawn with the rows. */
export function drawPoolCard(root: ParentNode, character: V20Character, selection: PoolSelection): void {
  const { formula, prompt, total, incapacitated } = poolReadout(dicePool(character, selection));
  showOptional(root, 'pool.formula', formula);
  showOptional(root, 'pool.prompt', prompt);
  showOptional(root, 'pool.total', total);
  showBlock(root, 'pool.incapacitated', incapacitated);
}
