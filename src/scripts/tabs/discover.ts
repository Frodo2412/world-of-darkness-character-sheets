import type { TabDescriptor } from './descriptor';
import { arrangeTabs, type TabList } from './registry';
import { SHEET_TAB } from './sheetDescriptor';

// A tab is a folder, `src/tabs/<key>/`, holding `descriptor.ts` and `Panel.astro`. This glob is the
// only place that finds the descriptors; the page's server render and its script both read them
// through `discoverTabs`, so adding a folder registers a tab with no shared file edited.
const descriptorModules = import.meta.glob<{ default: TabDescriptor }>('../../tabs/*/descriptor.ts', { eager: true });

/** The folder a glob path such as `../../tabs/combat/descriptor.ts` is in. */
export const folderOf = (path: string): string => path.split('/').at(-2)!;

/** The descriptor of each tab folder, by folder name. */
const descriptorsByFolder = (): Record<string, TabDescriptor> =>
  Object.fromEntries(Object.entries(descriptorModules).map(([path, module]) => [folderOf(path), module.default]));

/** What is wrong with the tab folders: a descriptor without its panel or a panel without its descriptor, or a key that is not the folder's name. */
export function tabFolderProblems(
  descriptors: Readonly<Record<string, TabDescriptor>>,
  panelFolders: readonly string[],
): string[] {
  const problems: string[] = [];
  for (const [folder, descriptor] of Object.entries(descriptors)) {
    if (!panelFolders.includes(folder)) problems.push(`src/tabs/${folder}/ has a descriptor.ts but no Panel.astro`);
    if (descriptor.key !== folder) problems.push(`src/tabs/${folder}/descriptor.ts has the key "${descriptor.key}", not "${folder}"`);
  }
  for (const folder of panelFolders) {
    if (!(folder in descriptors)) problems.push(`src/tabs/${folder}/ has a Panel.astro but no descriptor.ts`);
  }
  return problems;
}

/** Fails the build when the tab folders do not pair up; `panelPaths` are the paths the panel glob found. */
export function checkTabFolders(panelPaths: readonly string[]): void {
  const problems = tabFolderProblems(descriptorsByFolder(), panelPaths.map(folderOf));
  if (problems.length > 0) throw new Error(`The tab folders are inconsistent:\n${problems.join('\n')}`);
}

/** The tabs this page offers. */
export function discoverTabs(): TabList {
  return arrangeTabs(SHEET_TAB, Object.values(descriptorsByFolder()));
}
