import { SHEET_KEY, type TabDescriptor } from './descriptor';

/** The Character sheet, the first tab: built into the page, not found in a folder. */
export const SHEET_TAB: TabDescriptor = {
  key: SHEET_KEY,
  label: 'Character sheet',
  order: 0,
  showsResources: true,
  mount: () => import('./sheetTab'),
};
