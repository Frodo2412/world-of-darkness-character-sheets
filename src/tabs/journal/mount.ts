import { makeCurrent, renameSession, startSession } from '../../domain/v20/journal/sessions';
import { sessionChange, sessionsView } from '../../domain/v20/journal/sessionView';
import type { V20Character } from '../../domain/v20/character';
import type { Journal } from '../../domain/v20/journal/types';
import { setText } from '../../scripts/dossier/dom';
import { START_SESSION_EVENT, wireSessionPrompts, type StartSessionEvent } from '../../scripts/dossier/sessionPrompt';
import type { SheetMode } from '../../scripts/sheet/mode';
import { appBarLabel } from '../../scripts/sheet/observers/appBarLabel';
import type { MountedTab, TabContext } from '../../scripts/tabs/context';
import { drawSessions, type SessionsState } from './drawSessions';
import { NEW_NOTE_EVENT } from './events';
import { mount as mountExperience } from './experience/mount';
import { mount as mountNotes } from './notes/mount';
import { mount as mountRecord } from './record/mount';

type SectionKey = 'notes' | 'experience' | 'record';

/** The sections, in the order the page shows them; each folder beside this file mounts the same way a tab does. */
const SECTIONS: readonly { key: SectionKey; mount: (ctx: TabContext, root: HTMLElement) => MountedTab }[] = [
  { key: 'notes', mount: mountNotes },
  { key: 'experience', mount: mountExperience },
  { key: 'record', mount: mountRecord },
];

/** The Journal tab: the sessions, and the Notes, Experience and Character Record sections under one sub-navigation. */
export function mount(ctx: TabContext): MountedTab {
  const { root } = ctx;
  const find = <T extends HTMLElement>(selector: string): T => root.querySelector<T>(selector)!;
  const sectionRoot = (key: SectionKey): HTMLElement => find(`[data-journal-section="${key}"]`);
  const mounted = SECTIONS.map(({ key, mount: mountSection }) => mountSection(ctx, sectionRoot(key)));

  // Page state: forgotten when the tab is left. The sessions themselves are stored.
  const state: SessionsState = { renaming: undefined, showAll: false };
  let change: string | undefined;
  let mode: SheetMode = 'play';

  wireSessionPrompts(root);

  /** Draws again for a change of page state only: nothing is stored. */
  function redraw(): void {
    tab.render(ctx.current(), mode);
  }

  const focusRename = (id: string): void => root.querySelector<HTMLElement>(`[data-focus-key="rename-button:${id}"]`)?.focus();

  /** Brings a section to the top of the screen and puts focus on its heading. */
  function showSection(key: SectionKey): void {
    const section = sectionRoot(key);
    section.scrollIntoView({ block: 'start' });
    section.querySelector<HTMLElement>('[id$="-title"]')?.focus({ preventScroll: true });
    for (const link of root.querySelectorAll<HTMLElement>('[data-section-link]')) {
      if (link.dataset.sectionLink === key) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  }

  /** Stores the journal the change produces, and tells the player when it changed which session is current. */
  function commit(make: (journal: Journal) => Journal): void {
    const before = ctx.current().journal;
    const after = make(before);
    change = sessionChange(before, after);
    ctx.apply((character) => ({ ...character, journal: after }));
    if (change !== undefined) ctx.announce(change);
  }

  const start = (title: string): void => commit((journal) => startSession(journal, title, ctx.stamp));

  function switchTo(id: string): void {
    commit((journal) => makeCurrent(journal, id));
    focusRename(id);
  }

  function rename(id: string, title: string): void {
    state.renaming = undefined;
    commit((journal) => renameSession(journal, id, title));
    focusRename(id);
  }

  const startForm = find<HTMLFormElement>('[data-start-form]');
  const startTitle = find<HTMLInputElement>('[data-start-title]');
  startForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = startTitle.value;
    startTitle.value = '';
    start(title);
  });
  // A session started from the notes' own prompt, whose form wireSessionPrompts has already emptied.
  root.addEventListener(START_SESSION_EVENT, (event) => start((event as StartSessionEvent).detail.title));

  root.addEventListener('click', (event) => {
    const target = event.target as Element;
    const link = target.closest<HTMLElement>('[data-section-link]');
    if (link !== null) {
      event.preventDefault();
      showSection(link.dataset.sectionLink as SectionKey);
      return;
    }
    if (target.closest('[data-new-note]') !== null) {
      sectionRoot('notes').dispatchEvent(new CustomEvent(NEW_NOTE_EVENT));
      showSection('notes');
      return;
    }
    if (target.closest('[data-focus-start]') !== null) {
      startTitle.focus();
      return;
    }
    if (target.closest('[data-show-all-sessions]') !== null) {
      state.showAll = !state.showAll;
      redraw();
      return;
    }
    const make = target.closest<HTMLElement>('[data-make-current]')?.dataset.makeCurrent;
    if (make !== undefined) {
      switchTo(make);
      return;
    }
    const renaming = target.closest<HTMLElement>('[data-rename]')?.dataset.rename;
    if (renaming !== undefined) {
      state.renaming = renaming;
      redraw();
      root.querySelector<HTMLElement>(`[data-rename-input="${renaming}"]`)?.focus();
      return;
    }
    const save = target.closest<HTMLElement>('[data-rename-save]')?.dataset.renameSave;
    if (save !== undefined) {
      const input = root.querySelector<HTMLInputElement>(`[data-rename-input="${save}"]`)!;
      rename(save, input.value);
      return;
    }
    const cancel = target.closest<HTMLElement>('[data-rename-cancel]')?.dataset.renameCancel;
    if (cancel !== undefined) {
      state.renaming = undefined;
      redraw();
      focusRename(cancel);
    }
  });

  root.addEventListener('keydown', (event) => {
    const input = (event.target as Element).closest<HTMLInputElement>('[data-rename-input]');
    if (input === null) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      rename(input.dataset.renameInput!, input.value);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      const id = input.dataset.renameInput!;
      state.renaming = undefined;
      redraw();
      focusRename(id);
    }
  });

  function drawShell(character: V20Character): void {
    const where = find('[data-where]');
    setText(where, appBarLabel(character));
    const empty = character.journal.sessions.length === 0 && character.journal.notes.length === 0;
    find('[data-journal-empty]').hidden = !empty;
    const view = sessionsView(character.journal);
    drawSessions(root, view, state);
    startTitle.placeholder = `Session ${character.journal.sessions.length + 1}`;
    const notice = find('[data-change]');
    notice.hidden = change === undefined;
    setText(notice, change ?? '');
  }

  const tab: MountedTab = {
    render(character: V20Character, shown: SheetMode) {
      mode = shown;
      drawShell(character);
      for (const section of mounted) section.render(character, shown);
    },
    enter() {
      for (const section of mounted) section.enter?.();
    },
    leave() {
      state.renaming = undefined;
      state.showAll = false;
      change = undefined;
      for (const section of mounted) section.leave?.();
    },
    changed(before, after) {
      for (const section of mounted) section.changed?.(before, after);
    },
  };
  return tab;
}
