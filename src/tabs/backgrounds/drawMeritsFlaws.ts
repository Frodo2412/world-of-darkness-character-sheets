import type { Flaw, Merit } from '../../domain/v20/dossier/types';
import { pointsLabel } from '../../domain/v20/labels';
import { el, reconcile, setText } from '../../scripts/dossier/dom';
import { POINTED_FIELDS, buildFields, syncFields, type Where } from './fields';

export type PointedFamily = 'merits' | 'flaws';

const SINGULAR: Record<PointedFamily, string> = { merits: 'Merit', flaws: 'Flaw' };

/** What an entry goes by in a message or on a button. */
export const pointedLabel = (family: PointedFamily, entry: Merit, index: number): string =>
  entry.name.trim() === '' ? `${SINGULAR[family]} ${index + 1}` : entry.name.trim();

function buildEntry(family: PointedFamily, index: number): HTMLElement {
  const item = el('li', 'bg-trait');
  item.dataset.family = family;

  const read = el('div', 'bg-view');
  read.dataset.sheetModeOnly = 'play';
  const head = el('div', 'bg-trait-head');
  const identity = el('div', 'bg-trait-identity');
  identity.append(el('h4', 'bg-trait-name'), el('span', 'bg-trait-kind'));
  head.append(identity, el('span', 'dossier-badge bg-points'));
  read.append(head, el('p', 'bg-trait-note'));

  const edit = el('div', 'bg-edit');
  edit.dataset.sheetModeOnly = 'edit';
  const where: Where = { family, index };
  const hint = el('p', 'bg-hint');
  hint.id = `bg-hint-${family}-${index}`;
  hint.hidden = true;
  const remove = el('button', 'bg-remove', 'Remove');
  remove.type = 'button';
  remove.dataset.remove = `${family}:${index}`;
  remove.dataset.focusKey = `remove:${family}:${index}`;
  edit.append(buildFields(POINTED_FIELDS, where, `${SINGULAR[family]} ${index + 1}`), hint, remove);
  edit.querySelector('[data-field="points"]')!.setAttribute('aria-describedby', hint.id);

  item.append(read, edit);
  return item;
}

function updateEntry(item: HTMLElement, family: PointedFamily, entry: Merit | Flaw, index: number, hint: string | undefined): void {
  const read = item.querySelector<HTMLElement>('.bg-view')!;
  setText(read.querySelector('.bg-trait-name')!, entry.name.trim() === '' ? `Unnamed ${SINGULAR[family].toLowerCase()}` : entry.name);
  setText(read.querySelector('.bg-trait-kind')!, entry.category);
  const points = read.querySelector<HTMLElement>('.bg-points')!;
  setText(points, pointsLabel(entry.points));
  points.dataset.family = family;
  const note = read.querySelector<HTMLElement>('.bg-trait-note')!;
  setText(note, entry.note);
  note.hidden = entry.note.trim() === '';

  const edit = item.querySelector<HTMLElement>('.bg-edit')!;
  syncFields(edit, { name: entry.name, category: entry.category, points: entry.points, note: entry.note });
  const hintElement = edit.querySelector<HTMLElement>('.bg-hint')!;
  setText(hintElement, hint ?? '');
  hintElement.hidden = hint === undefined;
  edit.querySelector('.bg-remove')!.setAttribute('aria-label', `Remove ${pointedLabel(family, entry, index)}`);
}

/** Draws the Merits or the Flaws: an entry each with its category and points, read-only in play and a form in edit mode. */
export function drawPointed(list: HTMLElement, family: PointedFamily, entries: readonly Merit[], hints: ReadonlyMap<string, string>): void {
  reconcile(
    list,
    entries.map((entry, index) => ({ entry, index })),
    ({ index }) => String(index),
    ({ index }) => buildEntry(family, index),
    (element, { entry, index }) => updateEntry(element, family, entry, index, hints.get(`${family}:${index}`)),
  );
}
