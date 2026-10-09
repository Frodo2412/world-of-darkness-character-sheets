/** The key of the Character sheet tab, the one that is always present and always first. */
export const SHEET_KEY = 'sheet';

/** A tab's key: its address and the name of its folder. */
export type TabKey = string;

/**
 * What a tab's folder declares in `src/tabs/<key>/descriptor.ts`. It holds no page code: `mount`
 * loads the tab's script only when the tab is first shown.
 */
export interface TabDescriptor {
  /** The tab's address (`?tab=<key>`) and the name of its folder. */
  key: TabKey;
  /** The tab's name, as the bar and the page title show it. */
  label: string;
  /** Where the tab stands in the bar, after the Character sheet; lower comes first. */
  order: number;
  /** Whether the live resources row (Blood Pool to Humanity) stays above this tab. */
  showsResources: boolean;
  mount: () => Promise<unknown>;
}
