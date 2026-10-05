import { displayName, type V20Character } from '../domain/v20/character';
import {
  browserStorage,
  createCharacterStore,
  type CharacterStore,
  type RosterEntry,
} from '../storage/characterStore';
import { createBuildStore, type BuildStore } from '../storage/buildStore';
import { STORAGE_UNAVAILABLE, clearStatus, showStatus } from './status';

const list = document.querySelector<HTMLUListElement>('#roster')!;
const emptyMessage = document.querySelector<HTMLParagraphElement>('#roster-empty')!;
const newCharacterButton = document.querySelector<HTMLButtonElement>('#new-character')!;
const buildButton = document.querySelector<HTMLButtonElement>('#build-character')!;
const deleteDialog = document.querySelector<HTMLDialogElement>('#delete-dialog')!;
const deleteMessage = document.querySelector<HTMLParagraphElement>('#delete-dialog-message')!;

const sheetUrl = (id: string): string => `/sheet/?id=${encodeURIComponent(id)}`;
const builderUrl = (id: string): string => `/build/?id=${encodeURIComponent(id)}`;

function detail(label: string, value: string): HTMLElement[] {
  if (value === '') return [];
  const element = document.createElement('span');
  element.textContent = `${label}: ${value}`;
  return [element];
}

function start(store: CharacterStore, builds: BuildStore): void {
  function deleteButton(id: string, name: string, question: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Delete';
    button.setAttribute('aria-label', `Delete ${name}`);
    button.addEventListener('click', () => confirmDelete(id, question));
    return button;
  }

  function characterItem(character: V20Character): HTMLLIElement {
    const name = displayName(character);
    const link = document.createElement('a');
    link.href = sheetUrl(character.id);
    link.textContent = name;

    const item = document.createElement('li');
    item.append(
      link,
      ...detail('Clan', character.header.clan),
      ...detail('Player', character.header.player),
      deleteButton(character.id, name, `Delete ${name}? This cannot be undone.`),
    );
    return item;
  }

  /** A record that could not be read is shown, never hidden, so the player can decide its fate. */
  function unreadableItem(id: string): HTMLLIElement {
    const title = document.createElement('strong');
    title.textContent = 'Unreadable character';

    const explanation = document.createElement('span');
    explanation.textContent = `The saved data for this character (${id}) could not be read. It has been left untouched.`;

    const item = document.createElement('li');
    item.dataset.unreadable = '';
    item.append(
      title,
      explanation,
      deleteButton(
        id,
        `unreadable character ${id}`,
        'Delete this unreadable character? Its saved data will be removed. This cannot be undone.',
      ),
    );
    return item;
  }

  function rosterItem(entry: RosterEntry): HTMLLIElement {
    if (entry.kind === 'unreadable') return unreadableItem(entry.id);
    try {
      return characterItem(entry.character);
    } catch {
      // One record that cannot be drawn must not take the rest of the roster with it.
      return unreadableItem(entry.character.id);
    }
  }

  /** Asks before deleting; the dialog opens with Cancel focused. */
  function confirmDelete(id: string, question: string): void {
    deleteMessage.textContent = question;
    deleteDialog.returnValue = '';
    deleteDialog.addEventListener(
      'close',
      () => {
        if (deleteDialog.returnValue !== 'confirm') return;
        store.delete(id);
        render();
        // The button that opened the dialog is gone, so focus needs a new home.
        newCharacterButton.focus();
      },
      { once: true },
    );
    deleteDialog.showModal();
  }

  function render(): void {
    const entries = store.list();
    list.replaceChildren(...entries.map(rosterItem));
    list.hidden = entries.length === 0;
    emptyMessage.hidden = entries.length > 0;
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
