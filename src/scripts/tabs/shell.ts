import type { V20Character } from '../../domain/v20/character';
import type { SheetMode } from '../sheet/mode';
import type { Pool } from '../sheet/pool';
import type { MountedTab, TabContext, Update } from './context';
import type { TabDescriptor, TabKey } from './descriptor';

/** The page the shell drives. Everything here is drawing; none of the shell's decisions are. */
export interface ShellView {
  /** Reveals the tab's panel and marks its place in the bar. */
  show(tab: TabDescriptor): void;
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
  view: ShellView;
}

export interface Shell {
  /** Shows the tab and draws it; resolves once it has been drawn. A request made while another tab loads wins. */
  switchTo(key: TabKey): Promise<void>;
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
  const loading = new Map<TabKey, Promise<MountedTab>>();
  const loaded = new Map<TabKey, MountedTab>();

  const context = (key: TabKey): TabContext => ({
    root: options.rootOf(key),
    current: () => character,
    apply,
    poolSelection: () => pool.selection(),
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
    }
    return promise;
  }

  const active = (): MountedTab | undefined => (activeKey === undefined ? undefined : loaded.get(activeKey));

  /** Redraws the active tab and then the shell. A tab still loading is drawn when it arrives. */
  function draw(): void {
    const tab = active();
    if (tab === undefined) return;
    const mode = options.mode();
    tab.render(character, mode);
    view.afterRender(character, mode, descriptors.get(activeKey!)!);
  }

  function apply(update: Update): V20Character {
    const before = character;
    character = update(before);
    draw();
    options.save(character);
    view.applied(before, character);
    active()?.changed?.(before, character);
    return character;
  }

  async function switchTo(key: TabKey): Promise<void> {
    if (key === activeKey) return;
    active()?.leave?.();
    activeKey = key;
    const tab = descriptors.get(key)!;
    view.show(tab);
    view.showResources(tab.showsResources);
    const mounted = await load(key);
    if (activeKey !== key) return;
    mounted.enter?.();
    draw();
  }

  return {
    switchTo,
    apply,
    modeChanged() {
      pool.clear();
      draw();
    },
  };
}
