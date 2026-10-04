import { setHeaderField, type V20Character } from '../domain/v20/character';
import type { HeaderField } from '../domain/v20/traits';
import { createCharacterStore } from '../storage/characterStore';

type Update = (character: V20Character) => V20Character;

const store = createCharacterStore(window.localStorage);

const sheet = document.querySelector<HTMLElement>('#sheet')!;
const notFound = document.querySelector<HTMLElement>('#sheet-not-found')!;
const headerInputs = sheet.querySelectorAll<HTMLInputElement>('[data-header-field]');

const headerFieldOf = (input: HTMLInputElement): HeaderField =>
  input.dataset.headerField as HeaderField;

function render(character: V20Character): void {
  for (const input of headerInputs) {
    const text = character.header[headerFieldOf(input)];
    // Leave a matching input alone so typing does not move the caret.
    if (input.value !== text) input.value = text;
  }
}

function showSheet(loaded: V20Character): void {
  let character = loaded;

  /** The one path every edit takes: update the model, redraw, save. */
  function apply(update: Update): void {
    character = update(character);
    render(character);
    store.save(character);
  }

  for (const input of headerInputs) {
    input.addEventListener('input', () => {
      apply((current) => setHeaderField(current, headerFieldOf(input), input.value));
    });
  }

  render(character);
  sheet.hidden = false;
}

type PageState = { kind: 'loaded'; character: V20Character } | { kind: 'not-found' };

function pageState(): PageState {
  const id = new URLSearchParams(window.location.search).get('id');
  if (id === null) return { kind: 'not-found' };

  const result = store.load(id);
  return result.status === 'found'
    ? { kind: 'loaded', character: result.character }
    : { kind: 'not-found' };
}

const state = pageState();
switch (state.kind) {
  case 'loaded':
    showSheet(state.character);
    break;
  case 'not-found':
    notFound.hidden = false;
    break;
}
