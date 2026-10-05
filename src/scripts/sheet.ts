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
import { RATING_RANGE, rangeOf, type NamedRowRef, type TextRef, type TraitRef } from '../domain/v20/traits';
import {
  browserStorage,
  createCharacterStore,
  keyFor,
  type CharacterStore,
} from '../storage/characterStore';
import { drawIdentity } from './sheet/identityCard';
import { createMode, type SheetMode } from './sheet/mode';
import { STORAGE_UNAVAILABLE, clearStatus, showStatus } from './status';

type Update = (character: V20Character) => V20Character;

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

function setAttr(element: Element, name: string, value: string): void {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

// Until the live resources are rebuilt, temporary Willpower and Blood Pool stay
// editable in play mode.
const LIVE_IN_PLAY: readonly string[] = ['willpower.temporary', 'bloodPool.current'];

// An attribute or ability drawn read-only has room for five dots when its rating
// fits in five, else all ten.
const hasPlayScale = (ref: string): boolean => /^(attributes|abilities|customAbilities)\./.test(ref);

interface RatingView {
  ref: string;
  /** What the rating is called: the slider's name, and the start of a read-only rating's. */
  label: string;
  value: number;
  storedMax: number;
  mode: SheetMode;
}

/** Draws a rating for the mode: a slider to edit, an image with a text alternative to play. */
function drawRating(rating: RatingControl, { ref, label, value, storedMax, mode }: RatingView): void {
  if (LIVE_IN_PLAY.includes(ref)) {
    rating.value = value;
    return;
  }
  const readonly = mode === 'play';
  setAttr(rating, 'max', String(readonly && hasPlayScale(ref) && value <= 5 ? 5 : storedMax));
  setAttr(rating, 'name', label);
  rating.value = value;
  rating.toggleAttribute('readonly', readonly);
  if (!readonly) setAttr(rating, 'aria-label', label);
}

function render(character: V20Character, mode: SheetMode): void {
  drawIdentity(sheet, character);
  for (const input of textInputs) {
    showText(input, textValue(character, textFieldOf(input)));
  }
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
  healthTrack.damage = character.health;
  for (const input of rowNames) {
    showText(input, namedRow(character, input.dataset.rowName as NamedRowRef)?.name ?? '');
  }
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

// The roster opens a new character's sheet with this marker: start editing, and do
// not keep the marker, so a reload is play mode again.
const EDIT_MARKER = '#edit';

function showSheet(loaded: V20Character, store: CharacterStore): void {
  let character = loaded;
  const startsEditing = window.location.hash === EDIT_MARKER;
  if (startsEditing) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  const mode = createMode(sheet, startsEditing ? 'edit' : 'play');

  // Only the identity and the live health track are read in play mode: every other
  // text field is something to edit.
  for (const input of [...textInputs, ...rowNames]) {
    (input.closest('label') ?? input).dataset.sheetModeOnly = 'edit';
  }

  /** The one path every edit takes: update the model, redraw, save. */
  function apply(update: Update): void {
    character = update(character);
    render(character, mode.current());
    if (store.save(character).status === 'failed') {
      showStatus('Changes not saved. This browser refused to store your latest changes.');
    } else {
      clearStatus();
    }
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

  // Another tab changed or deleted this character: what this page holds is stale,
  // and saving it would undo that. Start again from what is stored now.
  window.addEventListener('storage', (event) => {
    if (event.key === null || event.key === keyFor(character.id)) window.location.reload();
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
