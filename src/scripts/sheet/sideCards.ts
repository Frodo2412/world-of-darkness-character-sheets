import { namedRows, type V20Character } from '../../domain/v20/character';
import { disciplineReadings, type DisciplineReading, type PowerReading } from '../../domain/v20/disciplines';
import { diceLabel } from '../../domain/v20/identity';
import { poolFormula } from '../../domain/v20/poolText';
import { lookup, showBlock } from './draw';

/** One line per named Discipline, "Presence 3", in the order stored; a Discipline rated 0 is still listed. */
export function disciplineLines(character: V20Character): string[] {
  return namedRows(character.disciplines).map((row) => `${row.name} ${row.rating}`);
}

function element(tag: string, className: string, text?: string): HTMLElement {
  const created = document.createElement(tag);
  created.className = className;
  if (text !== undefined) created.textContent = text;
  return created;
}

/** A power: its name, the dice to roll and the pool they come from, and what it uses instead of, or as well as, that pool. */
function powerItem({ name, pool, note }: PowerReading): HTMLElement {
  const item = element('li', 'power');
  item.append(element('span', 'power-name', name));
  if (pool?.total !== undefined) item.append(element('span', 'power-dice', diceLabel(pool.total)));
  const detail = [pool && poolFormula(pool), note].filter((part) => part !== undefined).join(' · ');
  if (detail !== '') item.append(element('span', 'power-detail', detail));
  return item;
}

const hasDetail = (reading: DisciplineReading): boolean => reading.note !== undefined || reading.powers.length > 0;

/** A Discipline's line; one with powers or a note opens to show them. */
function disciplineItem(reading: DisciplineReading, open: boolean): HTMLElement {
  const item = element('li', 'discipline');
  const line = `${reading.name} ${reading.rating}`;
  if (!hasDetail(reading)) {
    item.append(element('span', 'discipline-entry', line));
    return item;
  }

  const details = document.createElement('details');
  details.dataset.discipline = reading.name;
  details.open = open;
  details.append(element('summary', 'discipline-entry', line));
  if (reading.note !== undefined) details.append(element('p', 'discipline-note', reading.note));
  if (reading.powers.length > 0) {
    const powers = element('ul', 'power-list');
    powers.append(...reading.powers.map(powerItem));
    details.append(powers);
  }
  item.append(details);
  return item;
}

// What each list last drew, so a redraw that changes nothing leaves the list, and what is open in it, alone.
const drawn = new WeakMap<Element, string>();

/** Draws the Disciplines card's play list and its empty-state line. */
export function drawSideCards(root: ParentNode, character: V20Character): void {
  const readings = disciplineReadings(character);
  const list = lookup(root, '[data-disciplines-list]');

  const signature = JSON.stringify(readings);
  if (drawn.get(list) !== signature) {
    // A Discipline stays as the player left it, open or closed; on the first draw the first one is open.
    const wasOpen = new Map(
      [...list.querySelectorAll<HTMLDetailsElement>('details')].map((details) => [details.dataset.discipline, details.open]),
    );
    const firstWithDetail = wasOpen.size === 0 ? readings.find(hasDetail) : undefined;
    list.replaceChildren(
      ...readings.map((reading) => disciplineItem(reading, wasOpen.get(reading.name) ?? reading === firstWithDetail)),
    );
    drawn.set(list, signature);
  }
  list.hidden = readings.length === 0;
  showBlock(root, 'disciplines.empty', readings.length === 0);
}
