// Which of the builder's views the page shows, decided once from the address
// and what is stored under it.

import type { V20Build } from '../../domain/v20/creation/build';
import { createBuildStore, type BuildStore } from '../../storage/buildStore';
import { browserStorage } from '../../storage/storagePort';

export type PageState =
  | { kind: 'loaded'; build: V20Build; store: BuildStore }
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
      return { kind: 'loaded', build: result.build, store };
    case 'unreadable':
      return { kind: 'unreadable' };
    case 'not-found':
      return { kind: 'not-found' };
  }
}

const views = {
  builder: document.querySelector<HTMLElement>('#builder')!,
  'not-found': document.querySelector<HTMLElement>('#build-not-found')!,
  unreadable: document.querySelector<HTMLElement>('#build-unreadable')!,
};

/** Shows one view and hides the others; `none` leaves only the save status visible. */
export function showView(view: keyof typeof views | 'none'): void {
  for (const [name, element] of Object.entries(views)) element.hidden = name !== view;
}
