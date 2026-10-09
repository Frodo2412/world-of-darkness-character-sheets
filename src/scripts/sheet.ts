import '../components/controls/dot-rating';
import '../components/controls/health-track';
import type { HealthChange, HealthTrack } from '../components/controls/health-track';
import { cycleHealthBox, type V20Character } from '../domain/v20/character';
import { stepBlood, stepTemporaryWillpower, type Resource } from '../domain/v20/resources';
import {
  browserStorage,
  createCharacterStore,
  keyFor,
  type CharacterStore,
} from '../storage/characterStore';
import { drawIdentity } from './sheet/identityCard';
import { createMode, type Mode } from './sheet/mode';
import { createPool } from './sheet/pool';
import { announce, announceWound, drawResourceCards } from './sheet/resourceCards';
import { STORAGE_UNAVAILABLE, reportSave, showStatus } from './status';
import type { Apply } from './tabs/context';
import { SHEET_KEY } from './tabs/descriptor';
import { discoverTabs } from './tabs/discover';
import { bindFields, drawFields } from './tabs/fields';
import { createShell } from './tabs/shell';

const STEPS: Record<Resource, (character: V20Character, delta: number) => V20Character> = {
  blood: stepBlood,
  willpower: stepTemporaryWillpower,
};

const sheet = document.querySelector<HTMLElement>('#sheet')!;
const notFound = document.querySelector<HTMLElement>('#sheet-not-found')!;
const unreadable = document.querySelector<HTMLElement>('#sheet-unreadable')!;

// The parts of the page that belong to the shell: the same on every tab.
const identity = sheet.querySelector<HTMLElement>('.identity')!;
const resourcesRow = sheet.querySelector<HTMLElement>('.resources-row')!;
const healthTrack = resourcesRow.querySelector<HealthTrack>('health-track')!;
const stepperButtons = resourcesRow.querySelectorAll<HTMLButtonElement>('[data-step]');

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

function bindHealthTrack(apply: Apply): void {
  healthTrack.addEventListener('change', (event) => {
    const { level } = (event as CustomEvent<HealthChange>).detail;
    apply((current) => cycleHealthBox(current, level));
  });
}

// A press says the new reading once; a redraw (a new Generation moving the maximum) stays silent.
function bindSteppers(apply: Apply): void {
  for (const button of stepperButtons) {
    button.addEventListener('click', () => {
      if (button.getAttribute('aria-disabled') === 'true') return;
      const resource = button.dataset.resource as Resource;
      const changed = apply((current) => STEPS[resource](current, Number(button.dataset.step)));
      announce(sheet, changed, resource);
    });
  }
}

async function showSheet(loaded: V20Character, store: CharacterStore): Promise<void> {
  const mode = startMode();
  const { tabs } = discoverTabs();

  const shell = createShell({
    tabs,
    character: loaded,
    mode: mode.current,
    pool: createPool(),
    rootOf: (key) => sheet.querySelector<HTMLElement>(`[data-tab-panel="${key}"]`)!,
    save: (character) => reportSave(store.save(character)),
    view: {
      show(tab) {
        for (const panel of sheet.querySelectorAll<HTMLElement>('[data-tab-panel]')) {
          panel.hidden = panel.dataset.tabPanel !== tab.key;
        }
      },
      showResources: (visible) => void (resourcesRow.hidden = !visible),
      afterRender(character, current) {
        drawIdentity(sheet, character);
        drawFields(identity, character, current);
        drawFields(resourcesRow, character, current);
        drawResourceCards(sheet, character);
      },
      applied: (before, after) => announceWound(sheet, before, after),
    },
  });

  const { apply } = shell;
  bindFields(identity, apply);
  bindFields(resourcesRow, apply);
  bindHealthTrack(apply);
  bindSteppers(apply);

  // Another tab changed or deleted this character: what this page holds is stale,
  // and saving it would undo that. Start again from what is stored now.
  window.addEventListener('storage', (event) => {
    if (event.key === null || event.key === keyFor(loaded.id)) window.location.reload();
  });

  mode.onChange(() => shell.modeChanged());
  await shell.switchTo(SHEET_KEY);
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
    void showSheet(state.character, state.store);
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
