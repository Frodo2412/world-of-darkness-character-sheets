import { categoryOf, excerptOf, noteTitle } from '../../../domain/v20/journal/notes/notes';
import { categoryCounts, pinnedCount, sameScope, sessionCounts, tagList, type NoteScope } from '../../../domain/v20/journal/notes/scope';
import { noteTime } from '../../../domain/v20/journal/notes/time';
import type { Journal, Note } from '../../../domain/v20/journal/types';
import { el, reconcile, setAttribute, setText } from '../../../scripts/dossier/dom';

/** What a sidebar button names, read back when it is pressed. */
export function scopeOf(button: HTMLElement): NoteScope | undefined {
  const { scope, value = '' } = button.dataset;
  switch (scope) {
    case 'all':
    case 'pinned':
      return { kind: scope };
    case 'session':
      return { kind: 'session', id: value };
    case 'category':
      return { kind: 'category', category: value as never };
    case 'tag':
      return { kind: 'tag', tag: value };
    default:
      return undefined;
  }
}

interface ScopeItem {
  kind: string;
  value: string;
  name: string;
  count: number;
  /** A line under the name: "Current session". */
  note?: string;
  scope: NoteScope;
}

function buildScope(item: ScopeItem): HTMLElement {
  const listItem = el('li');
  const button = el('button', 'journal-scope');
  button.type = 'button';
  button.dataset.scope = item.kind;
  button.dataset.value = item.value;
  button.dataset.focusKey = `scope:${item.kind}:${item.value}`;
  button.append(el('span', 'journal-scope-name'), el('span', 'journal-scope-count'));
  listItem.append(button);
  return listItem;
}

function updateScope(listItem: HTMLElement, item: ScopeItem, current: NoteScope): void {
  const button = listItem.querySelector<HTMLElement>('.journal-scope')!;
  if (sameScope(item.scope, current)) setAttribute(button, 'aria-current', 'true');
  else button.removeAttribute('aria-current');
  setText(button.querySelector('.journal-scope-name')!, item.name);
  setText(button.querySelector('.journal-scope-count')!, String(item.count));
  const existing = button.querySelector('.journal-scope-note');
  if (item.note === undefined) existing?.remove();
  else if (existing === null) button.append(el('span', 'journal-scope-note', item.note));
  else setText(existing, item.note);
}

const drawScopes = (list: Element, items: ScopeItem[], current: NoteScope): void =>
  reconcile(list, items, (item) => `${item.kind}:${item.value}`, buildScope, (listItem, item) => updateScope(listItem, item, current));

/** Draws the sidebar: the counts beside All notes and Pinned, then the sessions, categories and tags, the chosen scope marked. */
export function drawSidebar(root: ParentNode, journal: Journal, scope: NoteScope, earlier: { present: boolean; shown: boolean }): void {
  const find = <T extends HTMLElement>(selector: string): T => root.querySelector<T>(selector)!;

  for (const [kind, count] of [['all', journal.notes.length], ['pinned', pinnedCount(journal)]] as const) {
    const button = find(`[data-scope="${kind}"]`);
    setText(button.querySelector('[data-scope-count]')!, String(count));
    if (sameScope({ kind }, scope) && !earlier.shown) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  }

  const sessions = sessionCounts(journal);
  find('[data-no-sessions]').hidden = sessions.length > 0;
  drawScopes(
    find('[data-session-scopes]'),
    sessions.map(({ session, count }) => ({
      kind: 'session',
      value: session.id,
      name: session.title,
      count,
      note: session.current ? 'Current session' : undefined,
      scope: { kind: 'session', id: session.id },
    })),
    earlier.shown ? { kind: 'pinned' } : scope,
  );
  drawScopes(
    find('[data-category-scopes]'),
    categoryCounts(journal).map(({ category, count }) => ({
      kind: 'category',
      value: category,
      name: category,
      count,
      scope: { kind: 'category', category },
    })),
    earlier.shown ? { kind: 'pinned' } : scope,
  );

  const tags = tagList(journal);
  find('[data-no-tags]').hidden = tags.length > 0;
  reconcile(
    find('[data-tag-scopes]'),
    tags,
    ({ tag }) => tag,
    ({ tag }) => {
      const item = el('li');
      const button = el('button', 'journal-tag-scope', tag);
      button.type = 'button';
      button.dataset.scope = 'tag';
      button.dataset.value = tag;
      button.dataset.focusKey = `scope:tag:${tag}`;
      item.append(button);
      return item;
    },
    (item, { tag, count }) => {
      const button = item.querySelector<HTMLElement>('.journal-tag-scope')!;
      setAttribute(button, 'aria-label', `${tag}, ${count}`);
      const chosen = !earlier.shown && sameScope({ kind: 'tag', tag }, scope);
      if (chosen) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    },
  );

  find('[data-earlier-item]').hidden = !earlier.present;
  const button = find('[data-earlier]');
  if (earlier.shown) button.setAttribute('aria-current', 'true');
  else button.removeAttribute('aria-current');
}

function buildNote(note: Note): HTMLElement {
  const item = el('li', 'journal-note');
  const open = el('button', 'journal-note-open');
  open.type = 'button';
  open.dataset.open = note.id;
  open.dataset.focusKey = `note:${note.id}`;
  const meta = el('span', 'journal-note-meta');
  meta.append(el('span', 'journal-note-category'), el('span', 'journal-note-time'));
  open.append(el('span', 'journal-note-title'), el('span', 'journal-note-excerpt'), meta);
  const pin = el('button', 'journal-note-pin');
  pin.type = 'button';
  pin.dataset.pin = note.id;
  pin.dataset.focusKey = `pin:${note.id}`;
  const icon = el('span', 'journal-icon journal-icon-pin');
  icon.setAttribute('aria-hidden', 'true');
  pin.append(icon);
  item.append(open, pin);
  return item;
}

function updateNote(item: HTMLElement, note: Note, selected: boolean, now: number): void {
  const title = noteTitle(note);
  const open = item.querySelector<HTMLElement>('.journal-note-open')!;
  if (selected) open.setAttribute('aria-current', 'true');
  else open.removeAttribute('aria-current');
  setText(item.querySelector('.journal-note-title')!, title);
  const excerpt = excerptOf(note.body);
  const excerptNode = item.querySelector<HTMLElement>('.journal-note-excerpt')!;
  setText(excerptNode, excerpt);
  excerptNode.hidden = excerpt === '';
  setText(item.querySelector('.journal-note-category')!, categoryOf(note));
  setText(item.querySelector('.journal-note-time')!, noteTime(note.editedAt, now));
  const pin = item.querySelector<HTMLElement>('.journal-note-pin')!;
  setAttribute(pin, 'aria-pressed', String(note.pinned));
  setAttribute(pin, 'aria-label', `Pin ${title}`);
  item.classList.toggle('is-selected', selected);
  item.classList.toggle('is-pinned', note.pinned);
}

/** Draws the notes of the list, the chosen one marked. A card that keeps its note is updated, so focus stays on it. */
export function drawNoteList(list: Element, notes: readonly Note[], selectedId: string | undefined, now: number): void {
  reconcile(list, notes, (note) => note.id, buildNote, (item, note) => updateNote(item, note, note.id === selectedId, now));
}
