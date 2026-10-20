// Clan choice: a clan that removes nothing applies at once; one that would remove dots only asks,
// beside the select, so browsing the list never loses anything.

import { clanChangeEffects, setClan } from '../../../domain/v20/creation/updates';
import type { Wiring } from '../wiring';
import type { ScreenModule } from './index';

function wireClanChoice(root: HTMLElement, { commit, current }: Wiring): void {
  const select = root.querySelector<HTMLSelectElement>('[data-clan]');
  const panel = root.querySelector<HTMLElement>('[data-clan-change]');
  if (!select || !panel) return;
  const text = panel.querySelector<HTMLElement>('[data-clan-change-text]')!;
  const switchButton = panel.querySelector<HTMLButtonElement>('[data-clan-switch]')!;
  const keepButton = panel.querySelector<HTMLButtonElement>('[data-clan-keep]')!;

  function hidePanel(): void {
    panel!.hidden = true;
    text.replaceChildren();
  }

  select.addEventListener('change', () => {
    const build = current();
    const clan = select.value;
    if (clan === build.clan) {
      hidePanel();
      return;
    }
    const effects = clanChangeEffects(build, clan);
    if (effects.length === 0) {
      hidePanel();
      commit((latest) => setClan(latest, clan), select);
      return;
    }
    const items = effects.map((effect) => {
      const item = document.createElement('li');
      item.textContent = effect;
      return item;
    });
    const list = document.createElement('ul');
    list.append(...items);
    const question = document.createElement('p');
    question.textContent = `Switching to ${clan}:`;
    text.replaceChildren(question, list);
    switchButton.textContent = `Switch to ${clan}`;
    keepButton.textContent = `Keep ${build.clan}`;
    panel.dataset.pendingClan = clan;
    panel.hidden = false;
  });

  switchButton.addEventListener('click', () => {
    const clan = panel.dataset.pendingClan!;
    hidePanel();
    commit((latest) => setClan(latest, clan), select);
    select.focus();
  });

  keepButton.addEventListener('click', () => {
    hidePanel();
    select.value = current().clan;
    select.focus();
  });
}

export default {
  id: 'clan',
  wire(root, wiring) {
    wireClanChoice(root, wiring);
  },
  render(build, root) {
    for (const select of root.querySelectorAll<HTMLSelectElement>('[data-clan]')) {
      const panel = root.querySelector<HTMLElement>('[data-clan-change]');
      if (panel?.hidden !== false && select.value !== build.clan) select.value = build.clan;
      // Once a clan is chosen it can be switched but not cleared.
      select.options[0].disabled = build.clan !== '';
    }
  },
} satisfies ScreenModule;
