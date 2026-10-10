import type { V20Character } from '../../domain/v20/character';
import type { SheetMode } from '../sheet/mode';
import type { Observer } from '../sheet/observers/index';
import type { Pool } from '../sheet/pool';
import type { MountedTab, TabContext, Update } from './context';
import type { TabDescriptor, TabKey } from './descriptor';
import type { Announce, Stamp } from './services';

/** The page the shell drives. Everything here is drawing; none of the shell's decisions are. */
export interface ShellView {
  /** Reveals the tab's panel and marks its place in the bar. */
  show(tab: TabDescriptor): void;
  /** Moves keyboard focus into the tab's panel, to its heading. */
  focus(tab: TabDescriptor): void;
  /** Says the tab could not be loaded or mounted; choosing it again tries again. */
  loadFailed(tab: TabDescriptor): void;
  /** Takes the tab's panel away when it failed and there is no tab to go back to: a panel nothing drew or bound is not shown. */
  unavailable(tab: TabDescriptor): void;
  /** Shows or hides the live resources row. */
  showResources(visible: boolean): void;
  /** Draws what belongs to the shell itself, after the active tab has drawn. */
  afterRender(character: V20Character, mode: SheetMode, tab: TabDescriptor): void;
  /** Says what an edit did to the shell's own parts, before the active tab hears of it. */
  applied(before: V20Character, after: V20Character): void;
}

export interface ShellOptions {
  /** The visible tabs, the Character sheet first. */
  tabs: readonly TabDescriptor[];
  character: V20Character;
  mode(): SheetMode;
  pool: Pool;
  /** The panel a tab draws in. */
  rootOf(key: TabKey): HTMLElement;
  save(character: V20Character): void;
  /** Records the tab in the address as a new history entry. */
  push(key: TabKey): void;
  /** Puts the address back on `key` after a switch to another tab failed, without a new history entry. */
  restore(key: TabKey): void;
  announce: Announce;
  stamp: Stamp;
  /**
   * Modules that react to the character after every draw, on any tab, and the root they are given:
   * the whole page, since what they fill (the application bar's label) is outside the sheet.
   */
  observers: readonly Observer[];
  pageRoot: HTMLElement;
  view: ShellView;
}

export interface Shell {
  /**
   * Shows the tab and draws it; resolves once it has been drawn. A request made while another tab
   * loads wins. A tab that fails to load is reported through the view and does not reject: the tab
   * shown before it is shown again, and choosing the failed tab again tries again.
   */
  switchTo(key: TabKey): Promise<void>;
  /** A player's choice of tab: as `switchTo`, and also a history entry and focus in the panel. */
  open(key: TabKey): Promise<void>;
  /** The one path every edit takes: update the model, redraw, save. */
  apply(update: Update): V20Character;
  /** The mode changed: forget the pool and redraw. */
  modeChanged(): void;
}

/**
 * The page's controller: it owns the character, the tab shown and the tabs that have been loaded.
 * It draws nothing itself and touches no element, so the contract between the shell and a tab can
 * be tested with tabs that only record what they were asked to do.
 */
