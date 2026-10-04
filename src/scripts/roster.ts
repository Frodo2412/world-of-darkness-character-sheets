import { displayName, type V20Character } from '../domain/v20/character';
import { createCharacterStore } from '../storage/characterStore';

const store = createCharacterStore(window.localStorage);

const list = document.querySelector<HTMLUListElement>('#roster')!;
const emptyMessage = document.querySelector<HTMLParagraphElement>('#roster-empty')!;
const newCharacterButton = document.querySelector<HTMLButtonElement>('#new-character')!;

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

  const item = document.createElement('li');
  item.append(
    link,
    ...detail('Clan', character.header.clan),
    ...detail('Player', character.header.player),
  );
  return item;
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
