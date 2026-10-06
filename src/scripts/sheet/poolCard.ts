import type { V20Character } from '../../domain/v20/character';
import { diceLabel } from '../../domain/v20/identity';
import { dicePool, type DicePool, type PoolSelection } from '../../domain/v20/resources';
import { show, showBlock } from './draw';

export interface PoolReadout {
  formula: string;
  prompt: string;
  total: string;
  /** The "cannot act" notice: only while something is selected. */
  incapacitated: boolean;
}

const MINUS = '−';

/** The terms the player chose, and the wound once there is a whole pool to take it from. */
function formulaOf({ attribute, ability, wound, total }: DicePool): string {
  const terms = [attribute, ability].filter((term) => term !== undefined).map((term) => `${term.label} ${term.rating}`);
  const formula = terms.join(' + ');
  return total !== undefined && wound !== undefined ? `${formula} ${MINUS} wound ${wound}` : formula;
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
  const region = root.querySelector<HTMLElement>('[data-live="pool"]')!;
  const text = poolAnnouncement(dicePool(character, selection));
  // Said again only when it differs, so a health change that leaves the total alone stays silent.
  if (region.textContent !== text) region.textContent = text;
}

/** Draws the Selected pool card, and which rows show as pressed, from the character and the selection. */
export function drawPoolCard(root: ParentNode, character: V20Character, selection: PoolSelection): void {
  const { formula, prompt, total, incapacitated } = poolReadout(dicePool(character, selection));
  for (const [name, text] of [
    ['pool.formula', formula],
    ['pool.prompt', prompt],
    ['pool.total', total],
  ]) {
    show(root, name, text);
    showBlock(root, name, text !== '');
  }
  showBlock(root, 'pool.incapacitated', incapacitated);

  const selected: (string | undefined)[] = [selection.attribute, selection.ability];
  for (const row of root.querySelectorAll<HTMLElement>('[data-trait-key]')) {
    const isSelected = selected.includes(row.dataset.traitKey);
    row.classList.toggle('is-selected', isSelected);
    row.querySelector('.trait-select')?.setAttribute('aria-pressed', String(isSelected));
  }
}