export function createShell(options: ShellOptions): Shell {
  const { pool, view } = options;
  const descriptors = new Map(options.tabs.map((tab) => [tab.key, tab]));
  let character = options.character;
  let activeKey: TabKey | undefined;
  /** The last tab that was entered and drawn: where a failed switch goes back to, whatever was requested in between. */
  let shownKey: TabKey | undefined;
  const loading = new Map<TabKey, Promise<MountedTab>>();
  const loaded = new Map<TabKey, MountedTab>();
  /** Tabs mounted but whose enter or drawing threw: still mounted (once), but not shown until a retry draws them. */
  const broken = new Set<TabKey>();
  /** Counts the requests to switch; a request that is no longer the latest does nothing when its tab arrives. */
  let latestSwitch = 0;

  const context = (key: TabKey): TabContext => ({
    root: options.rootOf(key),
    current: () => character,
    apply,
    openTab: open,
    announce: options.announce,
    stamp: options.stamp,
    poolSelection: () => pool.selection(),
    selectPool(selection) {
      pool.select(selection);
      draw();
    },
    togglePool(row) {
      pool.toggle(row);
      draw();
    },
  });

  function load(key: TabKey): Promise<MountedTab> {
    let promise = loading.get(key);
    if (promise === undefined) {
      promise = descriptors
        .get(key)!
        .mount()
        .then(({ mount }) => {
          const tab = mount(context(key));
          loaded.set(key, tab);
          return tab;
        });
      loading.set(key, promise);
      // A failure is not kept, so choosing the tab again loads it again.
      promise.catch(() => void loading.delete(key));
    }
    return promise;
  }

  const active = (): MountedTab | undefined =>
    activeKey === undefined || broken.has(activeKey) ? undefined : loaded.get(activeKey);

  /** Whether the tab is shown, or on its way: a tab that failed to load is neither. */
  const isShown = (key: TabKey): boolean =>
    key === activeKey && !broken.has(key) && (loaded.has(key) || loading.has(key));

  /**
   * Redraws the active tab and then the shell. A tab still loading is drawn when it arrives, and one
   * that failed to load leaves the shell's own parts drawing.
   */
  function draw(): void {
    if (activeKey === undefined) return;
    renderActive();
    drawShell();
  }

  /** The active tab's own drawing. */
  function renderActive(): void {
    active()?.render(character, options.mode());
  }

  /** What belongs to the shell itself, after the tab: its own parts and the page's observers. */
  function drawShell(): void {
    if (activeKey === undefined) return;
    view.afterRender(character, options.mode(), descriptors.get(activeKey)!);
    for (const observer of options.observers) observer.afterRender(character, options.pageRoot);
  }

  function apply(update: Update): V20Character {
    const before = character;
    character = update(before);
    try {
      draw();
    } finally {
      // A tab whose drawing throws must not stop the edit from being stored.
      options.save(character);
    }
    view.applied(before, character);
    active()?.changed?.(before, character);
    return character;
  }

  async function switchTo(key: TabKey): Promise<void> {
    if (isShown(key)) return;
    const thisSwitch = ++latestSwitch;
    active()?.leave?.();
    activeKey = key;
    const tab = descriptors.get(key)!;
    view.show(tab);
    view.showResources(tab.showsResources);
    let mounted: MountedTab;
    try {
      mounted = await load(key);
    } catch {
      if (thisSwitch === latestSwitch) failed(tab);
      return;
    }
    if (thisSwitch !== latestSwitch) return;
    try {
      mounted.enter?.();
      renderActive();
    } catch (error) {
      // Not shown, but still mounted: choosing it again enters and draws it again, without mounting it twice.
      console.error(error);
      broken.add(key);
      try {
        mounted.leave?.();
      } catch {
        // A tab that cannot leave cleanly is already reported as failed.
      }
      failed(tab);
      return;
    }
    broken.delete(key);
    shownKey = key;
    // The shell's own drawing is not the tab's: a throw there is not blamed on a healthy tab.
    drawShell();
  }

  /** The tab could not be loaded: go back to the tab that was last shown if there was one, and say so. */
  function failed(tab: TabDescriptor): void {
    if (shownKey !== undefined && loaded.has(shownKey)) {
      activeKey = shownKey;
      options.restore(shownKey);
      const back = descriptors.get(shownKey)!;
      view.show(back);
      view.showResources(back.showsResources);
      loaded.get(shownKey)!.enter?.();
    } else {
      view.unavailable(tab);
    }
    draw();
    // Last, so that showing the tab again does not take the message down.
    view.loadFailed(tab);
  }

  async function open(key: TabKey): Promise<void> {
    if (isShown(key)) return;
    options.push(key);
    await switchTo(key);
    if (activeKey === key && loaded.has(key) && !broken.has(key)) view.focus(descriptors.get(key)!);
  }

  return {
    switchTo,
    open,
    apply,
    modeChanged() {
      pool.clear();
      draw();
    },
  };
}
