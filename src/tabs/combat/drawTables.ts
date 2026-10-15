import { diceLabel } from '../../domain/v20/identity';
import type { CombatPool } from '../../domain/v20/combat/pools';
import type { ManoeuvreRow, WeaponRow } from '../../domain/v20/combat/rows';
import { el, reconcile, replaceKeepingFocus } from '../../scripts/dossier/dom';

// The Combat tab's four tables. A row is drawn again only when what it shows has changed, so the
// "Use in roll" button a player has just pressed keeps its focus.

function tag(text: string): HTMLElement {
  const chip = el('span', 'dossier-badge combat-tag', text);
  chip.dataset.tag = text;
  return chip;
}

function nameCell(name: string, tags: readonly string[], selected: boolean, detail: string): HTMLElement {
  const cell = el('th', 'combat-name-cell');
  cell.scope = 'row';
  const line = el('span', 'combat-name-line');
  line.append(el('span', 'combat-name', name), ...tags.map(tag));
  if (selected) line.append(tag('Selected'));
  cell.append(line);
  if (detail !== '') cell.append(el('span', 'combat-detail', detail));
  return cell;
}

/** The pool's dice and how they are made: "3 dice" over "Dexterity 3 + Brawl 1 − wound 1". */
function poolCell(pool: CombatPool | undefined, unavailable: string | undefined): HTMLElement {
  const cell = el('td', 'combat-pool-cell');
  if (pool === undefined) {
    cell.append(el('span', 'combat-dice', 'Unavailable'), el('span', 'combat-formula-small', unavailable ?? ''));
    return cell;
  }
  cell.append(el('span', 'combat-dice', diceLabel(pool.dice)), el('span', 'combat-formula-small', pool.formula));
  return cell;
}

function textCell(text: string, className = ''): HTMLElement {
  return el('td', className, text);
}

function useCell(kind: 'manoeuvre' | 'weapon', name: string): HTMLElement {
  const cell = el('td', 'combat-use-cell');
  const button = el('button', 'combat-use', 'Use in roll');
  button.type = 'button';
  button.dataset.use = `${kind}:${name}`;
  button.dataset.focusKey = `use:${kind}:${name}`;
  button.setAttribute('aria-label', `Use ${name} in roll`);
  cell.append(button);
  return cell;
}

/** Draws a table's rows: one per entry, redrawn only when its content changed. */
function syncRows<T extends { name: string; selected: boolean }>(tbody: HTMLElement, rows: readonly T[], cellsOf: (row: T) => HTMLElement[]): void {
  reconcile(
    tbody,
    rows,
    (row) => row.name,
    () => el('tr', 'combat-row'),
    (tr, row) => {
      const signature = JSON.stringify(row);
      if (tr.dataset.signature === signature) return;
      tr.dataset.signature = signature;
      tr.classList.toggle('is-chosen', row.selected);
      replaceKeepingFocus(tr, cellsOf(row));
    },
  );
}

/** The manoeuvres table of one section. */
export function drawManoeuvres(tbody: HTMLElement, rows: readonly ManoeuvreRow[]): void {
  syncRows(tbody, rows, (row) => [
    nameCell(row.name, row.tags, row.selected, row.unavailable ?? row.weaponNeeded ?? row.description),
    poolCell(row.pool, row.unavailable),
    textCell(row.accuracy),
    textCell(row.difficulty),
    damageCell(row),
    useCell('manoeuvre', row.name),
  ]);
}

function damageCell(row: ManoeuvreRow): HTMLElement {
  const cell = el('td', 'combat-damage-cell');
  cell.append(el('span', 'combat-damage-text', row.damage));
  if (row.damageDice !== undefined && row.pool !== undefined) cell.append(el('span', 'combat-formula-small', diceLabel(row.damageDice)));
  return cell;
}

function concealCell(row: WeaponRow): HTMLElement {
  const cell = el('td', 'combat-conceal-cell');
  const abbr = el('abbr', undefined, row.conceal);
  abbr.title = row.concealMeaning;
  cell.append(abbr);
  return cell;
}

function typeCell(row: WeaponRow): HTMLElement {
  const cell = el('td', 'combat-type-cell');
  if (row.type === undefined) return cell;
  const icon = el('span', `combat-type-icon combat-type-${row.type}`);
  icon.setAttribute('aria-hidden', 'true');
  cell.append(icon, row.type === 'bashing' ? 'Bashing' : 'Lethal');
  return cell;
}

/** The melee weapons table. */
export function drawMeleeWeapons(tbody: HTMLElement, rows: readonly WeaponRow[]): void {
  syncRows(tbody, rows, (row) => [
    nameCell(row.name, row.tags, row.selected, row.detail),
    poolCell(row.pool, undefined),
    textCell(row.damage),
    typeCell(row),
    concealCell(row),
    useCell('weapon', row.name),
  ]);
}

/** The ranged weapons table: damage, range, rate, clip and concealment as the chart prints them. */
export function drawRangedWeapons(tbody: HTMLElement, rows: readonly WeaponRow[]): void {
  syncRows(tbody, rows, (row) => [
    nameCell(row.name, row.tags, row.selected, row.detail),
    poolCell(row.pool, undefined),
    textCell(row.damage),
    textCell(`${row.range} m`),
    textCell(String(row.rate)),
    textCell(row.clip ?? ''),
    concealCell(row),
    useCell('weapon', row.name),
  ]);
}
