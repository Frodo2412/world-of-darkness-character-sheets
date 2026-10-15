import type { V20Character } from '../../../domain/v20/character';
import { countLabel } from '../../../domain/v20/labels';
import { toggleChecklistLine } from '../../../domain/v20/journal/notes/markdown';
import {
  addMention,
  addNote,
  addTag,
  editNote,
  mentionsOf,
  noteSearchFields,
  removeMention,
  removeTag,
  togglePin,
  UNSORTED,
  type NoteFields,
} from '../../../domain/v20/journal/notes/notes';
import { ALL_NOTES, notesInScope, scopeCaption, scopeTitle, type NoteScope } from '../../../domain/v20/journal/notes/scope';
import { savedStatus } from '../../../domain/v20/journal/notes/time';
import { currentSession } from '../../../domain/v20/journal/sessions';
import type { Journal, Note } from '../../../domain/v20/journal/types';
import { setText } from '../../../scripts/dossier/dom';
import { filterBy } from '../../../scripts/dossier/filterBy';
import { matchesText, wireSearch } from '../../../scripts/dossier/search';
import type { SheetMode } from '../../../scripts/sheet/mode';
import type { MountedTab, TabContext } from '../../../scripts/tabs/context';
import { NEW_NOTE_EVENT, SECTION_DRAWN_EVENT } from '../events';
import { drawNoteList, drawSidebar, scopeOf } from './drawNotes';
import { drawEditor, drawMentions, setPreview } from './drawEditor';
import { insertLink, PLACEHOLDER, toggleLines, toggleWrap, type ListKind, type TextRange } from './format';

/** How long after the last keystroke a note is stored. */
const AUTOSAVE_MS = 400;

/** The narrow layout stacks the editor under the list, where choosing a note should bring it into view. */
const STACKED = '(max-width: 63.9375rem)';

interface Page {
  /** The list the player chose; the current session's until they choose one. */
  scope: NoteScope | undefined;
  selectedId: string | undefined;
  query: string;
  /** Showing the legacy notes text in place of the editor. */
  earlier: boolean;
  /** Showing the start-a-session prompt in place of the editor. */
  prompting: boolean;
  /** The editor holds changes that are not stored yet. */
  dirty: boolean;
}

const fresh = (): Page => ({ scope: undefined, selectedId: undefined, query: '', earlier: false, prompting: false, dirty: false });

