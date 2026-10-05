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
const deleteDialog = document.querySelector<HTMLDialogElement>('#delete-dialog')!;
const deleteTitle = document.querySelector<HTMLHeadingElement>('#delete-dialog-title')!;
const deleteMessage = document.querySelector<HTMLParagraphElement>('#delete-dialog-message')!;

const sheetUrl = (id: string): string => `/sheet/?id=${encodeURIComponent(id)}`;
const builderUrl = (id: string): string => `/build/?id=${encodeURIComponent(id)}`;

function detail(label: string, value: string): HTMLElement[] {
  if (value === '') return [];
  const element = document.createElement('span');
  element.textContent = `${label}: ${value}`;
  return [element];
}

/** What a delete asks and does, whatever is being deleted. */
interface Deletion {
  /** The delete button's accessible name. */
  label: string;
  title: string;
  question: string;
  onConfirm: () => void;
}

/** One roster entry: what it shows, then its delete button. */
interface EntryDescription {
  content: HTMLElement[];
  deletion: Deletion;
  unreadable?: boolean;
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
  /** Asks before deleting; the dialog opens with Cancel focused. */
  function confirmDelete({ title, question, onConfirm }: Deletion): void {
    deleteTitle.textContent = title;
    deleteMessage.textContent = question;
    deleteDialog.returnValue = '';
    deleteDialog.addEventListener(
      'close',
      () => {
        if (deleteDialog.returnValue !== 'confirm') return;
        onConfirm();
        render();
        // The button that opened the dialog is gone, so focus needs a new home.
        newCharacterButton.focus();
      },
      { once: true },
    );
    deleteDialog.showModal();
  }

  function entryItem({ content, deletion, unreadable }: EntryDescription): HTMLLIElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Delete';
    button.setAttribute('aria-label', deletion.label);
    button.addEventListener('click', () => confirmDelete(deletion));

    const item = document.createElement('li');
    if (unreadable) item.dataset.unreadable = '';
    item.append(...content, button);
    return item;
  }

  function unreadableContent(kind: string, id: string): HTMLElement[] {
    const title = document.createElement('strong');
    title.textContent = `Unreadable ${kind}`;
    const explanation = document.createElement('span');
    explanation.textContent = `The saved data for this ${kind} (${id}) could not be read. It has been left untouched.`;
    return [title, explanation];
  }

  const deleteCharacter = (id: string) => () => store.delete(id);

  function characterItem(character: V20Character): HTMLLIElement {
    const name = displayName(character);
    const link = document.createElement('a');
    link.href = sheetUrl(character.id);
    link.textContent = name;
    return entryItem({
      content: [
        link,
        ...detail('Clan', character.header.clan),
        ...detail('Player', character.header.player),
      ],
      deletion: {
        label: `Delete ${name}`,
        title: 'Delete character?',
        question: `Delete ${name}? This cannot be undone.`,
        onConfirm: deleteCharacter(character.id),
      },
    });
  }

  /** A record that could not be read is shown, never hidden, so the player can decide its fate. */
  function unreadableCharacterItem(id: string): HTMLLIElement {
    return entryItem({
      content: unreadableContent('character', id),
      deletion: {
        label: `Delete unreadable character ${id}`,
        title: 'Delete character?',
        question:
          'Delete this unreadable character? Its saved data will be removed. This cannot be undone.',
        onConfirm: deleteCharacter(id),
      },
      unreadable: true,
    });
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

  function deleteBuild(id: string): () => void {
    return () => {
      if (builds.delete(id).status === 'failed') {
        showStatus('The build could not be deleted. This browser refused to change its storage.');
      }
    };
  }

  function buildItem(entry: BuildEntry, name: string): HTMLLIElement {
    if (entry.kind === 'unreadable') {
      return entryItem({
        content: unreadableContent('build', entry.id),
        deletion: {
          label: `Delete ${name}`,
          title: 'Delete build?',
          question:
            'Delete this unreadable build? Its saved data will be removed. This cannot be undone.',
          onConfirm: deleteBuild(entry.id),
        },
        unreadable: true,
      });
    }
    const title = document.createElement('strong');
    title.textContent = name;
    const marker = document.createElement('span');
    marker.textContent = 'In progress';
    const link = document.createElement('a');
    link.href = builderUrl(entry.build.id);
    link.textContent = 'Continue';
    link.setAttribute('aria-label', `Continue ${name}`);
    return entryItem({
      content: [title, marker, ...detail('Clan', entry.build.clan), link],
      deletion: {
        label: `Delete build ${name}`,
        title: 'Delete build?',
        question: `Delete the build ${name}? This cannot be undone.`,
        onConfirm: deleteBuild(entry.build.id),
      },
    });
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
    window.location.assign(sheetUrl(result.character.id));
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
