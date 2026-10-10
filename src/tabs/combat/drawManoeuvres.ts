import { diceLabel } from '../../domain/v20/identity';
import type { Manoeuvre } from '../../domain/v20/combat/data/manoeuvres';
import type { CombatPool } from '../../domain/v20/combat/pools';
import { cloneOf, field, reconcile, setText } from './dom';
import { accuracyText, difficultyText, effectsText, manoeuvreDamageText, pageText } from './text';

/** A manoeuvre and the character's pool for it: one row of a manoeuvre table. */
export interface ManoeuvreRow {
  manoeuvre: Manoeuvre;
  pool: CombatPool;
}

function drawRow(row: HTMLElement, { manoeuvre, pool }: ManoeuvreRow): void {
  setText(field(row, 'name'), manoeuvre.name);
  setText(field(row, 'pool'), diceLabel(pool.dice));
  setText(field(row, 'formula'), pool.formula);
  setText(field(row, 'accuracy'), accuracyText(manoeuvre.accuracy));
  setText(field(row, 'difficulty'), difficultyText(manoeuvre));
  setText(field(row, 'damage'), manoeuvreDamageText(manoeuvre.damage));
  setText(field(row, 'effects'), effectsText(manoeuvre.effects));
  setText(field(row, 'page'), pageText(manoeuvre.page));
}

/** Makes the body of a manoeuvre table hold the rows, one to a manoeuvre, copied from the template. */
export function drawManoeuvres(body: HTMLElement, template: HTMLTemplateElement, rows: readonly ManoeuvreRow[]): void {
  reconcile(body, rows, ({ manoeuvre }) => manoeuvre.name, () => cloneOf(template), drawRow);
}
