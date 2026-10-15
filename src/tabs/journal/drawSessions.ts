import { SESSIONS_SHOWN, visibleSessions, type SessionRow, type SessionsView } from '../../domain/v20/journal/sessionView';
import { el, reconcile, setText } from '../../scripts/dossier/dom';

/** What the session list shows besides the sessions: page state the tab keeps until it is left. */
export interface SessionsState {
  /** The session whose title is being edited. */
  renaming: string | undefined;
  showAll: boolean;
}

/** The row's key: it carries the state, so a row that starts or stops being renamed is built again. */
const keyOf = (row: SessionRow, state: SessionsState): string => `${row.id}:${row.id === state.renaming ? 'rename' : 'show'}:${row.current}`;

function button(label: string, name: string, value: string, accessibleName: string): HTMLButtonElement {
  const control = el('button', 'journal-link', label);
  control.type = 'button';
  control.dataset[name] = value;
  control.setAttribute('aria-label', accessibleName);
  return control;
}

function renameRow(row: SessionRow): HTMLElement {
  const item = el('li', 'journal-session is-renaming');
  const input = el('input', 'journal-input');
  input.type = 'text';
  input.value = row.title;
  input.autocomplete = 'off';
  input.setAttribute('aria-label', 'Session title');
  input.dataset.renameInput = row.id;
  input.dataset.focusKey = `rename:${row.id}`;
  const actions = el('span', 'journal-session-actions');
  actions.append(button('Save', 'renameSave', row.id, `Save the title of ${row.title}`), button('Cancel', 'renameCancel', row.id, `Cancel renaming ${row.title}`));
  item.append(input, actions);
  return item;
}

function showRow(row: SessionRow): HTMLElement {
  const item = el('li', 'journal-session');
  const name = el('span', 'journal-session-name', row.title);
  item.append(name);
  if (row.current) item.append(el('span', 'journal-session-mark', 'current'));
  const actions = el('span', 'journal-session-actions');
  const rename = button('Rename', 'rename', row.id, `Rename ${row.title}`);
  rename.dataset.focusKey = `rename-button:${row.id}`;
  actions.append(rename);
  if (!row.current) {
    const make = button('Make current', 'makeCurrent', row.id, `Make ${row.title} current`);
    make.dataset.focusKey = `current-button:${row.id}`;
    actions.append(make);
  }
  item.append(actions);
  return item;
}

/** Draws the session list: newest first, the newest few until "Show all". A title being typed is left alone. */
export function drawSessions(root: ParentNode, view: SessionsView, state: SessionsState): void {
  const find = <T extends HTMLElement>(selector: string): T => root.querySelector<T>(selector)!;
  const rows = visibleSessions(view.rows, state.showAll);
  const list = find('[data-session-list]');

  setText(find('[data-sessions-count]'), view.count);
  setText(find('[data-explanation]'), view.explanation);
  find('[data-no-sessions]').hidden = view.rows.length > 0;
  list.hidden = view.rows.length === 0;

  reconcile(
    list,
    rows,
    (row) => keyOf(row, state),
    (row) => (row.id === state.renaming ? renameRow(row) : showRow(row)),
    (item, row) => {
      // A title the player is typing is theirs; any other row says what is stored.
      if (row.id === state.renaming) return;
      setText(item.querySelector('.journal-session-name')!, row.title);
    },
  );

  const more = find<HTMLButtonElement>('[data-show-all-sessions]');
  more.hidden = view.rows.length <= SESSIONS_SHOWN;
  setText(more, state.showAll ? 'Show fewer sessions' : `Show all ${view.rows.length} sessions`);
  more.setAttribute('aria-expanded', String(state.showAll));
}
