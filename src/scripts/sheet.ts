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
import { observers } from './sheet/observers/index';
import { createPool } from './sheet/pool';
import { announce, announceWound, drawResourceCards } from './sheet/resourceCards';
import { STORAGE_UNAVAILABLE, clearStatusIf, reportSave, showStatus, showStatusIfClear } from './status';
import { hrefFor, titleFor } from './tabs/address';
import type { Apply } from './tabs/context';
import { discoverTabs } from './tabs/discover';
import { bindFields, drawFields } from './tabs/fields';
import { createTabHistory } from './tabs/history';
import { focusPanel, hidePanel, showPanel } from './tabs/panels';
import { createAnnouncer, realStamp } from './tabs/services';
import { createShell } from './tabs/shell';
import { createTabBar, type TabBar } from './tabs/tabBar';

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

// The page's one polite live region: the mode change and the tabs both speak through it.
const announceToPage = createAnnouncer(document.querySelector<HTMLElement>('#mode-announcement')!);

function startMode(): Mode {
  const startsEditing = window.location.hash === EDIT_MARKER;
  if (startsEditing) {
    const url = new URL(window.location.href);
    url.hash = '';
    history.replaceState(null, '', url);
  }
  return createMode(sheet, startsEditing ? 'edit' : 'play', announceToPage);
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

const TAB_FAILED = 'This tab could not be shown. Choose it again, or reload the page, to try again.';

const PAGE_FAILED = 'This page could not be set up. Reload the page to try again.';

// The text of the tab-failure message last shown, so showing a tab takes down that message and
// only that one: a refused save's message that replaced it stays.
let tabFailureText: string | undefined;

function reportTabFailure(text: string): void {
  tabFailureText = text;
  showStatus(text);
}

/** A switch that fails must not leave the page silent: say so, and leave the rest of the sheet working. */
function surviving(switching: Promise<void>): void {
  switching.catch(() => reportTabFailure(TAB_FAILED));
}

async function showSheet(loaded: V20Character, store: CharacterStore): Promise<void> {
  const mode = startMode();
  const { tabs, showBar } = discoverTabs();
  const history = createTabHistory(
    window,
    tabs.map((tab) => tab.key),
  );
  // The bar is drawn only when there is more than one tab; it is wired once the shell exists.
  let bar: TabBar | undefined;

  const shell = createShell({
    tabs,
    character: loaded,
    mode: mode.current,
    pool: createPool(),
    rootOf: (key) => sheet.querySelector<HTMLElement>(`[data-tab-panel="${key}"]`)!,
    save(character) {
      reportSave(store.save(character));
      // A refused save may have replaced the tab-failure message; once it is gone that message is still true.
      if (tabFailureText !== undefined) showStatusIfClear(tabFailureText);
    },
    push: history.push,
    announce: announceToPage,
    stamp: realStamp,
    observers,
    restore: history.replace,
    // The whole page: an observer's target, the application bar's label, is outside #sheet.
    pageRoot: document.body,
    view: {
      show(tab) {
        if (tabFailureText !== undefined) {
          clearStatusIf(tabFailureText);
          tabFailureText = undefined;
        }
        showPanel(sheet, tab.key);
        bar?.select(tab.key);
      },
      focus: (tab) => focusPanel(sheet, tab.key),
      loadFailed: (tab) =>
        reportTabFailure(
          showBar
            ? `The ${tab.label} tab could not be loaded. Choose it again to try again.`
            : `The ${tab.label} tab could not be loaded. Reload the page to try again.`,
        ),
      unavailable: (tab) => hidePanel(sheet, tab.key),
      showResources: (visible) => void (resourcesRow.hidden = !visible),
      afterRender(character, current, tab) {
        drawIdentity(sheet, character);
        drawFields(identity, character, current);
        drawFields(resourcesRow, character, current);
        drawResourceCards(sheet, character);
        // With one tab the page is as it always was, title included.
        if (showBar) document.title = titleFor(tab.label, character);
      },
      applied: (before, after) => announceWound(sheet, before, after),
    },
  });

  const barElement = sheet.querySelector<HTMLElement>('[data-tab-bar]');
  if (barElement !== null) {
    bar = createTabBar(barElement, {
      onSelect: (key) => surviving(shell.open(key)),
      hrefFor: (key) => hrefFor(new URL(window.location.href), key),
    });
  }
  history.onPop((key) => surviving(shell.switchTo(key)));

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
  try {
    await shell.switchTo(history.current());
  } catch {
    reportTabFailure(TAB_FAILED);
  } finally {
    // Whatever happened, the player gets the sheet back: the shell's own parts work without a tab.
    sheet.hidden = false;
  }
  // Measured only now that the page is drawn: a tab far along the bar is brought into view.
  bar?.select(history.current());
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
    // Setup that throws before the first tab is shown must not leave a blank page.
    showSheet(state.character, state.store).catch(() => {
      sheet.hidden = false;
      showStatus(PAGE_FAILED);
    });
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
