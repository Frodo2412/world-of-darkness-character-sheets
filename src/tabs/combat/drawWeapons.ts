import { CONCEALMENT, type Weapon } from '../../domain/v20/combat/data/types';
import type { CombatPool } from '../../domain/v20/combat/pools';
import { diceLabel } from '../../domain/v20/identity';
import { setAttr } from '../../scripts/sheet/draw';
import { cloneOf, field, reconcile, setField } from './dom';
import { damageText, pageText } from './text';

/** A weapon, the character's pool for it and whether it is the one chosen for the roll: one row of a weapons table. */
export interface WeaponRow {
  weapon: Weapon;
  pool: CombatPool;
  selected: boolean;
}

const capitalised = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

/** The clip as the chart prints it: "6", or "15 (+1 in the chamber)". */
const clipText = (clip: number, chambered: boolean): string => (chambered ? `${clip} (+1 in the chamber)` : String(clip));

/** What each field of a weapon's row says; a table's template has the fields its columns need. */
function valuesOf({ weapon, pool }: WeaponRow): Record<string, string> {
  const values: Record<string, string> = {
    name: weapon.name,
    note: weapon.note ?? '',
    pool: diceLabel(pool.dice),
    formula: pool.formula,
    damage: damageText(weapon.damage),
    conceal: weapon.conceal,
    page: pageText(weapon.page),
  };
  if (weapon.kind === 'melee') {
    values.type = capitalised(weapon.type);
  } else {
    values.automatic = weapon.automatic ? 'Bursts and full auto' : '';
    values.example = weapon.example === undefined ? '' : `e.g. ${weapon.example}`;
    values.range = String(weapon.range);
    values.rate = String(weapon.rate);
    values.clip = clipText(weapon.clip, weapon.chambered);
  }
  return values;
}

function drawRow(row: HTMLElement, weaponRow: WeaponRow): void {
  for (const [name, text] of Object.entries(valuesOf(weaponRow))) setField(row, name, text);
  // The letter's meaning is on hover; the table's legend says them all in words.
  setAttr(field(row, 'conceal'), 'title', CONCEALMENT[weaponRow.weapon.conceal]);
  const use = field(row, 'use');
  setAttr(use, 'aria-pressed', String(weaponRow.selected));
  setAttr(use, 'aria-label', `Use in roll: ${weaponRow.weapon.name}`);
}

/** Makes the body of a weapons table hold the rows, one to a weapon, copied from the template. */
export function drawWeapons(body: HTMLElement, template: HTMLTemplateElement, rows: readonly WeaponRow[]): void {
  reconcile(body, rows, ({ weapon }) => weapon.name, () => cloneOf(template), drawRow);
}
