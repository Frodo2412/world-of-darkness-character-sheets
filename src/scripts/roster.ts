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

function start(store: CharacterStore, builds: BuildStore): void {
  const templates = findTemplates(document);

  /** Reads both stores once; every redraw after this works from what was read. */
  function load(): LibraryEntry[] {
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

  render(load(), INITIAL_FILTER);

  newCharacterButton.addEventListener('click', () => {
    const result = store.create();
    if (result.status === 'failed') {
      showStatus('The new character could not be saved. This browser refused to store it.');
      return;
    }
    clearStatus();
    window.location.assign(editSheetUrl(result.character.id));
  });

  buildButton.addEventListener('click', () => {
    const result = builds.create();
    if (result.status === 'failed') {
      showStatus('The new build could not be saved. This browser refused to store it.');
      return;
    }
    clearStatus();
    window.location.assign(builderUrl(result.build.id));
  });

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