/** The Notes section of the Journal: the sidebar, the list and the editor. Editable in play and in edit mode. */
export function mount(ctx: TabContext, root: HTMLElement): MountedTab {
  const find = <T extends HTMLElement>(selector: string): T => root.querySelector<T>(selector)!;
  const editor = find('[data-editor]');
  const form = find('[data-editor-form]');
  const field = <T extends HTMLElement>(name: string): T => find<T>(`[data-field="${name}"]`);
  const titleField = field<HTMLInputElement>('title');
  const bodyField = field<HTMLTextAreaElement>('body');
  const categoryField = field<HTMLSelectElement>('category');
  const preview = find('[data-preview]');
  const linkForm = find<HTMLFormElement>('[data-link-form]');
  const linkInput = find<HTMLInputElement>('[data-link-input]');
  const quickInput = find<HTMLInputElement>('[data-quick-input]');

  let page = fresh();
  let timer: ReturnType<typeof setTimeout> | undefined;
  /** Where the selection was when the link form opened: the toolbar takes focus off the text. */
  let linkAt: { start: number; end: number } | undefined;

  const search = wireSearch(find('[data-search]'), (text) => {
    page.query = text;
    draw(ctx.current());
  });

  // Drawing

  const sessionTitleOf = (journal: Journal, id: string): string => journal.sessions.find((session) => session.id === id)?.title ?? 'Session';
  const selectedNote = (journal: Journal): Note | undefined => journal.notes.find((note) => note.id === page.selectedId);

  function defaultScope(journal: Journal): NoteScope {
    const session = currentSession(journal);
    return session === undefined ? ALL_NOTES : { kind: 'session', id: session.id };
  }

  function draw(character: V20Character): void {
    const { journal } = character;
    const hasEarlier = character.notes.trim() !== '';
    if (journal.sessions.length > 0) page.prompting = false;
    if (!hasEarlier) page.earlier = false;
    const note = selectedNote(journal);
    if (note === undefined) page.selectedId = undefined;

    const searching = page.query.trim() !== '';
    const scope = page.scope ?? defaultScope(journal);
    const inList = notesInScope(journal, searching ? ALL_NOTES : scope);
    const shown = filterBy(inList, page.query, noteSearchFields);

    drawSidebar(root, journal, scope, { present: hasEarlier, shown: page.earlier });
    setText(find('[data-list-title]'), searching ? 'Search results' : scopeTitle(journal, scope));
    setText(find('[data-list-caption]'), searching ? 'All sessions' : scopeCaption(scope));
    setText(find('[data-list-count]'), countLabel(shown.length, 'note', 'notes'));
    find('[data-no-notes]').hidden = searching || inList.length > 0;
    find('[data-no-match]').hidden = !searching || shown.length > 0;
    search.say(searching ? matchesText(shown.length) : '');
    drawNoteList(find('[data-note-list]'), shown, page.selectedId, ctx.stamp.now());

    const current = currentSession(journal);
    setText(find('[data-quick-where]'), current === undefined ? 'No session yet' : `${current.title} · ${UNSORTED}`);

    const empty = note === undefined && !page.prompting && !page.earlier;
    find('[data-editor-empty]').hidden = !empty;
    find('[data-editor-prompt]').hidden = !page.prompting;
    find('[data-editor-earlier]').hidden = !page.earlier;
    setText(find('[data-earlier-text]'), character.notes);
    const editing = note !== undefined && !page.prompting && !page.earlier;
    form.hidden = !editing;
    if (editing) drawEditor(form, note, sessionTitleOf(journal, note.sessionId), page.dirty ? 'Unsaved changes' : savedStatus(note.editedAt));
    root.dispatchEvent(new CustomEvent(SECTION_DRAWN_EVENT, { bubbles: true }));
  }

  // Storing

  function clearTimer(): void {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  }

  /**
   * Stores what the editor holds. Autosave says so only when something was stored; "Save note" always says
   * so, so the player is told even when there was nothing new.
   */
  function flush(say = false): void {
    clearTimer();
    const id = page.selectedId;
    const before = id === undefined ? undefined : selectedNote(ctx.current().journal);
    if (id === undefined || before === undefined || form.hidden) return;
    const fields: Partial<NoteFields> = { title: titleField.value, category: categoryField.value, body: bodyField.value };
    page.dirty = false;
    const after = ctx.apply((character) => ({ ...character, journal: editNote(character.journal, id, fields, ctx.stamp) }));
    const stored = selectedNote(after.journal)!;
    const status = savedStatus(stored.editedAt);
    setText(find('[data-save-status]'), status);
    if (say || stored.editedAt !== before.editedAt) ctx.announce(status);
  }

  function markDirty(): void {
    page.dirty = true;
    setText(find('[data-save-status]'), 'Unsaved changes');
    clearTimer();
    timer = setTimeout(() => flush(), AUTOSAVE_MS);
  }

  /** Stores a change to the journal made by a control other than the text fields, after storing what they hold. */
  function commit(make: (journal: Journal) => Journal): void {
    flush();
    ctx.apply((character) => ({ ...character, journal: make(character.journal) }));
  }

  // Choosing

  function showEditor(): void {
    if (!window.matchMedia(STACKED).matches) return;
    editor.scrollIntoView({ block: 'start' });
    titleField.focus({ preventScroll: true });
  }

  function open(id: string): void {
    flush();
    page = { ...page, selectedId: id, earlier: false, prompting: false };
    draw(ctx.current());
    showEditor();
  }

  /** Writes a new note in the current session, or asks for a session first. */
  function newNote(fields: Partial<NoteFields> = {}, quick = false): void {
    flush();
    const journal = ctx.current().journal;
    const added = addNote(journal, fields, ctx.stamp);
    if (!added.ok) {
      if (added.reason === 'no-session') {
        page = { ...page, selectedId: undefined, earlier: false, prompting: true };
        draw(ctx.current());
        find<HTMLInputElement>('[data-session-title]').focus();
      }
      return;
    }
    const session = currentSession(added.journal)!;
    search.clear();
    page = { ...page, scope: { kind: 'session', id: session.id }, query: '', selectedId: added.id, earlier: false, prompting: false };
    ctx.apply((character) => ({ ...character, journal: added.journal }));
    if (quick) ctx.announce(`Note added to ${session.title}.`);
    else titleField.focus();
  }

  root.addEventListener(NEW_NOTE_EVENT, () => newNote());

  find<HTMLFormElement>('[data-quick]').addEventListener('submit', (event) => {
    event.preventDefault();
    const title = quickInput.value.trim();
    if (title === '') {
      newNote();
      return;
    }
    quickInput.value = '';
    newNote({ title }, true);
  });

  root.addEventListener('click', (event) => {
    const target = event.target as Element;
    const opened = target.closest<HTMLElement>('[data-open]')?.dataset.open;
    if (opened !== undefined) {
      open(opened);
      return;
    }
    const pinned = target.closest<HTMLElement>('[data-pin]')?.dataset.pin;
    if (pinned !== undefined) {
      commit((journal) => togglePin(journal, pinned));
      return;
    }
    if (target.closest('[data-editor-pin]') !== null && page.selectedId !== undefined) {
      const id = page.selectedId;
      commit((journal) => togglePin(journal, id));
      return;
    }
    if (target.closest('[data-earlier]') !== null) {
      flush();
      page = { ...page, selectedId: undefined, earlier: true, prompting: false };
      search.clear();
      draw(ctx.current());
      return;
    }
    const scopeButton = target.closest<HTMLElement>('[data-sidebar] [data-scope]');
    if (scopeButton !== null) {
      flush();
      page = { ...page, scope: scopeOf(scopeButton), earlier: false, prompting: false, query: '' };
      search.clear();
      draw(ctx.current());
      return;
    }
    const removeTagName = target.closest<HTMLElement>('[data-remove-tag]')?.dataset.removeTag;
    if (removeTagName !== undefined && page.selectedId !== undefined) {
      const id = page.selectedId;
      commit((journal) => removeTag(journal, id, removeTagName, ctx.stamp));
      find<HTMLInputElement>('[data-tag-input]').focus();
      return;
    }
    const removeName = target.closest<HTMLElement>('[data-remove-mention]')?.dataset.removeMention;
    if (removeName !== undefined && page.selectedId !== undefined) {
      const id = page.selectedId;
      commit((journal) => removeMention(journal, id, removeName, ctx.stamp));
      find<HTMLInputElement>('[data-mention-input]').focus();
      return;
    }
    if (target.closest('[data-save]') !== null) {
      flush(true);
      return;
    }
    const format = target.closest<HTMLElement>('[data-format]')?.dataset.format;
    if (format !== undefined) {
      formatBody(format);
      return;
    }
    if (target.closest('[data-link-cancel]') !== null) closeLinkForm(true);
  });

  // Editing

  editor.addEventListener('input', (event) => {
    const target = event.target;
    if (target === bodyField) {
      setPreview(preview, bodyField.value);
      const note = selectedNote(ctx.current().journal);
      if (note !== undefined) drawMentions(find('[data-mentions]'), mentionsOf({ body: bodyField.value, mentions: note.mentions }));
      markDirty();
    } else if (target === titleField) {
      markDirty();
    }
  });

  editor.addEventListener('change', (event) => {
    if (event.target === categoryField) flush();
  });

  // Leaving a field stores what it holds, so the player never has to say so.
  editor.addEventListener('focusout', (event) => {
    if (event.target === titleField || event.target === bodyField) flush();
  });

  window.addEventListener('pagehide', () => flush());

  preview.addEventListener('change', (event) => {
    const box = event.target as HTMLInputElement;
    const line = Number(box.dataset.line);
    if (box.type !== 'checkbox' || !Number.isInteger(line)) return;
    bodyField.value = toggleChecklistLine(bodyField.value, line);
    setPreview(preview, bodyField.value);
    flush();
  });

  const rangeOf = (): TextRange => ({ text: bodyField.value, start: bodyField.selectionStart, end: bodyField.selectionEnd });

  function putBack(next: TextRange): void {
    bodyField.value = next.text;
    bodyField.focus();
    bodyField.setSelectionRange(next.start, next.end);
    setPreview(preview, next.text);
    markDirty();
  }

  function closeLinkForm(giveFocusBack: boolean): void {
    linkForm.hidden = true;
    linkInput.value = '';
    if (giveFocusBack) bodyField.focus();
  }

  function formatBody(action: string): void {
    if (action === 'link') {
      linkAt = { start: bodyField.selectionStart, end: bodyField.selectionEnd };
      linkForm.hidden = false;
      linkInput.focus();
    } else if (action === 'bold') {
      putBack(toggleWrap(rangeOf(), '**', PLACEHOLDER.bold));
    } else if (action === 'italic') {
      putBack(toggleWrap(rangeOf(), '*', PLACEHOLDER.italic));
    } else {
      putBack(toggleLines(rangeOf(), action as ListKind));
    }
  }

  linkForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const address = linkInput.value.trim();
    const at = linkAt ?? { start: bodyField.value.length, end: bodyField.value.length };
    closeLinkForm(false);
    if (address === '') {
      bodyField.focus();
      return;
    }
    putBack(insertLink({ text: bodyField.value, ...at }, address));
  });

  find<HTMLFormElement>('[data-tag-form]').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = find<HTMLInputElement>('[data-tag-input]');
    const id = page.selectedId;
    const tag = input.value;
    input.value = '';
    if (id !== undefined) commit((journal) => addTag(journal, id, tag, ctx.stamp));
  });

  find<HTMLFormElement>('[data-mention-form]').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = find<HTMLInputElement>('[data-mention-input]');
    const id = page.selectedId;
    const name = input.value;
    input.value = '';
    if (id !== undefined) commit((journal) => addMention(journal, id, name, ctx.stamp));
  });

  return {
    render(character: V20Character, _mode: SheetMode) {
      draw(character);
    },
    leave() {
      // What was typed is stored before the page forgets which note it was in.
      flush();
      page = fresh();
      search.clear();
      closeLinkForm(false);
      quickInput.value = '';
    },
  };
}
