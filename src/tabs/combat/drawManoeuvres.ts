import { diceLabel } from '../../domain/v20/identity';
import type { Manoeuvre } from '../../domain/v20/combat/data/manoeuvres';
import type { CombatPool } from '../../domain/v20/combat/pools';
import type { RequirementReading } from '../../domain/v20/combat/requirements';
import { cloneOf, field, reconcile, setField, setText } from './dom';
import { accuracyText, difficultyText, effectsText, manoeuvreDamageText, pageText } from './text';

/** A manoeuvre, the character's pool for it and what it needs: one row of a manoeuvre table. */
export interface ManoeuvreRow {
  manoeuvre: Manoeuvre;
  pool: CombatPool;
  /** What each requirement of the manoeuvre needs, and whether the character meets it. */
  requirements: readonly RequirementReading[];
  /** The weapon chosen for the roll, by name: a weapon requirement it meets says the manoeuvre uses it. */
  weapon?: string;
}

/**
 * What a row says of the manoeuvre's requirements, all in words: an unmet one makes it "Unavailable", names its
 * tag and says what is needed; a met weapon requirement says the manoeuvre uses the weapon; a met one else is silent.
 */
function marksOf({ requirements, weapon }: ManoeuvreRow): Record<string, string> {
  const unmet = requirements.filter(({ met }) => !met);
  const usesWeapon = requirements.some(({ met, requirement }) => met && requirement.kind === 'weapon');
  return {
    unavailable: unmet.length > 0 ? 'Unavailable' : '',
    tags: [...new Set(unmet.map(({ tag }) => tag))].join(' · '),
    requirement: unmet.map(({ text }) => text).join('; '),
    uses: usesWeapon && weapon !== undefined ? `Uses the ${weapon}` : '',
  };
}

function drawRow(row: HTMLElement, manoeuvreRow: ManoeuvreRow): void {
  const { manoeuvre, pool } = manoeuvreRow;
  setText(field(row, 'name'), manoeuvre.name);
  setText(field(row, 'pool'), diceLabel(pool.dice));
  setText(field(row, 'formula'), pool.formula);
  setText(field(row, 'accuracy'), accuracyText(manoeuvre.accuracy));
  setText(field(row, 'difficulty'), difficultyText(manoeuvre));
  setText(field(row, 'damage'), manoeuvreDamageText(manoeuvre.damage));
  setText(field(row, 'effects'), effectsText(manoeuvre.effects));
  setText(field(row, 'page'), pageText(manoeuvre.page));
  for (const [name, text] of Object.entries(marksOf(manoeuvreRow))) setField(row, name, text);
}

/** Makes the body of a manoeuvre table hold the rows, one to a manoeuvre, copied from the template. */
export function drawManoeuvres(body: HTMLElement, template: HTMLTemplateElement, rows: readonly ManoeuvreRow[]): void {
  reconcile(body, rows, ({ manoeuvre }) => manoeuvre.name, () => cloneOf(template), drawRow);
}
