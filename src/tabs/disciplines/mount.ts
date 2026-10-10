import { disciplineView, type DisciplineScope, type DisciplineView, type PowerView } from '../../domain/v20/disciplineView';
import { wireSegmented } from '../../scripts/dossier/segmented';
import { SHEET_KEY } from '../../scripts/tabs/descriptor';
import { hrefFor } from '../../scripts/tabs/address';
import type { MountedTab, TabContext } from '../../scripts/tabs/context';
import { isPlainClick } from '../../scripts/tabs/tabBar';
import { drawDetail, drawList, drawScope, type Parts, type Templates } from './drawList';
import { drawSearch, narrowDisciplines, type SearchParts } from './drawSearch';

/** The Selected pool card's heading, on the Character sheet tab: where focus goes once a pool has been built. */
const SELECTED_POOL_HEADING = 'pool-heading';

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
    noMatch: one(root, '[data-state="no-match"]'),
  };
  const search: SearchParts = {
    input: one(root, '[data-search-input]'),
    clear: one(root, '[data-search-clear]'),
    count: one(root, '[data-search-count]'),
  };
  const templates: Templates = {
    item: one(root, '[data-template="item"]'),
    power: one(root, '[data-template="power"]'),
  };
  let selected: string | undefined;
  let scope: DisciplineScope = 'owned';
  /** The Disciplines as last drawn, for a press on a power to find its power in. */
  let drawn: readonly DisciplineView[] = [];

  // The link to where ratings are edited: a real address, so it opens in a new window too.
  const sheetLink = one<HTMLAnchorElement>(root, '[data-open-sheet]');
  sheetLink.href = hrefFor(new URL(window.location.href), SHEET_KEY);
  sheetLink.addEventListener('click', (event) => {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    void ctx.openTab(SHEET_KEY);
  });

  function draw(character = ctx.current()): void {
    const { disciplines: listed, ownedCount } = disciplineView(character, scope);
    const disciplines = narrowDisciplines(listed, search.input.value);
    // The Discipline chosen stays chosen while it is listed; otherwise the first one is.
    if (!disciplines.some((discipline) => discipline.key === selected)) selected = disciplines[0]?.key;
    drawScope(parts, scope, ownedCount);
    parts.none.hidden = listed.length > 0;
    parts.noMatch.hidden = listed.length === 0 || disciplines.length > 0;
    drawSearch(search, disciplines.length);
    drawn = disciplines;
    drawList(parts, templates, disciplines, selected);
    drawDetail(parts, templates, disciplines.find((discipline) => discipline.key === selected));
  }

  function chooseScope(next: DisciplineScope): void {
    scope = next;
    draw();
  }

  /** The power a row of the powers list is for: its key is the Discipline's, a colon and the power's level. */
  function powerOf(row: HTMLElement): PowerView | undefined {
    const key = row.dataset.key!;
    const colon = key.lastIndexOf(':');
    const level = Number(key.slice(colon + 1));
    return drawn.find((discipline) => discipline.key === key.slice(0, colon))?.powers.find((power) => power.level === level);
  }

  // Build pool: the power's attribute and ability become the Selected pool, and the player is taken to it.
  parts.powers.addEventListener('click', async (event) => {
    const button = (event.target as Element).closest('[data-field="build"]');
    const power = button === null ? undefined : powerOf(button.closest<HTMLElement>('[data-key]')!);
    if (power?.rule.roll === undefined) return;
    const [attribute, ability] = power.rule.roll;
    ctx.selectPool({ attribute: `attributes.${attribute}`, ability: `abilities.${ability}` });
    await ctx.openTab(SHEET_KEY);
    const heading = root.ownerDocument.getElementById(SELECTED_POOL_HEADING);
    if (heading !== null) {
      heading.tabIndex = -1;
      heading.focus();
    }
    ctx.announce(`Pool set to ${power.rolls}`);
  });

  parts.list.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('.dossier-item-button');
    if (button === null) return;
    selected = button.dataset.value;
    draw();
  });

  parts.scope.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (button !== null) chooseScope(button.dataset.value as DisciplineScope);
  });
  wireSegmented(parts.scope);

  // The empty state's button does what "All disciplines" does, and focus goes where the button's job now is.
  one(root, '[data-show-all]').addEventListener('click', () => {
    chooseScope('all');
    parts.scope.querySelector<HTMLButtonElement>('[data-value="all"]')!.focus();
  });

  search.input.addEventListener('input', () => draw());
  search.clear.addEventListener('click', () => {
    search.input.value = '';
    search.input.focus();
    draw();
  });

  return {
    render: (character) => draw(character),
  };
}
