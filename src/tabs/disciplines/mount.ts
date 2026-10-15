import { disciplineView, type DisciplineView, type PowerView } from '../../domain/v20/disciplineView';
import type { PoolSelection } from '../../domain/v20/resources';
import { hrefFor } from '../../scripts/tabs/address';
import { SHEET_KEY } from '../../scripts/tabs/descriptor';
import { matchesText, wireSearch } from '../../scripts/dossier/search';
import { setPressed, setSegmentLabel, wireSegmentedPress } from '../../scripts/dossier/segmented';
import { focusSelectedPool } from '../../scripts/dossier/poolFocus';
import type { MountedTab, TabContext } from '../../scripts/tabs/context';
import { drawDetailHead, drawList } from './drawList';
import { drawPowers, powerKey } from './drawPower';
import { filterDisciplines, selectedDiscipline } from './filter';

type Shown = 'owned' | 'all';

/** The Disciplines tab: the character's Disciplines and the book's powers, read-only in both modes. */
export function mount(ctx: TabContext): MountedTab {
  const { root } = ctx;
  const find = <T extends HTMLElement>(selector: string): T => root.querySelector<T>(selector)!;
  const list = find('[data-discipline-list]');
  const detail = find('[data-discipline-detail]');
  const split = find('[data-split]');
  const none = find('[data-none]');
  const noMatch = find('[data-no-match]');
  const segmented = find('.dossier-segmented');
  const powerList = find('[data-power-list]');

  const state = { shown: 'owned' as Shown, query: '', chosen: undefined as string | undefined };
  /** The powers the player has opened, by key: kept across redraws, forgotten with the page. */
  const open = new Set<string>();
  let drawn = '';
  /** What is on screen now, for the handlers. */
  let views: DisciplineView[] = [];

  const search = wireSearch(find('[data-search]'), (query) => {
    state.query = query;
    redraw();
  });
  wireSegmentedPress(segmented, (value) => {
    state.shown = value as Shown;
    redraw();
  });

  const sheetLink = find<HTMLAnchorElement>('[data-open-sheet]');
  sheetLink.href = hrefFor(new URL(window.location.href), SHEET_KEY);
  sheetLink.addEventListener('click', (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    void ctx.openTab(SHEET_KEY);
  });
  find('[data-show-all]').addEventListener('click', () => {
    state.shown = 'all';
    setPressed(segmented, 'all');
    redraw();
    list.querySelector<HTMLElement>('button')?.focus();
  });

  list.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-value]');
    if (button === null) return;
    state.chosen = button.dataset.value;
    redraw();
  });

  // `toggle` does not bubble, so it is heard on the way down.
  powerList.addEventListener(
    'toggle',
    (event) => {
      const details = event.target as HTMLDetailsElement;
      const key = details.dataset.power;
      if (key === undefined) return;
      if (details.open) open.add(key);
      else open.delete(key);
    },
    true,
  );

  const powerOf = (key: string): PowerView | undefined => {
    for (const view of views) for (const power of view.powers) if (powerKey(view.name, power) === key) return power;
    return undefined;
  };

  powerList.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-build-pool]');
    if (button === null) return;
    const selection = powerOf(button.dataset.buildPool!)?.selection;
    if (selection !== undefined) void buildPool(selection, powerOf(button.dataset.buildPool!)!.rollLabel!);
  });

  async function buildPool(selection: PoolSelection, words: string): Promise<void> {
    ctx.selectPool(selection);
    await ctx.openTab(SHEET_KEY);
    focusSelectedPool();
    ctx.announce(`Pool set to ${words}`);
  }

  function redraw(): void {
    const all = disciplineView(ctx.current());
    const base = state.shown === 'owned' ? all.owned : all.all;
    const filtered = filterDisciplines(base, state.query);
    const shown = selectedDiscipline(filtered, state.chosen);
    views = filtered;

    setSegmentLabel(segmented, 'owned', `Owned · ${all.owned.length}`);
    search.say(state.query.trim() === '' ? '' : matchesText(filtered.length));

    const nothingOwned = state.shown === 'owned' && all.owned.length === 0 && state.query.trim() === '';
    none.hidden = !nothingOwned;
    noMatch.hidden = nothingOwned || filtered.length > 0;
    split.hidden = nothingOwned || filtered.length === 0;

    const signature = JSON.stringify([state.shown, shown?.name, filtered]);
    if (signature === drawn || shown === undefined) return;
    drawn = signature;
    drawList(list, filtered, shown.name);
    drawDetailHead(detail, shown);
    drawPowers(powerList, shown, (key) => open.has(key));
  }

  return {
    render() {
      redraw();
    },
  };
}
