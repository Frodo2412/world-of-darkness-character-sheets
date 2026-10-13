import { describe, expect, it } from 'vitest';
import type { TabDescriptor } from './descriptor';
import { checkTabFolders, discoverTabs, folderOf, tabFolderProblems } from './discover';

const tab = (key: string): TabDescriptor => ({
  key,
  label: key,
  order: 10,
  showsResources: true,
  mount: async () => ({ mount: () => ({ render() {} }) }),
});

describe('tabFolderProblems', () => {
  it('finds nothing when every descriptor has its panel and every panel its descriptor', () => {
    expect(tabFolderProblems({ combat: tab('combat'), journal: tab('journal') }, ['journal', 'combat'])).toEqual([]);
  });

  it('names a descriptor with no panel', () => {
    expect(tabFolderProblems({ combat: tab('combat') }, [])).toEqual([
      'src/tabs/combat/ has a descriptor.ts but no Panel.astro',
    ]);
  });

  it('names a panel with no descriptor', () => {
    expect(tabFolderProblems({}, ['combat'])).toEqual(['src/tabs/combat/ has a Panel.astro but no descriptor.ts']);
  });

  it('names a key that is not the folder name, since the folder is how the panel is found', () => {
    expect(tabFolderProblems({ combat: tab('fighting') }, ['combat'])).toEqual([
      'src/tabs/combat/descriptor.ts has the key "fighting", not "combat"',
    ]);
  });
});

describe('folderOf', () => {
  it('is the folder the file is in', () => {
    expect(folderOf('../../tabs/level-up/descriptor.ts')).toBe('level-up');
    expect(folderOf('../tabs/combat/Panel.astro')).toBe('combat');
  });
});

// The descriptor glob's result is given to the functions, so these do not depend on which tab
// folders the repository has: a new tab folder changes nothing here.
describe('the tabs found in the descriptor modules', () => {
  const folder = (name: string) => ({ [`../../tabs/${name}/descriptor.ts`]: { default: tab(name) } });

  it('are only the Character sheet when there is no tab folder, with no bar', () => {
    const { tabs, showBar } = discoverTabs({});
    expect(tabs.map((entry) => entry.key)).toEqual(['sheet']);
    expect(showBar).toBe(false);
  });

  it('put the Character sheet first and show the bar once a tab folder exists', () => {
    const { tabs, showBar } = discoverTabs(folder('zz-fake'));
    expect(tabs.map((entry) => entry.key)).toEqual(['sheet', 'zz-fake']);
    expect(showBar).toBe(true);
  });

  it('pass the consistency check when each descriptor has its panel', () => {
    expect(() => checkTabFolders(['../tabs/zz-fake/Panel.astro'], folder('zz-fake'))).not.toThrow();
  });

  it('fail the check for a panel that has no descriptor', () => {
    expect(() => checkTabFolders(['../tabs/zz-fake/Panel.astro'], {})).toThrow(
      'src/tabs/zz-fake/ has a Panel.astro but no descriptor.ts',
    );
  });

  it('fail the check for a descriptor that has no panel', () => {
    expect(() => checkTabFolders([], folder('zz-fake'))).toThrow('src/tabs/zz-fake/ has a descriptor.ts but no Panel.astro');
  });
});
