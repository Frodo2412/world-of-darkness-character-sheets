import { INITIAL_FILTER, entriesOf, view, type LibraryEntry, type LibraryFilter } from '../domain/v20/library';
import { createBuildStore, type BuildStore } from '../storage/buildStore';
import { browserStorage, createCharacterStore, type CharacterStore } from '../storage/characterStore';
import { builderUrl, drawEntry, editSheetUrl, findTemplates } from './roster/entries';
import { STORAGE_UNAVAILABLE, clearStatus, showStatus } from './status';

const library = document.querySelector<HTMLElement>('#library')!;
const list = document.querySelector<HTMLUListElement>('#entries')!;
const counts = document.querySelector<HTMLElement>('#library-counts')!;
const emptyMessage = document.querySelector<HTMLParagraphElement>('#roster-empty')!;
const newCharacterButton = document.querySelector<HTMLButtonElement>('#new-character')!;
const buildButton = document.querySelector<HTMLButtonElement>('#build-character')!;
const templates = findTemplates(document);

/** Reads both stores once; every redraw after this works from what was read. */
function load(store: CharacterStore, builds: BuildStore): LibraryEntry[] {
  return entriesOf({ characters: store.list(), builds: builds.list() });
}

/** A pure redraw from the entries and the filter. */
function render(entries: readonly LibraryEntry[], filter: LibraryFilter): void {
  const current = view(entries, filter);
  list.replaceChildren(...current.shown.map((entry) => drawEntry(templates, entry)));
  counts.textContent = current.countsLine;
  library.hidden = current.state === 'empty';
  emptyMessage.hidden = current.state !== 'empty';
}

/**
 * Creates a record and opens it, or says why not and stays on the roster.
 * `create` returns the new record's id, or nothing when the browser refused to store it.
 */
function createAndOpen(create: () => string | undefined, failure: string, address: (id: string) => string): void {
  const id = create();
  if (id === undefined) {
    showStatus(failure);
    return;
  }
  clearStatus();
  window.location.assign(address(id));
}

function start(store: CharacterStore, builds: BuildStore): void {
  render(load(store, builds), INITIAL_FILTER);

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

const storage = browserStorage();
if (storage === undefined) {
  showStatus(STORAGE_UNAVAILABLE);
  newCharacterButton.disabled = true;
  buildButton.disabled = true;
} else {
  start(createCharacterStore(storage), createBuildStore(storage));
}
