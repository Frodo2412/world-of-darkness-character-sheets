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
  stepBlood,
  stepTemporaryWillpower,
  textValue,
  traitValue,
  type V20Character,
} from '../domain/v20/character';
import { RATING_RANGE, rangeOf, type NamedRowRef, type TextRef, type TraitRef } from '../domain/v20/traits';
import { bloodPoolMaximum } from '../domain/v20/resources';
import {
  browserStorage,
  createCharacterStore,
  keyFor,
  type CharacterStore,
} from '../storage/characterStore';
import { drawIdentity } from './sheet/identityCard';
import { createMode, type Mode, type SheetMode } from './sheet/mode';
import { createPool, type PoolRow } from './sheet/pool';
import { announcePool, drawPoolCard } from './sheet/poolCard';
import { drawRating } from './sheet/ratingDraw';
import { announce, announceWound, drawResourceCards, type Resource } from './sheet/resourceCards';
import { drawSideCards } from './sheet/sideCards';
import { drawTraitCards } from './sheet/traitCards';
import { STORAGE_UNAVAILABLE, reportSave, showStatus } from './status';

type Update = (character: V20Character) => V20Character;
type Apply = (update: Update) => V20Character;

const STEPS: Record<Resource, (character: V20Character, delta: number) => V20Character> = {
  blood: (character, delta) => stepBlood(character, delta, bloodPoolMaximum(character).maximum),
  willpower: stepTemporaryWillpower,
};

const sheet = document.querySelector<HTMLElement>('#sheet')!;
const notFound = document.querySelector<HTMLElement>('#sheet-not-found')!;
const unreadable = document.querySelector<HTMLElement>('#sheet-unreadable')!;
type TextInput = HTMLInputElement | HTMLTextAreaElement;

const textInputs = sheet.querySelectorAll<TextInput>('[data-text]');

const traitRatings = sheet.querySelectorAll<RatingControl>('[data-trait]');
const rowNames = sheet.querySelectorAll<HTMLInputElement>('[data-row-name]');
const healthTrack = sheet.querySelector<HealthTrack>('health-track')!;
const rowRatings = sheet.querySelectorAll<RatingControl>('[data-row-rating]');
const stepperButtons = sheet.querySelectorAll<HTMLButtonElement>('[data-step]');

// What is chosen for the dice pool: kept here, never saved, and cleared whenever the mode changes.
const pool = createPool();

const textFieldOf = (input: TextInput): TextRef => input.dataset.text as TextRef;

const traitOf = (rating: RatingControl): TraitRef => rating.dataset.trait as TraitRef;

// Leave a matching input alone so typing does not move the caret.
function showText(input: TextInput, text: string): void {
  if (input.value !== text) input.value = text;
}

function drawTextInputs(character: V20Character): void {
  for (const input of textInputs) {
    showText(input, textValue(character, textFieldOf(input)));
  }
}

function drawTraitRatings(character: V20Character, mode: SheetMode): void {
  for (const rating of traitRatings) {
    const ref = traitOf(rating);
    drawRating(rating, {
      ref,
      label: rating.dataset.label ?? '',
      value: traitValue(character, ref),
      storedMax: rangeOf(ref).max,
      mode,
    });
  }
}

function drawRowNames(character: V20Character): void {
  for (const input of rowNames) {
    showText(input, namedRow(character, input.dataset.rowName as NamedRowRef)?.name ?? '');
  }
}

function drawRowRatings(character: V20Character, mode: SheetMode): void {
  for (const rating of rowRatings) {
    const ref = rating.dataset.rowRating as NamedRowRef;
    const row = namedRow(character, ref);
    if (row === undefined) continue;
    // A write-in rating is announced with the name the player gave it.
    const label = rating.dataset.label!;
    drawRating(rating, {
      ref,
      label: row.name ? `${label}: ${row.name}` : label,
      value: row.rating,
      storedMax: RATING_RANGE.max,
      mode,
    });
  }
}

