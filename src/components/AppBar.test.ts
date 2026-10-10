import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import AppBar from './AppBar.astro';

describe('AppBar.astro', () => {
  it('draws no label where a page gives none, as on the roster and the builder', async () => {
    const html = await (await AstroContainer.create()).renderToString(AppBar);
    expect(html).not.toContain('data-app-bar-label');
    expect(html).toContain('id="save-status"');
  });

  it('draws what the sheet gives it as the label, between the title and the save status', async () => {
    const html = await (await AstroContainer.create()).renderToString(AppBar, {
      slots: { label: '<p data-app-bar-label></p>' },
    });
    expect(html.indexOf('app-bar-identity')).toBeLessThan(html.indexOf('data-app-bar-label'));
    expect(html.indexOf('data-app-bar-label')).toBeLessThan(html.indexOf('id="save-status"'));
  });
});
