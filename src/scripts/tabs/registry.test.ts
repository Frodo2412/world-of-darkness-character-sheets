import { describe, expect, it } from 'vitest';
import type { TabDescriptor } from './descriptor';
import { arrangeTabs } from './registry';

const tab = (key: string, order: number, showsResources = true): TabDescriptor => ({
  key,
  label: key,
  order,
  showsResources,
  mount: async () => ({}),
});

const sheet = tab('sheet', 0);

describe('arrangeTabs', () => {
  it('lists only the Character sheet, with no bar, when nothing else is registered', () => {
    const { tabs, showBar } = arrangeTabs(sheet, []);
    expect(tabs).toEqual([sheet]);
    expect(showBar).toBe(false);
  });

  it('puts the Character sheet first and the rest in order, whatever order they arrive in', () => {
    const { tabs, showBar } = arrangeTabs(sheet, [tab('journal', 40), tab('disciplines', 10), tab('combat', 30)]);
    expect(tabs.map((entry) => entry.key)).toEqual(['sheet', 'disciplines', 'combat', 'journal']);
    expect(showBar).toBe(true);
  });

  it('keeps the Character sheet first even when another tab asks for a lower order', () => {
    expect(arrangeTabs(sheet, [tab('combat', -5)]).tabs.map((entry) => entry.key)).toEqual(['sheet', 'combat']);
  });

  it('rejects two tabs with one key, the Character sheet included', () => {
    expect(() => arrangeTabs(sheet, [tab('combat', 10), tab('combat', 20)])).toThrow('"combat"');
    expect(() => arrangeTabs(sheet, [tab('sheet', 10)])).toThrow('"sheet"');
  });

  it('rejects two tabs with one order', () => {
    expect(() => arrangeTabs(sheet, [tab('combat', 10), tab('journal', 10)])).toThrow('order 10');
  });

  it('does not change the list it was given', () => {
    const others = [tab('journal', 40), tab('combat', 30)];
    arrangeTabs(sheet, others);
    expect(others.map((entry) => entry.key)).toEqual(['journal', 'combat']);
  });
});
