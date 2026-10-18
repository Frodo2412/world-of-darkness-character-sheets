import { entryName, NOT_RECORDED } from '../../../domain/v20/journal/record/view';
import type { BloodBond, CharacterRecord, Derangement, Goal, ItemEntry } from '../../../domain/v20/journal/types';
import { el, reconcile, setAttribute, setText } from '../../../scripts/dossier/dom';
import type { SheetMode } from '../../../scripts/sheet/mode';
import { buildFields, FIELDS, syncFields } from './fields';

type Key = 'gear' | 'equipment' | 'bloodBonds' | 'derangements' | 'goals';

/** The nouns an entry's controls go by: "Gear 2 item". */
const PREFIX: Readonly<Record<Key, string>> = { gear: 'Gear', equipment: 'Equipment', bloodBonds: 'Blood bond', derangements: 'Derangement', goals: 'Goal' };

const blank = (...texts: string[]): boolean => texts.every((text) => text.trim() === '');

/** The notes beside a bond's rating that outlive a redraw, by place in the list. */
export type RatingHints = ReadonlyMap<number, string>;

interface Row<T> {
  entry: T;
  index: number;
}

function modeView(): HTMLElement {
  const view = el('div', 'journal-record-view');
  view.dataset.sheetModeOnly = 'play';
  return view;
}

function modeEdit(key: Key, index: number, extra?: HTMLElement): HTMLElement {
  const edit = el('div', 'journal-record-edit');
  edit.dataset.sheetModeOnly = 'edit';
  const remove = el('button', 'journal-chip-button journal-record-remove', 'Remove');
  remove.type = 'button';
  remove.dataset.remove = `${key}:${index}`;
  remove.dataset.focusKey = `remove:${key}:${index}`;
  edit.append(buildFields(FIELDS[key], { key, index }, `${PREFIX[key]} ${index + 1}`));
  if (extra !== undefined) edit.append(extra);
  edit.append(remove);
  return edit;
}

function removeLabel(item: HTMLElement, key: Key, index: number, words: string): void {
  item.querySelector('.journal-record-remove')!.setAttribute('aria-label', `Remove ${entryName(key, index, words)}`);
}

// Items: gear and equipment

function buildItem(key: 'gear' | 'equipment', index: number): HTMLElement {
  const item = el('li', 'journal-record-row');
  const view = modeView();
  view.append(el('span', 'journal-record-item'), el('span', 'journal-record-detail'));
  item.append(view, modeEdit(key, index));
  return item;
}

function updateItem(item: HTMLElement, key: 'gear' | 'equipment', { entry, index }: Row<ItemEntry>): void {
  setText(item.querySelector('.journal-record-item')!, entry.item);
  setText(item.querySelector('.journal-record-detail')!, entry.detail);
  item.dataset.blank = String(blank(entry.item, entry.detail));
  const edit = item.querySelector<HTMLElement>('.journal-record-edit')!;
  syncFields(edit, { item: entry.item, detail: entry.detail });
  removeLabel(item, key, index, entry.item);
}

// Blood bonds

function buildBond(index: number): HTMLElement {
  const item = el('li', 'journal-record-row journal-bond');
  const view = modeView();
  const who = el('span', 'journal-bond-who');
  who.append(el('span', 'journal-bond-name'), el('span', 'journal-bond-relation'));
  view.append(who, el('span', 'journal-bond-rating'), el('span', 'journal-bond-type'));
  const hint = el('p', 'journal-record-hint');
  hint.id = `journal-bond-hint-${index}`;
  hint.hidden = true;
  const edit = modeEdit('bloodBonds', index, hint);
  edit.querySelector('[data-field="rating"]')!.setAttribute('aria-describedby', hint.id);
  item.append(view, edit);
  return item;
}

function updateBond(item: HTMLElement, { entry, index }: Row<BloodBond>, hints: RatingHints): void {
  setText(item.querySelector('.journal-bond-name')!, entry.name);
  const relation = item.querySelector<HTMLElement>('.journal-bond-relation')!;
  setText(relation, entry.relation);
  relation.hidden = entry.relation.trim() === '';
  setText(item.querySelector('.journal-bond-rating')!, String(entry.rating));
  setText(item.querySelector('.journal-bond-type')!, entry.type);
  item.dataset.blank = String(blank(entry.name, entry.relation, entry.type) && entry.rating === 0);
  const edit = item.querySelector<HTMLElement>('.journal-record-edit')!;
  syncFields(edit, { name: entry.name, relation: entry.relation, rating: entry.rating, type: entry.type });
  const hint = edit.querySelector<HTMLElement>('.journal-record-hint')!;
  const text = hints.get(index);
  hint.hidden = text === undefined;
  setText(hint, text ?? '');
  const rating = edit.querySelector('[data-field="rating"]')!;
  if (text === undefined) rating.removeAttribute('aria-invalid');
  else setAttribute(rating, 'aria-invalid', 'true');
  removeLabel(item, 'bloodBonds', index, entry.name);
}

// Derangements

