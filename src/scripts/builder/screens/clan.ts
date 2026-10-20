// The Clan screen. The clans are a radiogroup: the arrow keys move focus and choosing is a press. A clan that
// removes nothing applies at once; one that would remove dots only asks, so browsing never loses anything.
// The cards, the search field and the roving tab stop are updated in place and never rebuilt.

import '../../../styles/builder/clan.css';
import type { V20Build } from '../../../domain/v20/creation/build';
import { ANY_DISCIPLINE, clanDetail, clanListView, keepLabel } from '../../../domain/v20/creation/clanCards';
import { clanChangeEffects, setClan } from '../../../domain/v20/creation/updates';
import { movedTo } from '../parts/listKeys';
import { isMacPlatform, shortcutHint, wireSearchShortcut } from '../parts/search';
import type { Wiring } from '../wiring';
import type { ScreenModule } from './index';

/** What the screen remembers apart from the build. */
const state = {
  /** The search as typed. */
  query: '',
  /** The clan a switch is waiting on, or null when no question is open. The panel only shows it. */
  pendingClan: null as string | null,
  /** What the open question says now, so a redraw that changes nothing writes nothing and announces nothing. */
  asked: '',
  /** The clan card that holds the tab stop; the chosen clan, or the first listed, when it is not listed. */
  stop: '',
};

const cardsOf = (root: HTMLElement): HTMLButtonElement[] => [...root.querySelectorAll<HTMLButtonElement>('[data-clan-card]')];
const listedCards = (root: HTMLElement): HTMLButtonElement[] => cardsOf(root).filter((card) => !card.hidden);
const cardFor = (root: HTMLElement, clan: string): HTMLButtonElement | undefined =>
  cardsOf(root).find((card) => card.dataset.clanCard === clan);

/** Writes only a changed text, so a live region says only what is new. */
function say(element: HTMLElement, text: string): void {
  if (element.textContent !== text) element.textContent = text;
}

/** The detail of the chosen clan, or the prompt to choose one. */
function drawDetail(root: HTMLElement, chosen: string): void {
  const detail = clanDetail(chosen);
  const body = root.querySelector<HTMLElement>('[data-clan-detail-body]')!;
  root.querySelector<HTMLElement>('[data-clan-detail-empty]')!.hidden = detail !== undefined;
  body.hidden = detail === undefined;
  if (detail === undefined) return;
  const part = (name: string) => root.querySelector<HTMLElement>(`[data-clan-detail-${name}]`)!;
  say(part('name'), detail.name);
  say(part('line'), detail.line);
  const names = detail.disciplines === 'any' ? [ANY_DISCIPLINE] : detail.disciplines;
  const list = part('disciplines');
  if (list.textContent !== names.join('')) {
    list.replaceChildren(
      ...names.map((name) => {
        const item = document.createElement('li');
        item.textContent = name;
        return item;
      }),
    );
  }
  say(part('rule'), detail.rule ?? '');
  part('rule').hidden = detail.rule === undefined;
  say(part('note'), detail.note);
}

/** Shows, hides and marks the cards and writes the counts, the results and the detail. */
function draw(build: V20Build, root: HTMLElement): void {
  const view = clanListView(state.query, build.clan);
  const listed = new Set<string>(view.cards.map((card) => card.name));
  const stop = listed.has(state.stop) ? state.stop : listed.has(build.clan) ? build.clan : (view.cards[0]?.name ?? '');
  for (const card of cardsOf(root)) {
    const name = card.dataset.clanCard!;
    card.hidden = !listed.has(name);
    const chosen = name === build.clan;
    card.setAttribute('aria-checked', String(chosen));
    card.querySelector<HTMLElement>('[data-clan-card-state]')!.hidden = !chosen;
    card.tabIndex = name === stop ? 0 : -1;
  }
  say(root.querySelector<HTMLElement>('[data-clan-heading]')!, view.heading);
  say(root.querySelector<HTMLElement>('[data-clan-selected]')!, view.selected);
  say(root.querySelector<HTMLElement>('[data-clan-results]')!, view.results);
  drawDetail(root, build.clan);
  recheckQuestion(root, build);
}

/** Puts focus on a clan's card, or on the search when a search has hidden it. */
function focusCard(root: HTMLElement, clan: string): void {
  const card = cardFor(root, clan);
  (card && !card.hidden ? card : root.querySelector<HTMLElement>('[data-clan-search]')!).focus();
}

/**
 * The question's pieces: the panel, the status region the question is written into, and the two answers.
 * The status region is always on the page and the question is written into it, so it is announced when it
 * appears; only the buttons are hidden while no question is open.
 */
function questionParts(root: HTMLElement) {
  const panel = root.querySelector<HTMLElement>('[data-clan-change]')!;
  return {
    panel,
    text: panel.querySelector<HTMLElement>('[data-clan-change-text]')!,
    actions: panel.querySelector<HTMLElement>('[data-clan-change-actions]')!,
    switchButton: panel.querySelector<HTMLButtonElement>('[data-clan-switch]')!,
    keepButton: panel.querySelector<HTMLButtonElement>('[data-clan-keep]')!,
  };
}

