import type { PointCard } from '../../domain/v20/backgrounds/points';
import { countLabel, pointsLabel, pointsTotalLabel } from '../../domain/v20/labels';
import { cloneOf, field, reconcile, setText } from './dom';

/** What a heading says of its entries: "2 entries · 3 points". */
export const totalsText = (count: number, total: number): string =>
  `${countLabel(count, 'entry', 'entries')} · ${pointsTotalLabel(total)}`;

/** One entry as it reads in play mode: its name, its category, what it is worth and its note. */
function drawCard(item: HTMLElement, card: PointCard): void {
  setText(field(item, 'name'), card.name);
  setText(field(item, 'category'), card.category);
  setText(field(item, 'points'), pointsLabel(card.points));
  const note = field(item, 'note');
  setText(note, card.note);
  note.hidden = card.note === '';
}

/** Makes the list hold the entries, one element each; a Merit and a Flaw are drawn the same way. */
export function drawMeritsFlaws(list: HTMLElement, cards: readonly PointCard[], template: HTMLTemplateElement): void {
  reconcile(
    list,
    cards,
    (card) => String(card.index),
    () => cloneOf(template),
    drawCard,
  );
}
