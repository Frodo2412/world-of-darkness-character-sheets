// The Nature & Demeanor screen. A press on an Archetype assigns it to the active role, which a radio switch
// sets; the player's own Archetype is written into the same role. The buttons, the search field and the
// switch are updated in place and never rebuilt, so focus stays where it is.

import '../../../styles/builder/natureDemeanor.css';
import {
  archetypeListView,
  assignedNotice,
  roleCards,
  type ArchetypeRole,
} from '../../../domain/v20/creation/archetypes';
import type { V20Build } from '../../../domain/v20/creation/build';
import { setConceptText } from '../../../domain/v20/creation/updates';
import { isMacPlatform, shortcutHint, wireSearchShortcut } from '../parts/search';
import type { Wiring } from '../wiring';
import type { ScreenModule } from './index';

/** What the screen remembers apart from the build. */
const state = {
  /** The role a press assigns to. */
  role: 'nature' as ArchetypeRole,
  /** The search as typed. */
  query: '',
  /** The last assignment made by a press, said until the build no longer holds it. */
  assigned: null as { name: string; role: ArchetypeRole } | null,
};

/** Writes only a changed text, so a live region says only what is new. */
function say(element: HTMLElement, text: string): void {
  if (element.textContent !== text) element.textContent = text;
}

const part = <T extends HTMLElement>(root: HTMLElement, name: string): T => root.querySelector<T>(`[data-nd-${name}]`)!;

/** The assignment notice, while the build still holds what it says. */
function assignedText(build: V20Build): string {
  const { assigned } = state;
  if (assigned === null || build.concept[assigned.role].trim() !== assigned.name) return '';
  return assignedNotice(assigned.name, assigned.role);
}

/** Writes the cards, the switch, the own-name field, the buttons and the counts from the build and the screen's state. */
function draw(build: V20Build, root: HTMLElement): void {
  for (const card of roleCards(build.concept)) {
    say(root.querySelector<HTMLElement>(`[data-nd-card="${card.role}"] [data-nd-value]`)!, card.value);
  }
  for (const radio of root.querySelectorAll<HTMLInputElement>('[data-nd-role]')) {
    const checked = radio.value === state.role;
    if (radio.checked !== checked) radio.checked = checked;
  }
  // The field holds the active role's text; a matching field is left alone so typing does not move the caret.
  const own = part<HTMLInputElement>(root, 'own');
  const text = build.concept[state.role];
  if (own.value !== text) own.value = text;
  say(part(root, 'assigned'), assignedText(build));

  const view = archetypeListView(state.query, build.concept, state.role);
  const entries = new Map(view.entries.map((entry) => [entry.name, entry]));
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-archetype]')) {
    const entry = entries.get(button.dataset.archetype!);
    button.hidden = entry === undefined;
    button.setAttribute('aria-pressed', String(entry?.pressed ?? false));
    say(button.querySelector<HTMLElement>('[data-archetype-marks]')!, entry?.markText ?? '');
    say(button.querySelector<HTMLElement>('[data-archetype-assigned]')!, entry?.assigned ?? '');
    button.querySelector<HTMLElement>('[data-archetype-state]')!.hidden = !entry?.pressed;
  }
  say(part(root, 'heading'), view.heading);
  say(part(root, 'results'), view.results);
}

function wireAssigning(root: HTMLElement, { commit, current }: Wiring): void {
  const list = part(root, 'list');
  list.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLElement>('[data-archetype]');
    if (!button) return;
    const name = button.dataset.archetype!;
    const role = state.role;
    // Choosing a name sets it for the role; choosing it again leaves it set.
    state.assigned = { name, role };
    commit((build) => setConceptText(build, role, name), button);
  });

  const own = part<HTMLInputElement>(root, 'own');
  own.addEventListener('input', () => {
    const role = state.role;
    commit((build) => setConceptText(build, role, own.value), own);
  });

  for (const radio of root.querySelectorAll<HTMLInputElement>('[data-nd-role]')) {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      state.role = radio.value as ArchetypeRole;
      draw(current(), root);
    });
  }
}

function wireSearch(root: HTMLElement, { current }: Wiring): void {
  const search = part<HTMLInputElement>(root, 'search');
  const hint = part(root, 'search-hint');
  const mac = isMacPlatform();
  hint.textContent = shortcutHint(mac);
  hint.hidden = false;
  search.setAttribute('aria-keyshortcuts', mac ? 'Meta+K' : 'Control+K');
  state.query = search.value;
  search.addEventListener('input', () => {
    state.query = search.value;
    draw(current(), root);
  });
  // The shortcut goes to this field only while this screen is the one shown: neither it nor the builder
  // around it is hidden.
  wireSearchShortcut(document, () => (search.closest('[hidden]') ? undefined : search), mac);
}

export default {
  id: 'natureDemeanor',
  wire(root, wiring) {
    wireAssigning(root, wiring);
    wireSearch(root, wiring);
  },
  render(build, root) {
    draw(build, root);
  },
} satisfies ScreenModule;
