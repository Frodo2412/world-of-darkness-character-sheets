import { INITIAL_FILTER, entriesOf, view, type LibraryEntry, type LibraryFilter, type LibraryView } from '../domain/v20/library';
import { createBuildStore, type BuildStore } from '../storage/buildStore';
import { browserStorage, createCharacterStore, type CharacterStore } from '../storage/characterStore';
import { builderUrl, drawEntry, editSheetUrl, findTemplates } from './roster/entries';
import { createTabStrip, type TabStrip } from './roster/tabs';
import { STORAGE_UNAVAILABLE, clearStatus, showStatus } from './status';

const librarySection = document.querySelector<HTMLElement>('#library-section')!;
const library = document.querySelector<HTMLElement>('#library')!;
const list = document.querySelector<HTMLUListElement>('#entries')!;
const tabStrip = document.querySelector<HTMLElement>('#chronicle-tabs')!;
const counts = document.querySelector<HTMLElement>('#library-counts')!;
const breakdown = document.querySelector<HTMLElement>('#library-breakdown')!;
const emptyMessage = document.querySelector<HTMLParagraphElement>('#roster-empty')!;
const newCharacterButton = document.querySelector<HTMLButtonElement>('#new-character')!;
const buildButton = document.querySelector<HTMLButtonElement>('#build-character')!;
const templates = findTemplates(document);
const storage = browserStorage();

/** Reads both stores once; every redraw after this works from what was read. */
function load(store: CharacterStore, builds: BuildStore): LibraryEntry[] {
  return entriesOf({ characters: store.list(), builds: builds.list() });
}

/**
 * What the list card shows, chosen here and nowhere else: nothing when the browser withholds storage
 * (there is no library to be empty), otherwise whatever the model says. The model never learns of storage.
 */
function cardState(state: LibraryView['state']): LibraryView['state'] | 'unavailable' {
  return storage === undefined ? 'unavailable' : state;
}

/** A pure redraw from the entries and the filter. The tabs keep their nodes: only their state is written. */
function render(entries: readonly LibraryEntry[], filter: LibraryFilter, tabs: TabStrip): void {
  const current = view(entries, filter);
  const state = cardState(current.state);
  list.replaceChildren(...current.shown.map((entry) => drawEntry(templates, entry)));
  counts.textContent = current.countsLine;
  breakdown.textContent = current.breakdown;
  breakdown.hidden = current.breakdown === '';
  tabs.sync(current.tab, state === 'entries');
  // Without storage the whole labelled section goes, so no empty "Library" region is left behind.
  librarySection.hidden = state === 'unavailable';
  library.hidden = state === 'empty' || state === 'unavailable';
  emptyMessage.hidden = state !== 'empty';
}

/**
 * Draws the library. The tab strip is built here, once, from the tabs of the unfiltered view; the filter
 * is held here, and choosing a tab patches it and redraws. The library is only ever redrawn, never re-read.
 */
function open(entries: readonly LibraryEntry[]): void {
  let filter = INITIAL_FILTER;
  const tabs = createTabStrip(tabStrip, library, view(entries, filter).tabs, (tab) => {
    filter = { ...filter, tab };
    render(entries, filter, tabs);
  });
  render(entries, filter, tabs);
}

/**
 * Says a create was refused. The message is cleared and written again on the next frame: the same
 * text written over itself would not be announced, and a repeated refusal has to be.
 */
function refuse(text: string): void {
  clearStatus();
  requestAnimationFrame(() => showStatus(text));
}

/**
 * Creates a record and opens it, or says why not and stays on the roster.
 * `create` returns the new record's id, or nothing when the browser refused to store it.
 */
function createAndOpen(create: () => string | undefined, failure: string, address: (id: string) => string): void {
  const id = create();
  if (id === undefined) {
    refuse(failure);
    return;
  }
  clearStatus();
  window.location.assign(address(id));
}

function start(store: CharacterStore, builds: BuildStore): void {
  open(load(store, builds));

  newCharacterButton.addEventListener('click', () =>
    createAndOpen(
      () => {
        const result = store.create();
        return result.status === 'created' ? result.character.id : undefined;
      },
      'The new character could not be saved. This browser refused to store it.',
      editSheetUrl,
    ),
  );

  buildButton.addEventListener('click', () =>
    createAndOpen(
      () => {
        const result = builds.create();
        return result.status === 'created' ? result.build.id : undefined;
      },
      'The new build could not be saved. This browser refused to store it.',
      builderUrl,
    ),
  );

  // A page restored from the back/forward cache is showing what was stored when it was left:
  // start again, as the sheet does, so entries created since are listed.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) window.location.reload();
  });
}

if (storage === undefined) {
  showStatus(STORAGE_UNAVAILABLE);
  // aria-disabled, not disabled: the actions stay in the tab order, and say why they do nothing.
  for (const button of [newCharacterButton, buildButton]) {
    button.setAttribute('aria-disabled', 'true');
    button.setAttribute('aria-describedby', 'status-message');
  }
  open([]);
} else {
  start(createCharacterStore(storage), createBuildStore(storage));
}