function render(character: V20Character, mode: SheetMode): void {
  drawIdentity(sheet, character);
  drawTextInputs(character);
  drawTraitRatings(character, mode);
  drawRowNames(character);
  drawRowRatings(character, mode);
  drawTraitCards(sheet, character, mode);
  drawResourceCards(sheet, character);
  drawSideCards(sheet, character);
  drawPoolCard(sheet, character, pool.selection());
}

// The roster opens a new character's sheet with this marker: start editing, and do
// not keep the marker, so a reload is play mode again.
const EDIT_MARKER = '#edit';

function startMode(): Mode {
  const startsEditing = window.location.hash === EDIT_MARKER;
  if (startsEditing) {
    const url = new URL(window.location.href);
    url.hash = '';
    history.replaceState(null, '', url);
  }
  return createMode(sheet, startsEditing ? 'edit' : 'play');
}

/** Wires every control on the sheet to `apply`, the one path an edit takes. */
function bindEditListeners(apply: Apply): void {
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
    let before!: V20Character;
    const after = apply((current) => {
      before = current;
      return cycleHealthBox(current, level);
    });
    announceWound(sheet, before, after);
    // The wound moves the pool's total: say the pool again so its status text matches its card.
    announcePool(sheet, after, pool.selection());
  });

  // A press says the new reading once; a redraw (a new Generation moving the maximum) stays silent.
  for (const button of stepperButtons) {
    button.addEventListener('click', () => {
      if (button.getAttribute('aria-disabled') === 'true') return;
      const resource = button.dataset.resource as Resource;
      const changed = apply((current) => STEPS[resource](current, Number(button.dataset.step)));
      announce(sheet, changed, resource);
    });
  }
}

function showSheet(loaded: V20Character, store: CharacterStore): void {
  let character = loaded;
  const mode = startMode();

  /** The one path every edit takes: update the model, redraw, save. */
  function apply(update: Update): V20Character {
    character = update(character);
    render(character, mode.current());
    reportSave(store.save(character));
    return character;
  }
  bindEditListeners(apply);

  // Another tab changed or deleted this character: what this page holds is stale,
  // and saving it would undo that. Start again from what is stored now.
  window.addEventListener('storage', (event) => {
    if (event.key === null || event.key === keyFor(character.id)) window.location.reload();
  });

  // Choosing a trait redraws and says the pool once it is whole.
  sheet.addEventListener('click', (event) => {
    const row = (event.target as Element).closest('.trait-select')?.closest<HTMLElement>('[data-trait-key]');
    if (row === null || row === undefined) return;
    pool.toggle(row.dataset.traitKey as PoolRow);
    render(character, mode.current());
    announcePool(sheet, character, pool.selection());
  });

  // A mode change forgets the selection, and the pool said for it; the redraw after shows none.
  mode.onChange(() => {
    pool.clear();
    announcePool(sheet, character, pool.selection());
  });
  mode.onChange((next) => render(character, next));
  render(character, mode.current());
  sheet.hidden = false;
}

type PageState =
  | { kind: 'loaded'; character: V20Character; store: CharacterStore }
  | { kind: 'unavailable' }
  | { kind: 'not-found' }
  | { kind: 'unreadable' };

function pageState(): PageState {
  const storage = browserStorage();
  if (storage === undefined) return { kind: 'unavailable' };

  const id = new URLSearchParams(window.location.search).get('id');
  if (id === null) return { kind: 'not-found' };

  const store = createCharacterStore(storage);
  const result = store.load(id);
  switch (result.status) {
    case 'found':
      return { kind: 'loaded', character: result.character, store };
    case 'unreadable':
      return { kind: 'unreadable' };
    case 'not-found':
      return { kind: 'not-found' };
  }
}

// A sheet restored from the back/forward cache still holds the character as it
// was. If that character has since been deleted, the next edit would save it
// back, so start again from what is stored now.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) window.location.reload();
});

const state = pageState();
switch (state.kind) {
  case 'loaded':
    showSheet(state.character, state.store);
    break;
  case 'unavailable':
    showStatus(STORAGE_UNAVAILABLE);
    break;
  case 'not-found':
    notFound.hidden = false;
    break;
  case 'unreadable':
    unreadable.hidden = false;
    break;
}
