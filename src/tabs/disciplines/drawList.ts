import type { DisciplineView } from '../../domain/v20/disciplineView';
import { el, replaceKeepingFocus, setText } from '../../scripts/dossier/dom';
import { readOnlyDots } from '../../scripts/dossier/dots';

/** "3 / 5": the rating out of the dots the Discipline is drawn with. */
export const ratingText = (view: DisciplineView): string => `${view.rating} / ${view.dots}`;

function listItem(view: DisciplineView, current: boolean): HTMLElement {
  const item = el('li', 'discipline-library-item');
  const button = el('button', 'discipline-item');
  button.type = 'button';
  button.dataset.value = view.key;
  button.dataset.focusKey = view.key;
  if (current) button.setAttribute('aria-current', 'true');
  // The mark that shows the chosen Discipline in text as well as in its border.
  const mark = el('span', 'discipline-item-mark', '▸');
  mark.setAttribute('aria-hidden', 'true');
  const title = el('span', 'discipline-item-title');
  title.append(el('span', 'discipline-item-name', view.name), el('span', 'discipline-item-rating', ratingText(view)));
  button.append(mark, title, readOnlyDots(view.name, view.rating, view.dots), el('span', 'discipline-item-unlocked', view.unlocked));
  item.append(button);
  return item;
}

/** Draws the left list, one card for each Discipline, the shown one marked. */
export function drawList(list: HTMLElement, views: readonly DisciplineView[], shown: string | undefined): void {
  replaceKeepingFocus(list, views.map((view) => listItem(view, view.key === shown)));
}

/** Draws the chosen Discipline's heading, rating and note; the powers are drawn by `drawPowers`. */
export function drawDetailHead(detail: HTMLElement, view: DisciplineView): void {
  setText(detail.querySelector('[data-detail-name]')!, view.name);
  setText(detail.querySelector('[data-detail-rating]')!, `Your rating · ${view.rating}`);
  detail.querySelector('[data-detail-dots]')!.replaceChildren(readOnlyDots(view.name, view.rating, view.dots));
  const note = detail.querySelector<HTMLElement>('[data-detail-note]')!;
  setText(note, view.note ?? '');
  note.hidden = view.note === undefined;
}
