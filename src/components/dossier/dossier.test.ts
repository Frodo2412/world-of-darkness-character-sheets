import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import EmptyState from './EmptyState.astro';
import ReadOnlyHint from './ReadOnlyHint.astro';
import ReferenceTable from './ReferenceTable.astro';
import SectionHeading from './SectionHeading.astro';
import SegmentedControl from './SegmentedControl.astro';
import SelectableItem from './SelectableItem.astro';
import TagChips from './TagChips.astro';

type Component = Parameters<AstroContainer['renderToString']>[0];

const render = async (
  component: Component,
  options: Parameters<AstroContainer['renderToString']>[1] = {},
): Promise<string> => (await AstroContainer.create()).renderToString(component, options);

describe('SectionHeading', () => {
  it('draws the title as a heading with its count beside it', async () => {
    const html = await render(SectionHeading, { props: { title: 'Merits', count: '3 points' } });
    expect(html).toMatch(/<h2[^>]*>Merits<\/h2>/);
    expect(html).toContain('3 points');
  });

  it('draws no count when it has none', async () => {
    expect(await render(SectionHeading, { props: { title: 'Merits' } })).not.toContain('dossier-heading-count');
  });

  it('takes the level and an id for aria-labelledby', async () => {
    const html = await render(SectionHeading, { props: { title: 'Havens', level: 3, id: 'havens-heading' } });
    expect(html).toMatch(/<h3[^>]*id="havens-heading"[^>]*>Havens<\/h3>/);
  });
});

describe('ReadOnlyHint', () => {
  it('says so in words, for play mode only', async () => {
    const html = await render(ReadOnlyHint);
    expect(html).toContain('Read-only in play · edit character to change');
    expect(html).toContain('data-sheet-mode-only="play"');
  });
});

describe('TagChips', () => {
  it('draws the tags as a list, named for assistive technology', async () => {
    const html = await render(TagChips, { props: { tags: ['Ally', 'Sabbat'], label: 'People' } });
    expect(html).toContain('<ul');
    expect(html).toContain('aria-label="People"');
    expect(html.match(/<li/g)).toHaveLength(2);
    expect(html).toContain('Sabbat');
  });

  it('draws nothing for no tags', async () => {
    expect((await render(TagChips, { props: { tags: [] } })).trim()).toBe('');
  });
});

describe('EmptyState', () => {
  it('says what is missing', async () => {
    const html = await render(EmptyState, { props: { message: 'No merits yet.' } });
    expect(html).toContain('No merits yet.');
    expect(html).not.toContain('dossier-empty-action');
  });

  it('offers the next action it is given', async () => {
    const html = await render(EmptyState, {
      props: { message: 'No notes yet.' },
      slots: { action: '<button type="button">Add a note</button>' },
    });
    expect(html).toContain('dossier-empty-action');
    expect(html).toContain('<button type="button">Add a note</button>');
  });
});

describe('ReferenceTable', () => {
  const rows = '<tr><th scope="row">Block</th><td>5</td></tr>';
  const props = { caption: 'Melee manoeuvres', headings: ['Name', 'Pool'] };

  it('names the table with a caption and scopes each heading to its column', async () => {
    const html = await render(ReferenceTable, { props, slots: { default: rows } });
    expect(html).toMatch(/<caption[^>]*>Melee manoeuvres<\/caption>/);
    expect(html.match(/<th scope="col"/g)).toHaveLength(2);
    expect(html).toContain('Block');
  });

  it('scrolls inside a labelled region the keyboard can reach', async () => {
    const html = await render(ReferenceTable, { props, slots: { default: rows } });
    expect(html).toMatch(/<div[^>]*class="dossier-table-scroll"[^>]*>/);
    const region = html.match(/<div[^>]*class="dossier-table-scroll"[^>]*>/)![0];
    expect(region).toContain('role="region"');
    expect(region).toContain('aria-label="Melee manoeuvres"');
    expect(region).toContain('tabindex="0"');
  });

  it('can keep the caption for assistive technology only', async () => {
    const html = await render(ReferenceTable, { props: { ...props, captionHidden: true }, slots: { default: rows } });
    expect(html).toMatch(/<caption[^>]*class="visually-hidden"/);
  });
});

describe('SegmentedControl', () => {
  const props = {
    label: 'Weapon type',
    options: [
      { value: 'all', label: 'All' },
      { value: 'melee', label: 'Close combat' },
    ],
    pressed: 'melee',
  };

  it('is a named group of buttons, only the chosen one pressed', async () => {
    const html = await render(SegmentedControl, { props });
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Weapon type"');
    const buttons = html.match(/<button[^>]*>/g)!;
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toContain('aria-pressed="false"');
    expect(buttons[1]).toContain('aria-pressed="true"');
    expect(buttons[1]).toContain('data-value="melee"');
  });

  it('carries a text mark in each button, shown only on the pressed one', async () => {
    const html = await render(SegmentedControl, { props });
    expect(html.match(/dossier-segment-mark[^>]*>✓</g)).toHaveLength(2);
    const css = readFileSync(new URL('../../styles/dossier.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.dossier-segment\[aria-pressed='false'\] \.dossier-segment-mark[^{]*\{[^}]*visibility:\s*hidden/);
  });
});

describe('SelectableItem', () => {
  it('marks the current item with aria-current and a text mark', async () => {
    const html = await render(SelectableItem, { props: { value: 'celerity', current: true }, slots: { default: 'Celerity' } });
    expect(html).toMatch(/<button[^>]*aria-current="true"/);
    expect(html).toContain('dossier-item-mark');
    expect(html).toContain('▸');
    expect(html).toContain('Celerity');
  });

  it('leaves aria-current off the others', async () => {
    const html = await render(SelectableItem, { props: { value: 'auspex' }, slots: { default: 'Auspex' } });
    expect(html).not.toContain('aria-current');
    expect(html).toContain('data-value="auspex"');
  });
});
