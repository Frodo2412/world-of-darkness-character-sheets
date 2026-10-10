import { diceLabel } from '../../domain/v20/identity';
import { fieldText, type PowerField, type PowerView } from '../../domain/v20/disciplineView';
import { poolFormula } from '../../domain/v20/poolText';
import { field, setText } from './dom';

const STATE_WORD: Record<PowerView['state'], string> = { known: 'Known', locked: 'Locked' };

/** The rule fields the panel lists, each in the element of the same name. */
const RULE_FIELDS: readonly PowerField[] = ['cost', 'duration', 'prerequisite', 'difficulty'];

/** Shows or hides a part of the panel; its text is untouched while hidden. */
const showWhen = (element: HTMLElement, visible: boolean): void => void (element.hidden = !visible);

/** What the Dice pool line says: the traits it rolls, with what the book adds, or what it uses instead of a roll. */
function diceText(power: PowerView): string {
  const { note } = power.rule;
  if (power.rolls === undefined) return note ?? '';
  return note === undefined ? power.rolls : `${power.rolls} (${note})`;
}

/** The power's rules as the book states them, and where to read more. */
function drawRules(item: HTMLElement, power: PowerView): void {
  const { rule } = power;
  const summary = field(item, 'summary');
  setText(summary, rule.summary ?? '');
  showWhen(summary, rule.summary !== undefined);
  for (const name of RULE_FIELDS) setText(field(item, name), fieldText(rule, name));
  setText(field(item, 'dice'), diceText(power));
  setText(field(item, 'reference'), `V20 p. ${rule.page}`);
}

/** What the character has of the power: why it is Locked, or the pool it rolls. A power with no roll has neither. */
function drawStanding(item: HTMLElement, power: PowerView): void {
  const locked = field(item, 'locked');
  setText(locked, power.requirement === undefined ? '' : `Locked — ${power.requirement.replace(/^Requires/, 'requires')}`);
  showWhen(locked, power.requirement !== undefined);

  const { pool } = power;
  showWhen(field(item, 'pool-block'), pool !== undefined);
  if (pool === undefined) return;
  setText(field(item, 'pool'), `Your pool: ${diceLabel(pool.total ?? 0)}`);
  setText(field(item, 'formula'), poolFormula(pool));
  showWhen(field(item, 'incapacitated'), pool.incapacitated);
}

/** Draws one power: its row (name, whether it is Known or Locked, what a Locked one requires) and, opened, its panel. */
export function drawPower(item: HTMLElement, power: PowerView): void {
  item.dataset.state = power.state;
  setText(field(item, 'name'), power.name);
  setText(field(item, 'state'), STATE_WORD[power.state]);
  const requirement = field(item, 'requirement');
  setText(requirement, power.requirement ?? '');
  showWhen(requirement, power.requirement !== undefined);
  drawRules(item, power);
  drawStanding(item, power);
}
