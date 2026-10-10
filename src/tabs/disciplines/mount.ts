import { disciplineView } from '../../domain/v20/disciplineView';
import { SHEET_KEY } from '../../scripts/tabs/descriptor';
import { hrefFor } from '../../scripts/tabs/address';
import type { MountedTab, TabContext } from '../../scripts/tabs/context';
import { isPlainClick } from '../../scripts/tabs/tabBar';
import { drawDetail, drawList, drawScope, type Parts, type Templates } from './drawList';

const one = <T extends Element>(root: ParentNode, selector: string): T => root.querySelector<T>(selector)!;

/** The Disciplines tab: what the character's Disciplines unlock, read-only; ratings are edited on the Character sheet. */
export function mount(ctx: TabContext): MountedTab {
  const { root } = ctx;
  const parts: Parts = {
    scope: one(root, '[data-segmented]'),
    list: one(root, '[data-disciplines-list]'),
    detail: one(root, '[data-disciplines-detail]'),
    powers: one(root, '[data-disciplines-powers]'),
    none: one(root, '[data-state="none"]'),
  };
  const templates: Templates = {
    item: one(root, '[data-template="item"]'),
    power: one(root, '[data-template="power"]'),
  };
  let selected: string | undefined;

  // The link to where ratings are edited: a real address, so it opens in a new window too.
  const sheetLink = one<HTMLAnchorElement>(root, '[data-open-sheet]');
  sheetLink.href = hrefFor(new URL(window.location.href), SHEET_KEY);
  sheetLink.addEventListener('click', (event) => {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    void ctx.openTab(SHEET_KEY);
  });

  function draw(character = ctx.current()): void {
    const { disciplines, ownedCount } = disciplineView(character, 'owned');
    // The Discipline chosen stays chosen while it is listed; otherwise the first one is.
    if (!disciplines.some((discipline) => discipline.key === selected)) selected = disciplines[0]?.key;
    drawScope(parts, 'owned', ownedCount);
    parts.none.hidden = disciplines.length > 0;
    drawList(parts, templates, disciplines, selected);
    drawDetail(parts, templates, disciplines.find((discipline) => discipline.key === selected));
  }

  parts.list.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('.dossier-item-button');
    if (button === null) return;
    selected = button.dataset.value;
    draw();
  });

  return {
    render: (character) => draw(character),
  };
}
