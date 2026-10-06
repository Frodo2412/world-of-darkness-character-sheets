import { displayName, type V20Character } from '../domain/v20/character';
import { createBuildStore, type BuildEntry, type BuildStore } from '../storage/buildStore';
import {
  browserStorage,
  createCharacterStore,
  type CharacterStore,
  type RosterEntry,
} from '../storage/characterStore';
import { STORAGE_UNAVAILABLE, clearStatus, showStatus } from './status';

const list = document.querySelector<HTMLUListElement>('#roster')!;
const emptyMessage = document.querySelector<HTMLParagraphElement>('#roster-empty')!;
const buildsSection = document.querySelector<HTMLElement>('#builds-section')!;
const buildList = document.querySelector<HTMLUListElement>('#builds')!;
const newCharacterButton = document.querySelector<HTMLButtonElement>('#new-character')!;
const buildButton = document.querySelector<HTMLButtonElement>('#build-character')!;

const sheetUrl = (id: string): string => `/sheet/?id=${encodeURIComponent(id)}`;
// A new character is there to be filled in, so its sheet opens in edit mode.
const newSheetUrl = (id: string): string => `${sheetUrl(id)}#edit`;
const builderUrl = (id: string): string => `/build/?id=${encodeURIComponent(id)}`;

function detail(label: string, value: string): HTMLElement[] {
  if (value === '') return [];
  const element = document.createElement('span');
  element.textContent = `${label}: ${value}`;
  return [element];
}

/**
 * Display names made distinct by numbering repeats ("Unnamed build",
 * "Unnamed build 2", …), so every control on the roster has its own name.
 */
function numbered(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const count = (seen.get(name) ?? 0) + 1;
    seen.set(name, count);
    return count === 1 ? name : `${name} ${count}`;
  });
}

function start(store: CharacterStore, builds: BuildStore): void {
  function entryItem(content: HTMLElement[], unreadable = false): HTMLLIElement {
    const item = document.createElement('li');
    if (unreadable) item.dataset.unreadable = '';
    item.append(...content);
    return item;
  }

  function unreadableContent(kind: string, id: string): HTMLElement[] {
    const title = document.createElement('strong');
    title.textContent = `Unreadable ${kind}`;
    const explanation = document.createElement('span');
    explanation.textContent = `The saved data for this ${kind} (${id}) could not be read. It has been left untouched.`;
    return [title, explanation];
  }

  function characterItem(character: V20Character): HTMLLIElement {
    const name = displayName(character);
    const link = document.createElement('a');
    link.href = sheetUrl(character.id);
    link.textContent = name;
    return entryItem([
      link,
      ...detail('Clan', character.header.clan),
      ...detail('Player', character.header.player),
    ]);
  }

  /** A record that could not be read is shown, never hidden. */
  function unreadableCharacterItem(id: string): HTMLLIElement {
    return entryItem(unreadableContent('character', id), true);
  }

  function rosterItem(entry: RosterEntry): HTMLLIElement {
    if (entry.kind === 'unreadable') return unreadableCharacterItem(entry.id);
    try {
      return characterItem(entry.character);
    } catch {
      // One record that cannot be drawn must not take the rest of the roster with it.
      return unreadableCharacterItem(entry.character.id);
    }
  }

  function buildItem(entry: BuildEntry, name: string): HTMLLIElement {
    if (entry.kind === 'unreadable') {
      return entryItem(unreadableContent('build', entry.id), true);
    }
    const title = document.createElement('strong');
    title.textContent = name;
    const marker = document.createElement('span');
    marker.textContent = 'In progress';
    const link = document.createElement('a');
    link.href = builderUrl(entry.build.id);
    link.textContent = 'Continue';
    link.setAttribute('aria-label', `Continue ${name}`);
    return entryItem([title, marker, ...detail('Clan', entry.build.clan), link]);
  }

  const buildName = (entry: BuildEntry): string =>
    entry.kind === 'unreadable' ? 'unreadable build' : entry.build.concept.name.trim() || 'Unnamed build';

  function render(): void {
    const entries = store.list();
    list.replaceChildren(...entries.map(rosterItem));
    list.hidden = entries.length === 0;
    emptyMessage.hidden = entries.length > 0;

    const buildEntries = builds.list();
    const names = numbered(buildEntries.map(buildName));
    buildList.replaceChildren(...buildEntries.map((entry, index) => buildItem(entry, names[index])));
    buildsSection.hidden = buildEntries.length === 0;
  }

  newCharacterButton.addEventListener('click', () => {
    const result = store.create();
    if (result.status === 'failed') {
      showStatus('The new character could not be saved. This browser refused to store it.');
      return;
    }
    clearStatus();
    window.location.assign(newSheetUrl(result.character.id));
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

  // A page restored from the back/forward cache must show characters created since.
  window.addEventListener('pageshow', render);
}

const storage = browserStorage();
if (storage === undefined) {
  showStatus(STORAGE_UNAVAILABLE);
  newCharacterButton.disabled = true;
  buildButton.disabled = true;
} else {
  start(createCharacterStore(storage), createBuildStore(storage));
}
