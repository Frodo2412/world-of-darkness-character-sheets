import { INITIAL_FILTER, entriesOf, view, type LibraryEntry, type LibraryFilter, type LibraryView } from '../domain/v20/library';
import { createBuildStore, type BuildStore } from '../storage/buildStore';
import { browserStorage, createCharacterStore, type CharacterStore } from '../storage/characterStore';
import { announcementOf, createAnnouncer, sortAnnouncementOf } from './roster/announce';
import { createControls, shortcutFor, type Controls } from './roster/controls';
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
const tools = document.querySelector<HTMLElement>('#library-tools')!;
const searchField = document.querySelector<HTMLInputElement>('#library-search')!;
const noMatch = document.querySelector<HTMLElement>('#roster-no-match')!;
const searchHint = document.querySelector<HTMLElement>('[data-slot="search-hint"]')!;
const clanSelect = document.querySelector<HTMLSelectElement>('#library-clan')!;
const sortSelect = document.querySelector<HTMLSelectElement>('#library-sort')!;
const statusGroup = document.querySelector<HTMLElement>('#library-status')!;
const clearFiltersButton = document.querySelector<HTMLButtonElement>('#clear-filters')!;
const liveRegion = document.querySelector<HTMLElement>('#library-announcements')!;
const newCharacterButton = document.querySelector<HTMLButtonElement>('#new-character')!;
const buildButton = document.querySelector<HTMLButtonElement>('#build-character')!;
const templates = findTemplates(document);
const storage = browserStorage();

/** Reads both stores once; every redraw after this works from what was read. */
function load(store: CharacterStore, builds: BuildStore): LibraryEntry[] {
  return entriesOf({ characters: store.list(), builds: builds.list() });
}

/** What the library column shows for a state of the library. */
interface Parts {
  /** The whole labelled section, "Library" heading included. */
  section: boolean;
  /** The tab strip and the browsing tools, the clan and status filters among them: how the player gets back what a filter took away. */
  browsing: boolean;
  /** The list card, which holds the entries, the no-match message and the summary row. */
  card: boolean;
  entries: boolean;
  noMatch: boolean;
  empty: boolean;
}

/**
 * Which parts of the library column each state shows: the one place a state is turned into what is
 * drawn. `unavailable` is the browser withholding storage, so there is no library to be empty; the
 * model never learns of storage and says `entries`, `empty` or `no-match`.
 */
const SHOWN: Record<LibraryView['state'] | 'unavailable', Parts> = {
  entries: { section: true, browsing: true, card: true, entries: true, noMatch: false, empty: false },
  'no-match': { section: true, browsing: true, card: true, entries: false, noMatch: true, empty: false },
  empty: { section: true, browsing: false, card: false, entries: false, noMatch: false, empty: true },
  // Without storage the whole labelled section goes, so no empty "Library" region is left behind.
  unavailable: { section: false, browsing: false, card: false, entries: false, noMatch: false, empty: false },
};

const partsShownFor = (state: LibraryView['state']): Parts => SHOWN[storage === undefined ? 'unavailable' : state];

/** A pure redraw from the entries and the filter. The tabs and controls keep their nodes: only their state is written. */
function render(entries: readonly LibraryEntry[], filter: LibraryFilter, tabs: TabStrip, controls: Controls): LibraryView {
  const current = view(entries, filter);
  const shown = partsShownFor(current.state);
  list.replaceChildren(...current.shown.map((entry) => drawEntry(templates, entry)));
  counts.textContent = current.countsLine;
  breakdown.textContent = current.breakdown;
  breakdown.hidden = current.breakdown === '';
  tabs.sync(current.tab, shown.browsing);
  controls.sync(current, filter);
  librarySection.hidden = !shown.section;
  tools.hidden = !shown.browsing;
  library.hidden = !shown.card;
  list.hidden = !shown.entries;
  noMatch.hidden = !shown.noMatch;
  emptyMessage.hidden = !shown.empty;
  return current;
}

/**
 * Draws the library. The tab strip and the clan filter's options are built here, once, from the unfiltered view; the filter
 * is held here, and every control patches it through `change`, which redraws and says the result. That is
 * the only path that announces: the first draw is the player arriving, not changing anything.
 * The library is only ever redrawn, never re-read.
 */
function open(entries: readonly LibraryEntry[]): void {
  let filter = INITIAL_FILTER;
  const announce = createAnnouncer(liveRegion);
  const change = (patch: Partial<LibraryFilter>): void => {
    const { order } = filter;
    filter = { ...filter, ...patch };
    const current = render(entries, filter, tabs, controls);
    // A new order leaves the same entries, so what the player needs to hear is the order, not the count.
    // "Clear filters" hands back the order it kept, which is not a change of it.
    announce(filter.order === order ? announcementOf(current) : sortAnnouncementOf(filter.order));
  };
  const unfiltered = view(entries, filter);
  const tabs = createTabStrip(tabStrip, library, unfiltered.tabs, (tab) => change({ tab }));
  const controls = createControls(
    { tools, search: searchField, hint: searchHint, clear: clearFiltersButton, keys: document, clan: clanSelect, status: statusGroup, order: sortSelect },
    unfiltered.clans,
    change,
    shortcutFor(navigator),
  );
  render(entries, filter, tabs, controls);
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
