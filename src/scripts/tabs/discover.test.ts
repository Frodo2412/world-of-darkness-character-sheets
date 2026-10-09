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

describe('the tabs found in src/tabs', () => {
  it('are only the Character sheet while no tab folder exists, with no bar', () => {
    const { tabs, showBar } = discoverTabs();
    expect(tabs.map((entry) => entry.key)).toEqual(['sheet']);
    expect(showBar).toBe(false);
  });

  it('pass the consistency check while no tab folder exists', () => {
    expect(() => checkTabFolders([])).not.toThrow();
  });

  it('fail the check for a panel that has no descriptor', () => {
    expect(() => checkTabFolders(['../tabs/combat/Panel.astro'])).toThrow('src/tabs/combat/ has a Panel.astro but no descriptor.ts');
  });
});
