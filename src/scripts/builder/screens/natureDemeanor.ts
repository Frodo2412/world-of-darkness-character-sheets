// The Nature & Demeanor screen. A press on an Archetype assigns it to the active role, which a radio switch
// sets, and a press on the Archetype the role already holds clears the role; the player's own Archetype is
// written into the same role. The buttons, the search field and the switch are updated in place and never
// rebuilt, so focus stays where it is.

import '../../../styles/builder/natureDemeanor.css';
import {
  archetypeListView,
  noticeText,
  ownArchetypeLabel,
  pressOutcome,
  roleCards,
  settleNotice,
  type ArchetypeNotice,
  type ArchetypeRole,
} from '../../../domain/v20/creation/archetypes';
import type { V20Build } from '../../../domain/v20/creation/build';
import { setConceptText } from '../../../domain/v20/creation/updates';
import { isMacPlatform, wireSearchHint, wireSearchShortcut } from '../parts/search';
import { createSettledStatus } from '../parts/settledStatus';
import type { Wiring } from '../wiring';
import type { ScreenModule } from './index';

/** What the screen remembers apart from the build. */
const state = {
  /** The role a press assigns to. */
  role: 'nature' as ArchetypeRole,
  /** The search as typed. */
  query: '',
  /** What the last press did, said until the build is no longer as the press left it. */
  notice: null as ArchetypeNotice | null,
  /** Says the result count once the player has paused; set when the screen is wired. */
  sayResults: (_text: string): void => {},
};

/** Writes only a changed text, so a live region says only what is new. */
function say(element: HTMLElement, text: string): void {
  if (element.textContent !== text) element.textContent = text;
}

const part = <T extends HTMLElement>(root: HTMLElement, name: string): T => root.querySelector<T>(`[data-nd-${name}]`)!;

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
  say(part(root, 'own-label'), ownArchetypeLabel(state.role));
  // Once the build stops being as the press left it the notice is gone for good, even if the text matches again.
  state.notice = settleNotice(state.notice, build.concept);
  say(part(root, 'assigned'), noticeText(state.notice));

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
  state.sayResults(view.results);
}

function wireAssigning(root: HTMLElement, { commit, current }: Wiring): void {
  const list = part(root, 'list');
  list.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLElement>('[data-archetype]');
    if (!button) return;
    const name = button.dataset.archetype!;
    const role = state.role;
    // Choosing a name sets it for the role; choosing the name the role holds clears the role.
    const { text, notice } = pressOutcome(current().concept, role, name);
    state.notice = notice;
    commit((build) => setConceptText(build, role, text), button);
  });

  const own = part<HTMLInputElement>(root, 'own');
  own.addEventListener('input', () => {
    const role = state.role;
    // Typing is not a press: what the press said is no longer news.
    state.notice = null;
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
  const mac = isMacPlatform();
  wireSearchHint(search, part(root, 'search-hint'), mac);
  state.sayResults = createSettledStatus(part(root, 'results'));
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
