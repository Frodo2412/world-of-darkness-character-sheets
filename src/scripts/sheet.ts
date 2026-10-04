import '../components/controls/box-tracker';
import '../components/controls/dot-rating';
import '../components/controls/health-track';
import type { HealthChange, HealthTrack } from '../components/controls/health-track';
import type { RatingChange, RatingControl } from '../components/controls/rating-control';
import {
  cycleHealthBox,
  namedRow,
  setNamedRow,
  setText,
  setTrait,
  textValue,
  traitValue,
  type V20Character,
} from '../domain/v20/character';
import type { NamedRowRef, TextRef, TraitRef } from '../domain/v20/traits';
import { createCharacterStore } from '../storage/characterStore';

type Update = (character: V20Character) => V20Character;

const store = createCharacterStore(window.localStorage);

const sheet = document.querySelector<HTMLElement>('#sheet')!;
const notFound = document.querySelector<HTMLElement>('#sheet-not-found')!;
const unreadable = document.querySelector<HTMLElement>('#sheet-unreadable')!;
type TextInput = HTMLInputElement | HTMLTextAreaElement;

const textInputs = sheet.querySelectorAll<TextInput>('[data-text]');

const traitRatings = sheet.querySelectorAll<RatingControl>('[data-trait]');
const rowNames = sheet.querySelectorAll<HTMLInputElement>('[data-row-name]');
const healthTrack = sheet.querySelector<HealthTrack>('health-track')!;
const rowRatings = sheet.querySelectorAll<RatingControl>('[data-row-rating]');

const textFieldOf = (input: TextInput): TextRef => input.dataset.text as TextRef;

const traitOf = (rating: RatingControl): TraitRef => rating.dataset.trait as TraitRef;

// Leave a matching input alone so typing does not move the caret.
function showText(input: TextInput, text: string): void {
  if (input.value !== text) input.value = text;
}

function render(character: V20Character): void {
  for (const input of textInputs) {
    showText(input, textValue(character, textFieldOf(input)));
  }
  for (const rating of traitRatings) {
    rating.value = traitValue(character, traitOf(rating));
  }
  healthTrack.damage = character.health;
  for (const input of rowNames) {
    showText(input, namedRow(character, input.dataset.rowName as NamedRowRef)?.name ?? '');
  }
  for (const rating of rowRatings) {
    const row = namedRow(character, rating.dataset.rowRating as NamedRowRef);
    if (row === undefined) continue;
    rating.value = row.rating;
    // A write-in rating is announced with the name the player gave it.
    const label = rating.dataset.label!;
    rating.setAttribute('aria-label', row.name ? `${label}: ${row.name}` : label);
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

  for (const input of textInputs) {
    input.addEventListener('input', () => {
      apply((current) => setText(current, textFieldOf(input), input.value));
    });
  }

  for (const rating of traitRatings) {
    rating.addEventListener('change', (event) => {
      const { value } = (event as CustomEvent<RatingChange>).detail;
      apply((current) => setTrait(current, traitOf(rating), value));
    });
  }

  for (const input of rowNames) {
    input.addEventListener('input', () => {
      const row = input.dataset.rowName as NamedRowRef;
      apply((current) => setNamedRow(current, row, { name: input.value }));
    });
  }
  for (const rating of rowRatings) {
    rating.addEventListener('change', (event) => {
      const row = rating.dataset.rowRating as NamedRowRef;
      const { value } = (event as CustomEvent<RatingChange>).detail;
      apply((current) => setNamedRow(current, row, { rating: value }));
    });
  }

  healthTrack.addEventListener('change', (event) => {
    const { level } = (event as CustomEvent<HealthChange>).detail;
    apply((current) => cycleHealthBox(current, level));
  });

  render(character);
  sheet.hidden = false;
}

type PageState =
  | { kind: 'loaded'; character: V20Character }
  | { kind: 'not-found' }
  | { kind: 'unreadable' };

function pageState(): PageState {
  const id = new URLSearchParams(window.location.search).get('id');
  if (id === null) return { kind: 'not-found' };

  const result = store.load(id);
  switch (result.status) {
    case 'found':
      return { kind: 'loaded', character: result.character };
    case 'unreadable':
      return { kind: 'unreadable' };
    case 'not-found':
      return { kind: 'not-found' };
  }
}

const state = pageState();
switch (state.kind) {
  case 'loaded':
    showSheet(state.character);
    break;
  case 'not-found':
    notFound.hidden = false;
    break;
  case 'unreadable':
    unreadable.hidden = false;
    break;
}
