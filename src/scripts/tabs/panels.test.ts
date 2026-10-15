import { describe, expect, it } from 'vitest';
import { focusPanel, revealPanel } from './panels';

/** A panel and the page around it, with just what `focusPanel` touches. `top` is where the focused element's top edge is in the viewport. */
function pageWith(heading: { tabIndex?: number; attrs: string[] } | undefined, top = 100) {
  const focused: string[] = [];
  const rect = { top, bottom: top + 30 };
  const element = (name: string, extra: object = {}) => ({
    focus: () => void focused.push(name),
    scrollIntoView: () => void focused.push(`scroll:${name}`),
    getBoundingClientRect: () => rect,
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

const VIEWPORT = 800;

describe('focusPanel', () => {
  it('moves focus to the heading the panel marks, making it focusable, and leaves the page where it is when the heading is in view', () => {
    const { sheet, focused, headingElement } = pageWith({ attrs: [] });

    focusPanel(sheet, 'sheet', VIEWPORT);

    expect(focused).toEqual(['heading']);
    expect((headingElement as { tabIndex?: number }).tabIndex).toBe(-1);
  });

  it('brings the panel to the top of the screen when its heading is above the viewport', () => {
    const { sheet, focused } = pageWith({ attrs: [] }, -400);

    focusPanel(sheet, 'sheet', VIEWPORT);

    expect(focused).toEqual(['heading', 'scroll:panel']);
  });

  it('brings the panel to the top of the screen when its heading is below the fold', () => {
    const { sheet, focused } = pageWith({ attrs: [] }, 900);

    focusPanel(sheet, 'sheet', VIEWPORT);

    expect(focused).toEqual(['heading', 'scroll:panel']);
  });

  it('moves focus to the panel itself when it marks no heading, scrolling only when it is out of view', () => {
    const inView = pageWith(undefined);
    const above = pageWith(undefined, -50);

    focusPanel(inView.sheet, 'sheet', VIEWPORT);
    focusPanel(above.sheet, 'sheet', VIEWPORT);

    expect(inView.focused).toEqual(['panel']);
    expect(above.focused).toEqual(['panel', 'scroll:panel']);
  });
});

describe('revealPanel', () => {
  it('moves no focus, and leaves the page alone when the heading is in view', () => {
    const { sheet, focused } = pageWith({ attrs: [] });

    revealPanel(sheet, 'sheet', VIEWPORT);

    expect(focused).toEqual([]);
  });

  it('scrolls the panel to the top of the screen when the heading is out of view, above or below', () => {
    const above = pageWith({ attrs: [] }, -10);
    const below = pageWith({ attrs: [] }, 790);

    revealPanel(above.sheet, 'sheet', VIEWPORT);
    revealPanel(below.sheet, 'sheet', VIEWPORT);

    expect(above.focused).toEqual(['scroll:panel']);
    expect(below.focused).toEqual(['scroll:panel']);
  });
});
