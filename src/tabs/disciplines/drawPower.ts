import type { DisciplineView, PowerView } from '../../domain/v20/disciplineView';
import { el, replaceKeepingFocus } from '../../scripts/dossier/dom';

/** What identifies a power across redraws: which of the open ones to keep open. */
export const powerKey = (discipline: string, power: PowerView): string => `${discipline}/${power.name}`;

function field(label: string, value: string): [HTMLElement, HTMLElement] {
  return [el('dt', undefined, label), el('dd', undefined, value)];
}

function poolBlock(discipline: string, power: PowerView): HTMLElement | undefined {
  if (power.state === 'locked') return undefined;
  const block = el('div', 'discipline-power-pool');
  if (power.yourPool !== undefined) {
    const { text, formula, incapacitated } = power.yourPool;
    block.append(el('p', 'discipline-power-pool-total', text), el('p', 'discipline-power-pool-formula', formula));
    if (incapacitated) block.append(el('p', 'discipline-power-pool-flag', 'Incapacitated · cannot act'));
    const build = el('button', 'discipline-power-build-pool', 'Build pool');
    build.type = 'button';
    build.dataset.buildPool = powerKey(discipline, power);
    block.append(build);
  } else {
    block.append(el('p', 'discipline-power-pool-instead', `Uses instead of a roll: ${power.usesInstead ?? ''}`));
  }
  return block;
}

function powerItem(discipline: string, power: PowerView, open: boolean): HTMLElement {
  const item = el('li', 'discipline-power-item');
  const details = el('details', 'dossier-disclosure discipline-power');
  details.open = open;
  details.dataset.power = powerKey(discipline, power);

  const summary = el('summary', 'discipline-power-summary');
  summary.dataset.focusKey = powerKey(discipline, power);
  const state = el('span', 'dossier-badge discipline-power-state', power.state === 'known' ? 'Known' : 'Locked');
  state.dataset.state = power.state;
  // The summary stays a list item, which is what draws its disclosure marker; its line is laid out inside.
  const line = el('span', 'discipline-power-line');
  line.append(el('span', 'discipline-power-level', `Level ${power.level}`), el('span', 'discipline-power-name', power.name), state);
  if (power.requires !== undefined) line.append(el('span', 'discipline-power-requires', power.requires));
  summary.append(line);

  const body = el('div', 'discipline-power-body');
  const rules = el('dl', 'dossier-fields');
  rules.append(
    ...field('Activation cost', power.cost),
    ...field('Duration', power.duration),
    ...field('Prerequisite', power.prerequisite),
    ...field('Dice pool', power.poolRule),
    ...field('Difficulty / resistance', power.difficulty),
    ...field('Reference', power.reference),
  );
  body.append(el('p', 'discipline-power-text', power.summary), rules);
  if (power.requires !== undefined) body.append(el('p', 'discipline-power-locked', `Locked — requires ${power.requires.replace(/^Requires /, '')}`));
  const pool = poolBlock(discipline, power);
  if (pool !== undefined) body.append(pool);

  details.append(summary, body);
  item.append(details);
  return item;
}

/** Draws the chosen Discipline's powers, each a disclosure that stays open or closed as the player left it. */
export function drawPowers(list: HTMLElement, view: DisciplineView, isOpen: (key: string) => boolean): void {
  replaceKeepingFocus(
    list,
    view.powers.map((power) => powerItem(view.name, power, isOpen(powerKey(view.name, power)))),
  );
}
