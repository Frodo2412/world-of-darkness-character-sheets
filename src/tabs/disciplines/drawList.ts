import { DISCIPLINE_LEVELS, type DisciplineScope, type DisciplineView } from '../../domain/v20/disciplineView';
import { setAttr } from '../../scripts/sheet/draw';
import { cloneOf, field, reconcile, setText } from './dom';
import { drawPower } from './drawPower';

/** The five dots of a rating, filled up to what it unlocks. Drawn for the eye; the rating is also in words. */
const dotsOf = (rating: number): string => {
  const filled = Math.min(rating, DISCIPLINE_LEVELS);
  return '●'.repeat(filled) + '○'.repeat(DISCIPLINE_LEVELS - filled);
};

/** What the list and the detail copy their rows from. */
export interface Templates {
  item: HTMLTemplateElement;
  power: HTMLTemplateElement;
}

/** The parts of the panel the draw functions write into. */
export interface Parts {
  /** The segmented control that chooses between "Owned" and "All disciplines". */
  scope: HTMLElement;
  list: HTMLElement;
  detail: HTMLElement;
  powers: HTMLElement;
  /** Shown instead of the list when the character has no Disciplines. */
  none: HTMLElement;
  /** Shown instead of the list when a search leaves no Discipline or power. */
  noMatch: HTMLElement;
}

/** The button reads "Owned · 3": its text is changed, its mark left in place. */
function drawOwnedCount(button: HTMLButtonElement, count: number): void {
  const label = `Owned · ${count}`;
  const written = [...button.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE);
  if (written.length === 1 && written[0].textContent?.trim() === label) return;
  for (const node of written) node.remove();
  button.append(label);
}

/** The segmented control: the button for `scope` pressed, and the number of Disciplines the character has on "Owned". */
export function drawScope(parts: Parts, scope: DisciplineScope, ownedCount: number): void {
  for (const button of parts.scope.querySelectorAll<HTMLButtonElement>('button')) {
    setAttr(button, 'aria-pressed', String(button.dataset.value === scope));
    if (button.dataset.value === 'owned') drawOwnedCount(button, ownedCount);
  }
}

function drawItem(item: HTMLElement, discipline: DisciplineView, selected: boolean): void {
  const button = item.querySelector('button')!;
  setAttr(button, 'data-value', discipline.key);
  if (selected) setAttr(button, 'aria-current', 'true');
  else button.removeAttribute('aria-current');
  setText(field(item, 'name'), discipline.name);
  setText(field(item, 'rating'), discipline.ratingText);
  setText(field(item, 'dots'), dotsOf(discipline.rating));
  setText(field(item, 'unlocked'), discipline.unlockedText);
}

/** The Disciplines listed, the one at `selected` marked. */
export function drawList(parts: Parts, templates: Templates, disciplines: readonly DisciplineView[], selected: string | undefined): void {
  reconcile(
    parts.list,
    disciplines,
    (discipline) => discipline.key,
    () => cloneOf(templates.item),
    (item, discipline) => drawItem(item, discipline, discipline.key === selected),
  );
}

/** The selected Discipline's heading, rating and powers; nothing when there is none. */
export function drawDetail(parts: Parts, templates: Templates, discipline: DisciplineView | undefined): void {
  parts.detail.hidden = discipline === undefined;
  if (discipline === undefined) return;
  const { detail } = parts;
  setText(field(detail, 'name'), discipline.name);
  setText(field(detail, 'rating'), discipline.ratingText);
  setText(field(detail, 'dots'), dotsOf(discipline.rating));
  setText(field(detail, 'unlocked'), discipline.unlockedText);
  const note = field(detail, 'note');
  // The note says what a Discipline does when it lists no powers.
  setText(note, discipline.powers.length === 0 ? (discipline.note ?? '') : '');
  note.hidden = note.textContent === '';
  parts.powers.hidden = discipline.powers.length === 0;
  reconcile(
    parts.powers,
    discipline.powers,
    (power) => `${discipline.key}:${power.level}`,
    () => cloneOf(templates.power),
    drawPower,
  );
}
