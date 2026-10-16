import type { OtherTraitCard } from '../../domain/v20/backgrounds/others';
import { cloneOf, field, reconcile, setText } from '../../scripts/dossier/dom';
import { drawDots } from './dots';

/** One trait as it reads in play mode: its name, its kind, its dots when it has a rating, and its note. */
function drawCard(item: HTMLElement, card: OtherTraitCard): void {
  setText(field(item, 'name'), card.name);
  const kind = field(item, 'kind');
  setText(kind, card.kind);
  kind.hidden = card.kind === '';
  const { rating, dots } = card;
  const rated = rating !== undefined && dots !== undefined;
  field(item, 'dots').hidden = !rated;
  if (rated) drawDots(item, `otherTraits.${card.index}`, { name: card.name, rating, dots });
  else field(item, 'overflow').hidden = true;
  const note = field(item, 'note');
  setText(note, card.note);
  note.hidden = card.note === '';
}

/** Makes the list hold the traits, one element each, kept from one draw to the next. */
export function drawOther(
  list: HTMLElement,
  cards: readonly OtherTraitCard[],
  template: HTMLTemplateElement,
  edit: (item: HTMLElement, card: OtherTraitCard) => void,
): void {
  reconcile(
    list,
    cards,
    (card) => String(card.index),
    () => cloneOf(template),
    (item, card) => {
      drawCard(item, card);
      edit(item, card);
    },
  );
}
