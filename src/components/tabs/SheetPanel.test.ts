import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import SheetPanel from './SheetPanel.astro';

describe('SheetPanel.astro', () => {
  it('marks one heading for focus to move to when the Character sheet is opened', async () => {
    const html = await (await AstroContainer.create()).renderToString(SheetPanel);

    expect(html.match(/data-panel-heading/g)).toHaveLength(1);
    expect(html).toMatch(/<h2[^>]*data-panel-heading[^>]*>\s*Traits and pool\s*<\/h2>/);
  });
});
