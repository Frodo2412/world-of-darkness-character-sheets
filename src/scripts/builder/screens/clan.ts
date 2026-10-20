// The Clan screen. The clans are a radiogroup: the arrow keys move focus and choosing is a press. A clan that
// removes nothing applies at once; one that would remove dots only asks, so browsing never loses anything.
// The cards, the search field and the roving tab stop are updated in place and never rebuilt.

import '../../../styles/builder/clan.css';
import type { V20Build } from '../../../domain/v20/creation/build';
import { ANY_DISCIPLINE, clanDetail, clanListView } from '../../../domain/v20/creation/clanCards';
import { clanChangeEffects, setClan } from '../../../domain/v20/creation/updates';
import { isMacPlatform, shortcutHint, wireSearchShortcut } from '../parts/search';
import type { Wiring } from '../wiring';
import type { ScreenModule } from './index';

/** What the screen remembers apart from the build. */
const state = {
  /** The search as typed. */
  query: '',
  /** The clan a switch is waiting on, or null when no question is open. The panel only shows it. */
  pendingClan: null as string | null,
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
}

/** The question beside the list: what the switch would remove, and the two ways to answer. */
function wireQuestion(root: HTMLElement, { commit, current }: Wiring): void {
  const list = root.querySelector<HTMLElement>('[data-clan-list]')!;
  const search = root.querySelector<HTMLInputElement>('[data-clan-search]')!;
  const panel = root.querySelector<HTMLElement>('[data-clan-change]')!;
  // The status region is always on the page and the question is written into it, so it is announced when it
  // appears; only the buttons are hidden while no question is open.
  const text = panel.querySelector<HTMLElement>('[data-clan-change-text]')!;
  const actions = panel.querySelector<HTMLElement>('[data-clan-change-actions]')!;
  const switchButton = panel.querySelector<HTMLButtonElement>('[data-clan-switch]')!;
  const keepButton = panel.querySelector<HTMLButtonElement>('[data-clan-keep]')!;

  function hidePanel(): void {
    state.pendingClan = null;
    panel.toggleAttribute('data-open', false);
    actions.hidden = true;
    text.replaceChildren();
  }

  /** Puts focus on a clan's card, or on the search when a search has hidden it. */
  function focusCard(clan: string): void {
    const card = cardFor(root, clan);
    (card && !card.hidden ? card : search).focus();
  }

  function choose(clan: string): void {
    const build = current();
    if (clan === build.clan) {
      hidePanel();
      return;
    }
    const effects = clanChangeEffects(build, clan);
    if (effects.length === 0) {
      hidePanel();
      state.stop = clan;
      commit((latest) => setClan(latest, clan), list);
      focusCard(clan);
      return;
    }
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
    keepButton.textContent = `Keep ${build.clan}`;
    state.pendingClan = clan;
    actions.hidden = false;
    panel.toggleAttribute('data-open', true);
    switchButton.focus();
  }

  list.addEventListener('click', (event) => {
    const card = (event.target as Element).closest<HTMLElement>('[data-clan-card]');
    if (card) choose(card.dataset.clanCard!);
  });

  switchButton.addEventListener('click', () => {
    const clan = state.pendingClan!;
    hidePanel();
    state.stop = clan;
    commit((latest) => setClan(latest, clan), list);
    focusCard(clan);
  });

  keepButton.addEventListener('click', () => {
    const pending = state.pendingClan!;
    hidePanel();
    // Back to the chosen clan, or to the one that was pressed when a search has hidden the chosen one.
    const kept = cardFor(root, current().clan);
    focusCard(kept?.hidden === false ? current().clan : pending);
  });
}

/** Where an arrow key, Home or End takes focus among `count` listed clans, wrapping at the ends; undefined for any other key. */
function movedTo(key: string, at: number, count: number): number | undefined {
  switch (key) {
    case 'ArrowDown':
    case 'ArrowRight':
      return (at + 1) % count;
    case 'ArrowUp':
    case 'ArrowLeft':
      return (at - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return undefined;
  }
}

/** Arrow keys, Home and End move focus through the listed clans; choosing is a separate press. */
function wireArrowKeys(root: HTMLElement, { current }: Wiring): void {
  const list = root.querySelector<HTMLElement>('[data-clan-list]')!;
  list.addEventListener('keydown', (event) => {
    const listed = listedCards(root);
    const at = listed.findIndex((card) => card === document.activeElement);
    const target = at === -1 ? undefined : movedTo(event.key, at, listed.length);
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
  // The shortcut goes to this field only while the Clan screen is the one shown.
  wireSearchShortcut(document, () => (search.closest<HTMLElement>('[data-step]')!.hidden ? undefined : search), mac);
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
