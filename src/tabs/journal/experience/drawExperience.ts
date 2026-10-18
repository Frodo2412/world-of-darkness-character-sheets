import { earlierAwards, earlierSpendings, LOG_SHOWN, visibleRows, type AwardRow, type ExperienceView, type SpendingRow } from '../../../domain/v20/experience/awards/view';
import { el, reconcile, setText } from '../../../scripts/dossier/dom';

/** What the logs show besides their rows: page state the section keeps until the tab is left. */
export interface LogState {
  awards: boolean;
  spendings: boolean;
}

/** Draws the four figures. */
export function drawCards(root: ParentNode, view: ExperienceView): void {
  for (const [key, card] of Object.entries(view.cards)) {
    const item = root.querySelector<HTMLElement>(`[data-card="${key}"]`)!;
    setText(item.querySelector('[data-value]')!, card.value);
    setText(item.querySelector('[data-caption]')!, card.caption);
  }
  // Overspending is in the words ("Overspent") and the tint says it again.
  root.querySelector('[data-card="available"]')!.classList.toggle('is-overspent', view.overspent);
}

function row(key: string, kind: 'award' | 'spending'): HTMLElement {
  const item = el('li', `journal-xp-row journal-xp-row-${kind}`);
  const main = el('span', 'journal-xp-row-main');
  const title = el('span', 'journal-xp-row-title');
  // The current session says so in words; the tint and edge only agree.
  const mark = el('span', 'journal-xp-mark', 'current');
  mark.hidden = true;
  title.append(el('span', 'journal-xp-row-name'), ' ', mark);
  main.append(title, el('span', 'journal-xp-row-detail'));
  const amount = el('span', 'journal-xp-row-amount');
  amount.append(el('span', 'journal-xp-amount'), el('span', 'journal-xp-amount-caption'));
  item.append(main, amount);
  item.dataset.key = key;
  return item;
}

function updateAward(item: HTMLElement, award: AwardRow): void {
  setText(item.querySelector('.journal-xp-row-name')!, award.session);
  item.querySelector<HTMLElement>('.journal-xp-mark')!.hidden = !award.current;
  setText(item.querySelector('.journal-xp-row-detail')!, award.detail);
  const detail = item.querySelector<HTMLElement>('.journal-xp-row-detail')!;
  detail.hidden = award.detail === '';
  setText(item.querySelector('.journal-xp-amount')!, award.amount);
  setText(item.querySelector('.journal-xp-amount-caption')!, award.caption);
  item.classList.toggle('is-current', award.current);
  item.classList.toggle('is-negative', award.negative);
}

function updateSpending(item: HTMLElement, spending: SpendingRow): void {
  setText(item.querySelector('.journal-xp-row-name')!, spending.label);
  setText(item.querySelector('.journal-xp-row-detail')!, spending.detail);
  setText(item.querySelector('.journal-xp-amount')!, spending.cost);
  setText(item.querySelector('.journal-xp-amount-caption')!, 'XP spent');
}

/** Draws one log: its heading count, rows (the newest four unless all are asked for), and the footer that offers the rest. */
function drawLog<T extends { id: string }>(
  section: HTMLElement,
  rows: readonly T[],
  count: string,
  all: boolean,
  kind: 'award' | 'spending',
  update: (item: HTMLElement, row: T) => void,
  earlier: string,
  total: string,
): void {
  setText(section.querySelector('[data-count]')!, count);
  section.querySelector<HTMLElement>('[data-none]')!.hidden = rows.length > 0;
  const list = section.querySelector<HTMLElement>('[data-list]')!;
  list.hidden = rows.length === 0;
  reconcile(list, visibleRows(rows, all), (shown) => shown.id, (shown) => row(shown.id, kind), update);
  const cut = rows.length > LOG_SHOWN;
  section.querySelector<HTMLElement>('[data-footer]')!.hidden = !cut;
  setText(section.querySelector('[data-footer-text]')!, all ? total : earlier);
  const button = section.querySelector<HTMLElement>('[data-show-all]')!;
  setText(button, all ? 'Show fewer' : 'Show all');
  button.setAttribute('aria-expanded', String(all));
}

export function drawLogs(root: ParentNode, view: ExperienceView, shown: LogState): void {
  const section = (key: string): HTMLElement => root.querySelector<HTMLElement>(`[data-log="${key}"]`)!;
  drawLog(section('awards'), view.awards, view.awardCount, shown.awards, 'award', updateAward, earlierAwards(view.awards), view.awardCount);
  drawLog(section('spendings'), view.spendings, view.spendingCount, shown.spendings, 'spending', updateSpending, earlierSpendings(view.spendings), view.spendingCount);
}
