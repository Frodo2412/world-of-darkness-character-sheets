import { describe, expect, it } from 'vitest';
import { focusPanel } from './panels';

/** A panel and the page around it, with just what `focusPanel` touches. */
function pageWith(heading: { tabIndex?: number; attrs: string[] } | undefined) {
  const focused: string[] = [];
  const element = (name: string, extra: object = {}) => ({
    focus: () => void focused.push(name),
    scrollIntoView: () => void focused.push(`scroll:${name}`),
    ...extra,
  });
  const headingElement =
    heading === undefined
      ? null
      : element('heading', {
          tabIndex: heading.tabIndex,
          hasAttribute: (name: string) => heading.attrs.includes(name),
        });
  const panel = element('panel', {
    querySelector: (selector: string) => (selector === '[data-panel-heading]' ? headingElement : null),
  });
  const sheet = {
    querySelector: (selector: string) => (selector === '[data-tab-panel="sheet"]' ? panel : null),
  } as unknown as ParentNode;
  return { sheet, focused, headingElement };
}

describe('focusPanel', () => {
  it('moves focus to the heading the panel marks, making it focusable, and scrolls the panel to the top', () => {
    const { sheet, focused, headingElement } = pageWith({ attrs: [] });

    focusPanel(sheet, 'sheet');

    expect(focused).toEqual(['heading', 'scroll:panel']);
    expect((headingElement as { tabIndex?: number }).tabIndex).toBe(-1);
  });

  it('moves focus to the panel itself when it marks no heading', () => {
    const { sheet, focused } = pageWith(undefined);

    focusPanel(sheet, 'sheet');

    expect(focused).toEqual(['panel', 'scroll:panel']);
  });
});
