import { SHEET_KEY, type TabKey } from '../../scripts/tabs/descriptor';
import { checkTabFolders, folderOf } from '../../scripts/tabs/discover';
import SheetPanel from './SheetPanel.astro';

type Panel = (props: Record<string, never>) => unknown;

// Each tab is a folder under src/tabs holding a Panel.astro; the Character sheet is built into the page.
const folderPanels = import.meta.glob<{ default: Panel }>('../../tabs/*/Panel.astro', { eager: true });
checkTabFolders(Object.keys(folderPanels));

const panels = new Map<TabKey, Panel>([
  [SHEET_KEY, SheetPanel],
  ...Object.entries(folderPanels).map(([path, module]): [TabKey, Panel] => [folderOf(path), module.default]),
]);

/** The panel component of the tab with this key: the one map the page draws its panels from. */
export const panelOf = (key: TabKey): Panel => panels.get(key)!;
