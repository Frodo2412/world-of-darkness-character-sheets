import type { LevelUpView, ReviewLine, XpFigure } from '../../domain/v20/levelup/view';
import { el, reconcile, setAttribute, setText } from '../../scripts/dossier/dom';

/** Draws the four figures. */
export function drawFigures(root: ParentNode, cards: LevelUpView['cards']): void {
  for (const [key, card] of Object.entries(cards) as [string, XpFigure][]) {
    const item = root.querySelector<HTMLElement>(`[data-figure="${key}"]`)!;
    setText(item.querySelector('[data-value]')!, card.value);
    setText(item.querySelector('[data-caption]')!, card.caption);
  }
}

function buildLine(line: ReviewLine): HTMLElement {
  const item = el('li', 'levelup-line');
  const head = el('div', 'levelup-line-head');
  const remove = el('button', 'levelup-step levelup-line-remove', '−');
  remove.type = 'button';
  remove.dataset.remove = line.subject;
  remove.dataset.focusKey = `line:${line.subject}`;
  head.append(el('span', 'levelup-line-name'), el('span', 'levelup-line-cost'), remove);
  const change = el('div', 'levelup-line-change');
  const dots = el('span', 'levelup-dots');
  dots.setAttribute('aria-hidden', 'true');
  change.append(el('span', 'levelup-line-arrow'), dots);
  item.append(head, change, el('p', 'levelup-line-rule'), el('p', 'levelup-line-running'));
  return item;
}

function updateLine(item: HTMLElement, line: ReviewLine): void {
  setText(item.querySelector('.levelup-line-name')!, line.label);
  setText(item.querySelector('.levelup-line-cost')!, line.cost);
  setText(item.querySelector('.levelup-line-arrow')!, line.change);
  setText(item.querySelector('.levelup-line-rule')!, line.rule);
  setText(item.querySelector('.levelup-line-running')!, line.running);
  setAttribute(item.querySelector('.levelup-line-remove')!, 'aria-label', line.action);
  const holder = item.querySelector<HTMLElement>('.levelup-dots')!;
  if (holder.children.length !== line.dots) holder.replaceChildren(...Array.from({ length: line.dots }, () => el('span', 'levelup-dot')));
  [...holder.children].forEach((dot, at) => {
    dot.classList.toggle('is-filled', at < line.rating);
    dot.classList.toggle('is-pending', at === line.rating);
  });
}

function drawPairs(list: HTMLElement, pairs: { label: string; value: string; emphasis?: boolean }[]): void {
  reconcile(
    list,
    pairs,
    (pair) => pair.label,
    () => {
      const row = el('div', 'levelup-pair');
      row.append(el('dt'), el('dd'));
      return row;
    },
    (row, pair) => {
      setText(row.querySelector('dt')!, pair.label);
      setText(row.querySelector('dd')!, pair.value);
      row.classList.toggle('is-emphasis', pair.emphasis === true);
    },
  );
}

/** Draws the review: the chosen lines, the running figures, the Confirm button and what it says, and the preview of the record. */
export function drawReview(root: ParentNode, view: LevelUpView): void {
  const find = <T extends HTMLElement>(selector: string): T => root.querySelector<T>(selector)!;
  const { review, confirm } = view;
  const lines = find('[data-lines]');
  lines.hidden = review.lines.length === 0;
  reconcile(lines, review.lines, (line) => line.subject, buildLine, updateLine);
  setText(
    find('[data-review-lead]'),
    `Nothing has been applied. Your character ratings and ${view.available} XP balance stay unchanged until you confirm.`,
  );
  drawPairs(find('[data-summary]'), review.summary);

  const button = find<HTMLButtonElement>('[data-confirm]');
  setText(button, confirm.label);
  button.disabled = confirm.disabled;
  setText(find('[data-confirm-reason]'), confirm.reason ?? '');
  find('[data-confirm-reason]').hidden = confirm.reason === undefined;

  setText(find('[data-destination]'), review.destination);
  const preview = find('[data-preview-lines]');
  preview.hidden = review.preview.lines.length === 0;
  reconcile(
    preview,
    review.preview.lines,
    (line) => line.text,
    () => {
      const item = el('li', 'levelup-preview-line');
      const head = el('div', 'levelup-preview-head');
      head.append(el('span', 'levelup-preview-name'), el('span', 'levelup-preview-cost'));
      item.append(head, el('p', 'levelup-preview-rule'));
      return item;
    },
    (item, line) => {
      setText(item.querySelector('.levelup-preview-name')!, line.text);
      setText(item.querySelector('.levelup-preview-cost')!, line.cost);
      setText(item.querySelector('.levelup-preview-rule')!, line.rule);
    },
  );
  drawPairs(find('[data-preview-totals]'), [
    { label: 'Total cost', value: review.preview.total },
    { label: 'Resulting balance', value: review.preview.balance },
  ]);
  setText(find('[data-preview-ledger]'), review.preview.ledger);
}