function closeQuestion(root: HTMLElement): void {
  const { panel, text, actions } = questionParts(root);
  state.pendingClan = null;
  state.asked = '';
  panel.toggleAttribute('data-open', false);
  actions.hidden = true;
  text.replaceChildren();
}

/** Writes the question for `clan` and what the switch would remove (`effects`), unless it already says so. */
function askQuestion(root: HTMLElement, build: V20Build, clan: string, effects: string[]): void {
  state.pendingClan = clan;
  const asked = [clan, build.clan, ...effects].join('\n');
  if (asked === state.asked) return;
  state.asked = asked;
  const { panel, text, actions, switchButton, keepButton } = questionParts(root);
  const items = effects.map((effect) => {
    const item = document.createElement('li');
    item.textContent = effect;
    return item;
  });
  const itemList = document.createElement('ul');
  itemList.append(...items);
  const question = document.createElement('p');
  question.textContent = `Switching to ${clan}:`;
  text.replaceChildren(question, itemList);
  switchButton.textContent = `Switch to ${clan}`;
  keepButton.textContent = keepLabel(build.clan);
  actions.hidden = false;
  panel.toggleAttribute('data-open', true);
}

/**
 * An open question is judged again against the build as it is now, which may have changed since it was asked
 * (dots added on another screen): it names what would be removed now, and closes when nothing would be.
 */
function recheckQuestion(root: HTMLElement, build: V20Build): void {
  const clan = state.pendingClan;
  if (clan === null) return;
  const effects = clanChangeEffects(build, clan);
  if (effects.length > 0) {
    askQuestion(root, build, clan, effects);
    return;
  }
  const { panel } = questionParts(root);
  const heldFocus = panel.contains(document.activeElement);
  closeQuestion(root);
  if (heldFocus) focusCard(root, build.clan || clan);
}

/** The question beside the list: what the switch would remove, and the two ways to answer. */
function wireQuestion(root: HTMLElement, { commit, current }: Wiring): void {
  const list = root.querySelector<HTMLElement>('[data-clan-list]')!;
  const { switchButton, keepButton } = questionParts(root);

  function choose(clan: string): void {
    const build = current();
    if (clan === build.clan) {
      closeQuestion(root);
      return;
    }
    const effects = clanChangeEffects(build, clan);
    if (effects.length === 0) {
      closeQuestion(root);
      state.stop = clan;
      commit((latest) => setClan(latest, clan), list);
      focusCard(root, clan);
      return;
    }
    askQuestion(root, build, clan, effects);
    switchButton.focus();
  }

  list.addEventListener('click', (event) => {
    const card = (event.target as Element).closest<HTMLElement>('[data-clan-card]');
    if (card) choose(card.dataset.clanCard!);
  });

  switchButton.addEventListener('click', () => {
    const clan = state.pendingClan!;
    closeQuestion(root);
    state.stop = clan;
    commit((latest) => setClan(latest, clan), list);
    focusCard(root, clan);
  });

  keepButton.addEventListener('click', () => {
    const pending = state.pendingClan!;
    closeQuestion(root);
    // Back to the chosen clan, or to the one that was pressed when a search has hidden the chosen one.
    const kept = cardFor(root, current().clan);
    focusCard(root, kept?.hidden === false ? current().clan : pending);
  });
}

/** Arrow keys, Home and End move focus through the listed clans; choosing is a separate press. */
function wireArrowKeys(root: HTMLElement, { current }: Wiring): void {
  const list = root.querySelector<HTMLElement>('[data-clan-list]')!;
  list.addEventListener('keydown', (event) => {
    const listed = listedCards(root);
    const at = listed.findIndex((card) => card === document.activeElement);
    const target = at === -1 ? undefined : movedTo(event, at, listed.length);
    if (target === undefined) return;
    event.preventDefault();
    listed[target].focus();
  });
  // Whichever card has focus holds the tab stop, so Tab returns to where the player left off.
  list.addEventListener('focusin', (event) => {
    const card = (event.target as Element).closest<HTMLElement>('[data-clan-card]');
    if (!card) return;
    state.stop = card.dataset.clanCard!;
    draw(current(), root);
  });
}

function wireSearch(root: HTMLElement, { current }: Wiring): void {
  const search = root.querySelector<HTMLInputElement>('[data-clan-search]')!;
  const hint = root.querySelector<HTMLElement>('[data-clan-search-hint]')!;
  const mac = isMacPlatform();
  hint.textContent = shortcutHint(mac);
  hint.hidden = false;
  search.setAttribute('aria-keyshortcuts', mac ? 'Meta+K' : 'Control+K');
  state.query = search.value;
  search.addEventListener('input', () => {
    state.query = search.value;
    draw(current(), root);
  });
  // The shortcut goes to this field only while the Clan screen is the one shown: neither it nor the builder
  // around it is hidden.
  wireSearchShortcut(document, () => (search.closest('[hidden]') ? undefined : search), mac);
}

export default {
  id: 'clan',
  wire(root, wiring) {
    wireQuestion(root, wiring);
    wireArrowKeys(root, wiring);
    wireSearch(root, wiring);
  },
  render(build, root) {
    draw(build, root);
  },
} satisfies ScreenModule;
