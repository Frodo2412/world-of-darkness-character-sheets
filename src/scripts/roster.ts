import { displayName, type V20Character } from '../domain/v20/character';
import { createCharacterStore } from '../storage/characterStore';

const store = createCharacterStore(window.localStorage);

const list = document.querySelector<HTMLUListElement>('#roster')!;
const emptyMessage = document.querySelector<HTMLParagraphElement>('#roster-empty')!;
const newCharacterButton = document.querySelector<HTMLButtonElement>('#new-character')!;
const deleteDialog = document.querySelector<HTMLDialogElement>('#delete-dialog')!;
const deleteMessage = document.querySelector<HTMLParagraphElement>('#delete-dialog-message')!;

const sheetUrl = (id: string): string => `/sheet/?id=${encodeURIComponent(id)}`;

function detail(label: string, value: string): HTMLElement[] {
  if (value === '') return [];
  const element = document.createElement('span');
  element.textContent = `${label}: ${value}`;
  return [element];
}

function rosterItem(character: V20Character): HTMLLIElement {
  const link = document.createElement('a');
  link.href = sheetUrl(character.id);
  link.textContent = displayName(character);

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.textContent = 'Delete';
  deleteButton.setAttribute('aria-label', `Delete ${displayName(character)}`);
  deleteButton.addEventListener('click', () => confirmDelete(character));

  const item = document.createElement('li');
  item.append(
    link,
    ...detail('Clan', character.header.clan),
    ...detail('Player', character.header.player),
    deleteButton,
  );
  return item;
}

/** Asks before deleting; the dialog opens with Cancel focused. */
function confirmDelete(character: V20Character): void {
  deleteMessage.textContent = `Delete ${displayName(character)}? This cannot be undone.`;
  deleteDialog.returnValue = '';
  deleteDialog.addEventListener(
    'close',
    () => {
      if (deleteDialog.returnValue !== 'confirm') return;
      store.delete(character.id);
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
  list.replaceChildren(...entries.map((entry) => rosterItem(entry.character)));
  list.hidden = entries.length === 0;
  emptyMessage.hidden = entries.length > 0;
}

newCharacterButton.addEventListener('click', () => {
  const { character } = store.create();
  window.location.assign(sheetUrl(character.id));
});

// A page restored from the back/forward cache must show characters created since.
window.addEventListener('pageshow', render);
