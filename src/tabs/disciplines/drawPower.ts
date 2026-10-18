import type { DisciplineView, PowerView } from '../../domain/v20/disciplineView';
import { el, replaceKeepingFocus } from '../../scripts/dossier/dom';

/** What identifies a power across redraws: which of the open ones to keep open. */
export const powerKey = (discipline: string, power: PowerView): string => `${discipline}/${power.name}`;

const stateText = (power: PowerView): string => (power.state === 'known' ? 'Known' : 'Locked');

function rule(label: string, value: string): HTMLElement {
  const block = el('div', 'discipline-rule');
  block.append(el('dt', undefined, label), el('dd', undefined, value));
  return block;
}

function icon(name: string): HTMLElement {
  const mark = el('span', `discipline-icon discipline-icon-${name}`);
  mark.setAttribute('aria-hidden', 'true');
  return mark;
}

/** The line that is always shown: the level, the name and what it is, and (closed) a line of what it does. */
function summaryOf(discipline: string, power: PowerView): HTMLElement {
  const summary = el('summary', 'discipline-power-summary');
  summary.dataset.focusKey = powerKey(discipline, power);

  const level = el('span', 'discipline-power-level');
  level.append(el('span', 'visually-hidden', 'Level '), String(power.level));

  const title = el('span', 'discipline-power-title');
  const state = el('span', 'discipline-power-state', stateText(power));
  state.dataset.state = power.state;
  title.append(el('span', 'discipline-power-name', power.name), state);

  const info = el('span', 'discipline-power-info');
  // Closed: a line of what the power does. Open: what it is. The stylesheet shows one.
  const blurb = power.requires === undefined ? power.summary : `${power.requires} · ${power.summary}`;
  info.append(title, el('span', 'discipline-power-kind', `Level ${power.level} power · ${stateText(power)}`), el('span', 'discipline-power-blurb', blurb));

  const marks = el('span', 'discipline-power-marks');
  marks.append(icon('book'), icon(power.state === 'locked' ? 'lock' : 'chevron'));
  summary.append(level, info, marks);
  return summary;
}

function poolBox(discipline: string, power: PowerView): HTMLElement {
  const box = el('div', 'discipline-power-pool');
  if (power.state === 'locked') {
    box.append(el('p', 'discipline-power-locked', `Locked — requires ${power.requires!.replace(/^Requires /, '')}`));
    return box;
  }
  if (power.yourPool === undefined) {
    box.append(el('p', 'discipline-power-pool-instead', `Uses instead of a roll: ${power.usesInstead ?? ''}`));
    return box;
  }
  const { text, formula, incapacitated } = power.yourPool;
  const words = el('div', 'discipline-power-pool-words');
  words.append(el('p', 'discipline-power-pool-total', text), el('p', 'discipline-power-pool-formula', formula));
  if (incapacitated) words.append(el('p', 'discipline-power-pool-flag', 'Incapacitated · cannot act'));
  const build = el('button', 'discipline-power-build');
  build.type = 'button';
  build.dataset.buildPool = powerKey(discipline, power);
  build.append(icon('arrow'), 'Build pool');
  box.append(words, build);
  return box;
}

function bodyOf(discipline: string, power: PowerView): HTMLElement {
  const body = el('div', 'discipline-power-body');
  const first = el('dl', 'discipline-rules discipline-rules-three');
  first.append(rule('Activation cost', power.cost), rule('Duration', power.duration), rule('Prerequisite', power.prerequisite));
  const second = el('dl', 'discipline-rules discipline-rules-two');
  second.append(rule('Dice pool', power.poolRule), rule('Difficulty / resistance', power.difficulty));
  const source = el('p', 'discipline-power-source');
  source.append(icon('book-small'), `${power.reference} · Disciplines → ${discipline} → ${power.name}`);
  body.append(el('p', 'discipline-power-text', power.summary), el('hr', 'discipline-power-rule'), first, second, poolBox(discipline, power), source);
  return body;
}

function powerItem(discipline: string, power: PowerView, open: boolean): HTMLElement {
  const item = el('li', 'discipline-power-item');
  const details = el('details', 'dossier-disclosure discipline-power');
  details.open = open;
  details.dataset.power = powerKey(discipline, power);
  details.dataset.state = power.state;
  details.append(summaryOf(discipline, power), bodyOf(discipline, power));
  item.append(details);
  return item;
}

/** Draws the chosen Discipline's powers, each a disclosure that stays open or closed as the player left it. */
export function drawPowers(list: HTMLElement, view: DisciplineView, isOpen: (key: string) => boolean): void {
  replaceKeepingFocus(
    list,
    view.powers.map((power) => powerItem(view.key, power, isOpen(powerKey(view.key, power)))),
  );
}