function buildDerangement(index: number): HTMLElement {
  const item = el('li', 'journal-record-row journal-derangement');
  const view = modeView();
  const head = el('span', 'journal-derangement-head');
  head.append(el('span', 'journal-derangement-name'), el('span', 'journal-record-status'));
  const note = el('span', 'journal-derangement-note');
  note.append(el('span', 'journal-overline', 'Storyteller-agreed note'), el('span', 'journal-derangement-text'));
  view.append(head, note);
  item.append(view, modeEdit('derangements', index));
  return item;
}

function updateDerangement(item: HTMLElement, { entry, index }: Row<Derangement>): void {
  setText(item.querySelector('.journal-derangement-name')!, entry.name);
  const status = item.querySelector<HTMLElement>('.journal-record-status')!;
  setText(status, entry.status);
  status.hidden = entry.status.trim() === '';
  setText(item.querySelector('.journal-derangement-text')!, entry.note);
  item.querySelector<HTMLElement>('.journal-derangement-note')!.hidden = entry.note.trim() === '';
  item.dataset.blank = String(blank(entry.name, entry.note));
  syncFields(item.querySelector('.journal-record-edit')!, { name: entry.name, status: entry.status, note: entry.note });
  removeLabel(item, 'derangements', index, entry.name);
}

// Goals

function buildGoal(index: number): HTMLElement {
  const item = el('li', 'journal-record-row journal-goal');
  const view = modeView();
  const body = el('span', 'journal-goal-body');
  body.append(el('span', 'journal-goal-text'), el('span', 'journal-overline journal-goal-kind'));
  view.append(el('span', 'journal-goal-number'), body);
  item.append(view, modeEdit('goals', index));
  return item;
}

function updateGoal(item: HTMLElement, { entry, index }: Row<Goal>): void {
  setText(item.querySelector('.journal-goal-number')!, String(index + 1));
  setText(item.querySelector('.journal-goal-text')!, entry.text);
  const kind = item.querySelector<HTMLElement>('.journal-goal-kind')!;
  setText(kind, entry.kind);
  kind.hidden = entry.kind.trim() === '';
  item.dataset.blank = String(blank(entry.text, entry.kind));
  syncFields(item.querySelector('.journal-record-edit')!, { text: entry.text, kind: entry.kind });
  removeLabel(item, 'goals', index, entry.text);
}

// The lists

/** An entry with nothing written in it is not shown in play, as a blank Background row is not. */
const shownIn = (mode: SheetMode, entries: readonly unknown[], isBlank: (entry: never) => boolean): number =>
  mode === 'edit' ? entries.length : entries.filter((entry) => !isBlank(entry as never)).length;

function drawList<T>(root: ParentNode, key: Key, entries: readonly T[], build: (index: number) => HTMLElement, update: (item: HTMLElement, row: Row<T>) => void): void {
  const list = root.querySelector<HTMLElement>(`[data-list="${key}"]`)!;
  reconcile(
    list,
    entries.map((entry, index) => ({ entry, index })),
    ({ index }) => String(index),
    ({ index }) => build(index),
    update,
  );
}

/** Draws every list of the record, and each description field; the fields the player is typing in are left alone. */
export function drawRecord(root: ParentNode, record: CharacterRecord, mode: SheetMode, hints: RatingHints): void {
  drawList(root, 'gear', record.gear, (index) => buildItem('gear', index), (item, row) => updateItem(item, 'gear', row));
  drawList(root, 'equipment', record.equipment, (index) => buildItem('equipment', index), (item, row) => updateItem(item, 'equipment', row));
  drawList(root, 'bloodBonds', record.bloodBonds, buildBond, (item, row) => updateBond(item, row, hints));
  drawList(root, 'derangements', record.derangements, buildDerangement, updateDerangement);
  drawList(root, 'goals', record.goals, buildGoal, updateGoal);

  const shown: Record<Key, number> = {
    gear: shownIn(mode, record.gear, (entry: ItemEntry) => blank(entry.item, entry.detail)),
    equipment: shownIn(mode, record.equipment, (entry: ItemEntry) => blank(entry.item, entry.detail)),
    bloodBonds: shownIn(mode, record.bloodBonds, (entry: BloodBond) => blank(entry.name, entry.relation, entry.type) && entry.rating === 0),
    derangements: shownIn(mode, record.derangements, (entry: Derangement) => blank(entry.name, entry.note)),
    goals: shownIn(mode, record.goals, (entry: Goal) => blank(entry.text, entry.kind)),
  };
  for (const [key, count] of Object.entries(shown)) {
    root.querySelector<HTMLElement>(`[data-empty="${key}"]`)!.hidden = count > 0;
    root.querySelector<HTMLElement>(`[data-list="${key}"]`)!.hidden = count === 0;
  }
  // The bond table's column names only head a table that has rows.
  root.querySelector<HTMLElement>('.journal-bond-head')!.hidden = shown.bloodBonds === 0;

  for (const [field, text] of Object.entries(record.description)) {
    const fact = root.querySelector<HTMLElement>(`[data-fact="${field}"]`)!;
    setText(fact, text.trim() === '' ? NOT_RECORDED : text);
    fact.classList.toggle('is-empty', text.trim() === '');
    const input = root.querySelector<HTMLInputElement>(`[data-description="${field}"]`)!;
    if (input !== document.activeElement && input.value !== text) input.value = text;
  }
}

