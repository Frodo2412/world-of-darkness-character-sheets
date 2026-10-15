import type { DisciplineView } from '../../domain/v20/disciplineView';
import { el, replaceKeepingFocus, setText } from '../../scripts/dossier/dom';
import { readOnlyDots } from '../../scripts/dossier/dots';

/** "3 / 5": the rating out of the dots the Discipline is drawn with. */
export const ratingText = (view: DisciplineView): string => `${view.rating} / ${view.dots}`;

function listItem(view: DisciplineView, current: boolean): HTMLElement {
  const item = el('li', 'dossier-item');
  const button = el('button', 'dossier-item-button discipline-item');
  button.type = 'button';
  button.dataset.value = view.name;
  button.dataset.focusKey = view.name;
  if (current) button.setAttribute('aria-current', 'true');
  const body = el('span', 'discipline-item-body');
  const line = el('span', 'discipline-item-line');
  line.append(el('span', 'discipline-item-name', view.name), el('span', 'discipline-item-rating', ratingText(view)));
  body.append(line, readOnlyDots(view.name, view.rating, view.dots), el('span', 'discipline-item-unlocked', view.unlocked));
  const mark = el('span', 'dossier-item-mark', '▸');
  mark.setAttribute('aria-hidden', 'true');
  button.append(mark, body);
  item.append(button);
  return item;
}

/** Draws the left list, one selectable item for each Discipline, the shown one marked. */
export function drawList(list: HTMLElement, views: readonly DisciplineView[], shown: string | undefined): void {
  replaceKeepingFocus(list, views.map((view) => listItem(view, view.name === shown)));
}

/** Draws the chosen Discipline's heading, rating and note; the powers are drawn by `drawPowers`. */
export function drawDetailHead(detail: HTMLElement, view: DisciplineView): void {
  setText(detail.querySelector('[data-detail-name]')!, view.name);
  setText(detail.querySelector('[data-detail-rating]')!, ratingText(view));
  detail.querySelector('[data-detail-dots]')!.replaceChildren(readOnlyDots(view.name, view.rating, view.dots));
  const note = detail.querySelector<HTMLElement>('[data-detail-note]')!;
  setText(note, view.note ?? '');
  note.hidden = view.note === undefined;
}
