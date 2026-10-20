// Which of the builder's views the page shows, decided once from the address
// and what is stored under it.

import type { V20Build } from '../../domain/v20/creation/build';
import { createBuildStore, type BuildStore } from '../../storage/buildStore';
import { createCharacterStore, type CharacterStore } from '../../storage/characterStore';
import { browserStorage } from '../../storage/storagePort';

export type PageState =
  | { kind: 'loaded'; build: V20Build; store: BuildStore; characters: CharacterStore }
  | { kind: 'unavailable' }
  | { kind: 'not-found' }
  | { kind: 'unreadable' };

export function pageState(): PageState {
  const storage = browserStorage();
  if (storage === undefined) return { kind: 'unavailable' };

  const id = new URLSearchParams(window.location.search).get('id');
  if (id === null) return { kind: 'not-found' };

  const store = createBuildStore(storage);
  const result = store.load(id);
  switch (result.status) {
    case 'found':
      return { kind: 'loaded', build: result.build, store, characters: createCharacterStore(storage) };
    case 'unreadable':
      return { kind: 'unreadable' };
    case 'not-found':
      return { kind: 'not-found' };
  }
}

const views = {
  builder: document.querySelector<HTMLElement>('#builder')!,
  unavailable: document.querySelector<HTMLElement>('#build-unavailable')!,
  'not-found': document.querySelector<HTMLElement>('#build-not-found')!,
  unreadable: document.querySelector<HTMLElement>('#build-unreadable')!,
};

/** Shows one view and hides the others. */
export function showView(view: keyof typeof views): void {
  // A modal dialog left open would keep the page that replaces the builder out of reach.
  if (view !== 'builder') {
    for (const dialog of views.builder.querySelectorAll('dialog[open]')) (dialog as HTMLDialogElement).close();
  }
  for (const [name, element] of Object.entries(views)) element.hidden = name !== view;
}
