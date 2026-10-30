import { afterEach, describe, expect, it, vi } from 'vitest';
import { findSearch, isMacPlatform, isSearchShortcut, shortcutHint, wireSearchField, wireSearchHint } from './search';

const press = (key: string, modifiers: { metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean } = {}) => ({
  key,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...modifiers,
});

describe('isMacPlatform', () => {
  it.each([
    ['MacIntel', true],
    ['MacARM', true],
    ['Win32', false],
    ['Linux x86_64', false],
    ['', false],
  ])('reads %j as %s', (platform, expected) => {
    expect(isMacPlatform(platform)).toBe(expected);
  });
});

describe('shortcutHint', () => {
  it('reads ⌘K on macOS and Ctrl K elsewhere', () => {
    expect(shortcutHint(true)).toBe('⌘K');
    expect(shortcutHint(false)).toBe('Ctrl K');
  });
});

describe('isSearchShortcut', () => {
  it('is ⌘K on macOS, in either case', () => {
    expect(isSearchShortcut(press('k', { metaKey: true }), true)).toBe(true);
    expect(isSearchShortcut(press('K', { metaKey: true }), true)).toBe(true);
  });

  it('is Ctrl+K elsewhere', () => {
    expect(isSearchShortcut(press('k', { ctrlKey: true }), false)).toBe(true);
  });

  it("leaves the other platform's modifier alone", () => {
    expect(isSearchShortcut(press('k', { ctrlKey: true }), true)).toBe(false);
    expect(isSearchShortcut(press('k', { metaKey: true }), false)).toBe(false);
  });

  it('needs the modifier and the K', () => {
    expect(isSearchShortcut(press('k'), true)).toBe(false);
    expect(isSearchShortcut(press('j', { metaKey: true }), true)).toBe(false);
  });

  it('is left to the browser when Shift or Alt is held as well', () => {
    expect(isSearchShortcut(press('k', { metaKey: true, shiftKey: true }), true)).toBe(false);
    expect(isSearchShortcut(press('k', { metaKey: true, altKey: true }), true)).toBe(false);
    expect(isSearchShortcut(press('k', { ctrlKey: true, shiftKey: true }), false)).toBe(false);
    expect(isSearchShortcut(press('k', { ctrlKey: true, altKey: true }), false)).toBe(false);
  });
});

describe('wireSearchHint', () => {
  /** A search field and a hint, as far as the wiring touches them. */
  function fields(value: string) {
    const listeners: (() => void)[] = [];
    const attributes = new Map<string, string>();
    const search = {
      value,
      setAttribute: (name: string, text: string) => void attributes.set(name, text),
      addEventListener: (_type: string, listener: () => void) => void listeners.push(listener),
    };
    const hint = { textContent: '', hidden: true };
    return { search, hint, attributes, type: (text: string) => { search.value = text; for (const listener of listeners) listener(); } };
  }

  it('names the key on the hint and on the field', () => {
    const { search, hint, attributes } = fields('');
    wireSearchHint(search as unknown as HTMLInputElement, hint as unknown as HTMLElement, true);
    expect(hint).toMatchObject({ textContent: '⌘K', hidden: false });
    expect(attributes.get('aria-keyshortcuts')).toBe('Meta+K');
  });

  it('names Control+K elsewhere', () => {
    const { search, hint, attributes } = fields('');
    wireSearchHint(search as unknown as HTMLInputElement, hint as unknown as HTMLElement, false);
    expect(hint).toMatchObject({ textContent: 'Ctrl K', hidden: false });
    expect(attributes.get('aria-keyshortcuts')).toBe('Control+K');
  });

  it('is hidden while the field holds text, so it never covers the clear button, and returns when it is emptied', () => {
    const { search, hint, type } = fields('');
    wireSearchHint(search as unknown as HTMLInputElement, hint as unknown as HTMLElement, false);
    type('vis');
    expect(hint.hidden).toBe(true);
    type('');
    expect(hint.hidden).toBe(false);
  });

  it('stays hidden when the field already holds text, as after a reload that restores it', () => {
    const { search, hint } = fields('vis');
    wireSearchHint(search as unknown as HTMLInputElement, hint as unknown as HTMLElement, false);
    expect(hint.hidden).toBe(true);
  });
});

describe('findSearch', () => {
  it('finds the three parts by the prefix the screen drew its field with', () => {
    const asked: string[] = [];
    const root = { querySelector: (selector: string) => (asked.push(selector), { selector }) };
    const parts = findSearch(root as unknown as ParentNode, 'bg');
    expect(asked).toEqual(['[data-bg-search]', '[data-bg-search-hint]', '[data-bg-results]']);
    expect(parts.search).toEqual({ selector: '[data-bg-search]' });
  });
});

describe('wireSearchField', () => {
  afterEach(() => vi.unstubAllGlobals());

  /** A field, its hint and results region, and a page that records the shortcut's listener. */
  function setup(options: { hiddenScreen?: boolean } = {}) {
    const input: (() => void)[] = [];
    const keys: ((event: unknown) => void)[] = [];
    const attributes = new Map<string, string>();
    let focused = false;
    const search = {
      value: '',
      setAttribute: (name: string, text: string) => void attributes.set(name, text),
      addEventListener: (_type: string, listener: () => void) => void input.push(listener),
      closest: () => (options.hiddenScreen ? {} : null),
      focus: () => void (focused = true),
    };
    const hint = { textContent: '', hidden: true };
    const results = { textContent: '' };
    vi.stubGlobal('document', {
      addEventListener: (_type: string, listener: (event: unknown) => void) => void keys.push(listener),
      querySelector: () => null,
    });
    const queries: string[] = [];
    const say = wireSearchField(
      { search, hint, results } as unknown as Parameters<typeof wireSearchField>[0],
      (query) => queries.push(query),
      false,
    );
    return {
      hint,
      results,
      attributes,
      queries,
      say,
      type: (text: string) => {
        search.value = text;
        for (const listener of input) listener();
      },
      press: () => {
        const event = { key: 'k', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, preventDefault: () => {} };
        for (const listener of keys) listener(event);
      },
      focused: () => focused,
    };
  }

  it('names the key for the platform on the hint and the field', () => {
    const { hint, attributes } = setup();
    expect(hint.textContent).toBe('Ctrl K');
    expect(attributes.get('aria-keyshortcuts')).toBe('Control+K');
  });

  it('gives the query at every change and hides the hint while it holds text', () => {
    const { type, queries, hint } = setup();
    type('re');
    type('');
    expect(queries).toEqual(['re', '']);
    expect(hint.hidden).toBe(false);
    type('r');
    expect(hint.hidden).toBe(true);
  });

  it('writes the first result count at once', () => {
    const { say, results } = setup();
    say('14 Backgrounds listed');
    expect(results.textContent).toBe('14 Backgrounds listed');
  });

  it('focuses the field on the shortcut while its screen is shown, and not while it is hidden', () => {
    const shown = setup();
    shown.press();
    expect(shown.focused()).toBe(true);
    const hidden = setup({ hiddenScreen: true });
    hidden.press();
    expect(hidden.focused()).toBe(false);
  });
});
