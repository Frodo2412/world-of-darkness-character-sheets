import type { OtherTrait } from '../../domain/v20/dossier/types';
import { el, reconcile, setText } from '../../scripts/dossier/dom';
import { readOnlyDots } from '../../scripts/dossier/dots';
import { OTHER_FIELDS, buildFields, syncFields, type Where } from './fields';

/** What an other trait goes by in a message or on a button. */
export const otherLabel = (trait: OtherTrait, index: number): string => (trait.name.trim() === '' ? `Other trait ${index + 1}` : trait.name.trim());

function buildTrait(index: number): HTMLElement {
  const item = el('li', 'bg-other');
  item.dataset.family = 'otherTraits';

  const read = el('div', 'bg-view');
  read.dataset.sheetModeOnly = 'play';
  const head = el('div', 'bg-other-head');
  head.append(el('h4', 'bg-other-name'), el('span', 'bg-card-rating'));
  read.append(head, el('p', 'bg-trait-note'), el('p', 'bg-other-kind'));

  const edit = el('div', 'bg-edit');
  edit.dataset.sheetModeOnly = 'edit';
  const where: Where = { family: 'otherTraits', index };
  const remove = el('button', 'bg-remove', 'Remove');
  remove.type = 'button';
  remove.dataset.remove = `otherTraits:${index}`;
  remove.dataset.focusKey = `remove:otherTraits:${index}`;
  edit.append(buildFields(OTHER_FIELDS, where, `Other trait ${index + 1}`), remove);

  item.append(read, edit);
  return item;
}

function updateTrait(item: HTMLElement, trait: OtherTrait, index: number): void {
  const read = item.querySelector<HTMLElement>('.bg-view')!;
  setText(read.querySelector('.bg-other-name')!, trait.name.trim() === '' ? 'Unnamed trait' : trait.name);
  const rating = read.querySelector<HTMLElement>('.bg-card-rating')!;
  if (trait.rating === undefined) {
    rating.replaceChildren();
  } else if (rating.querySelector('.bg-card-number')?.textContent !== String(trait.rating)) {
    const dots = trait.rating > 5 ? 10 : 5;
    const number = el('span', 'bg-card-number', String(trait.rating));
    rating.replaceChildren(readOnlyDots(trait.name, trait.rating, dots), number);
  }
  const note = read.querySelector<HTMLElement>('.bg-trait-note')!;
  setText(note, trait.note);
  note.hidden = trait.note.trim() === '';
  const kind = read.querySelector<HTMLElement>('.bg-other-kind')!;
  setText(kind, trait.kind);
  kind.hidden = trait.kind.trim() === '';

  const edit = item.querySelector<HTMLElement>('.bg-edit')!;
  syncFields(edit, { name: trait.name, kind: trait.kind, rating: trait.rating, note: trait.note });
  edit.querySelector('.bg-remove')!.setAttribute('aria-label', `Remove ${otherLabel(trait, index)}`);
}

/** Draws the Other Traits: an entry each, with dots only when it is rated. */
export function drawOther(list: HTMLElement, traits: readonly OtherTrait[]): void {
  reconcile(
    list,
    traits.map((trait, index) => ({ trait, index })),
    ({ index }) => String(index),
    ({ index }) => buildTrait(index),
    (element, { trait, index }) => updateTrait(element, trait, index),
  );
}
