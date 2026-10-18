import type { Haven } from '../../domain/v20/dossier/types';
import { el, reconcile, setText } from '../../scripts/dossier/dom';
import { HAVEN_FIELDS, buildFields, syncFields, type Where } from './fields';

const NOT_RECORDED = 'Not recorded';

/** What a haven goes by in a message or on a button. */
export const havenLabel = (haven: Haven, index: number): string => (haven.name.trim() === '' ? `Haven ${index + 1}` : haven.name.trim());

function detail(label: string, key: string): HTMLElement {
  const block = el('div', 'bg-haven-detail');
  const value = el('dd', 'bg-haven-value');
  value.dataset.detail = key;
  const term = el('dt', undefined, label);
  block.append(term, value);
  return block;
}

function buildHaven(index: number): HTMLElement {
  const item = el('li', 'bg-haven');
  item.dataset.family = 'havens';

  const read = el('div', 'bg-view');
  read.dataset.sheetModeOnly = 'play';
  const details = el('dl', 'bg-haven-details');
  const place = el('div', 'bg-haven-place');
  place.append(detail('Location', 'location'), detail('Access', 'access'));
  details.append(place, detail('Security & escape', 'security'));
  read.append(el('span', 'dossier-badge bg-haven-kind'), el('h4', 'bg-haven-name'), el('p', 'bg-haven-description'), el('hr', 'bg-rule'), details);

  const edit = el('div', 'bg-edit');
  edit.dataset.sheetModeOnly = 'edit';
  const where: Where = { family: 'havens', index };
  const remove = el('button', 'bg-remove', 'Remove');
  remove.type = 'button';
  remove.dataset.remove = `havens:${index}`;
  remove.dataset.focusKey = `remove:havens:${index}`;
  edit.append(buildFields(HAVEN_FIELDS, where, `Haven ${index + 1}`), remove);

  item.append(read, edit);
  return item;
}

function updateHaven(item: HTMLElement, haven: Haven, index: number): void {
  const read = item.querySelector<HTMLElement>('.bg-view')!;
  const kind = read.querySelector<HTMLElement>('.bg-haven-kind')!;
  setText(kind, `${haven.kind} haven`);
  kind.dataset.kind = haven.kind;
  const name = read.querySelector<HTMLElement>('.bg-haven-name')!;
  setText(name, haven.name.trim() === '' ? 'Unnamed haven' : haven.name);
  const description = read.querySelector<HTMLElement>('.bg-haven-description')!;
  setText(description, haven.description);
  description.hidden = haven.description.trim() === '';
  for (const [key, text] of [
    ['location', haven.location],
    ['access', haven.access],
    ['security', haven.security],
  ] as const) {
    const value = read.querySelector<HTMLElement>(`[data-detail="${key}"]`)!;
    setText(value, text.trim() === '' ? NOT_RECORDED : text);
  }
  const edit = item.querySelector<HTMLElement>('.bg-edit')!;
  syncFields(edit, { ...haven });
  edit.querySelector('.bg-remove')!.setAttribute('aria-label', `Remove ${havenLabel(haven, index)}`);
}

/** Draws the Havens: a dossier card each, read-only in play and a form in edit mode. */
export function drawHavens(list: HTMLElement, havens: readonly Haven[]): void {
  reconcile(
    list,
    havens.map((haven, index) => ({ haven, index })),
    ({ index }) => String(index),
    ({ index }) => buildHaven(index),
    (element, { haven, index }) => updateHaven(element, haven, index),
  );
}
