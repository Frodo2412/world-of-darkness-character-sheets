import { arrangeTabs, type TabList } from './registry';
import { SHEET_TAB } from './sheetDescriptor';

/** The tabs this page offers. */
export function discoverTabs(): TabList {
  return arrangeTabs(SHEET_TAB, []);
}
