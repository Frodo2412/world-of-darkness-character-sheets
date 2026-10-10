import type { PowerView } from '../../domain/v20/disciplineView';
import { field, setText } from './dom';

const STATE_WORD: Record<PowerView['state'], string> = { known: 'Known', locked: 'Locked' };

/** Draws one power's row: its name, whether it is Known or Locked, and what a Locked one requires. */
export function drawPower(item: HTMLElement, power: PowerView): void {
  item.dataset.state = power.state;
  setText(field(item, 'name'), power.name);
  setText(field(item, 'state'), STATE_WORD[power.state]);
  const requirement = field(item, 'requirement');
  setText(requirement, power.requirement ?? '');
  requirement.hidden = power.requirement === undefined;
}
