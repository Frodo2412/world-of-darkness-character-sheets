import { readFileSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import TabBar from './TabBar.astro';

const render = async (tabs: { key: string; label: string }[]): Promise<string> => {
  const container = await AstroContainer.create();
  return container.renderToString(TabBar, { props: { tabs } });
};

const sheet = { key: 'sheet', label: 'Character sheet' };
const combat = { key: 'combat', label: 'Combat' };

describe('TabBar.astro', () => {
  it('draws no bar for one tab', async () => {
    expect((await render([sheet])).trim()).toBe('');
  });

  it('draws a tablist of tabs in the order given, each controlling its own panel', async () => {
    const html = await render([sheet, combat]);
    expect(html).toContain('role="tablist"');
    expect(html.match(/role="tab"/g)).toHaveLength(2);
    expect(html.indexOf('Character sheet')).toBeLessThan(html.indexOf('Combat'));
    expect(html).toContain('id="tab-sheet"');
    expect(html).toContain('aria-controls="tab-panel-sheet"');
    expect(html).toContain('aria-controls="tab-panel-combat"');
  });

  it('marks the first tab selected and the only one a Tab press reaches', async () => {
    const html = await render([sheet, combat]);
    const tags = html.match(/<a [^>]*>/g)!;
    expect(tags[0]).toContain('aria-selected="true"');
    expect(tags[0]).toContain('tabindex="0"');
    expect(tags[1]).toContain('aria-selected="false"');
    expect(tags[1]).toContain('tabindex="-1"');
  });

  it('gives each tab an address to fall back on, which the script replaces with one that keeps the character', async () => {
    const html = await render([sheet, combat]);
    expect(html).toContain('href="?tab=combat"');
  });
});

describe('the selected tab in tabs.css', () => {
  const css = readFileSync(new URL('../../styles/tabs.css', import.meta.url), 'utf8');
  const rule = css.match(/\.tab-link\[aria-selected='true'\]\s*\{([^}]*)\}/)?.[1] ?? '';

  it('is set apart by weight and an underline, not by colour alone', () => {
    expect(rule).toMatch(/font-weight:\s*600/);
    expect(rule).toMatch(/text-decoration:\s*underline/);
  });
});
