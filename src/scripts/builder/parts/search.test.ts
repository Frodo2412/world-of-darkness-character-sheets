import { describe, expect, it } from 'vitest';
import { isMacPlatform, isSearchShortcut, shortcutHint } from './search';

const press = (key: string, modifiers: { metaKey?: boolean; ctrlKey?: boolean } = {}) => ({
  key,
  metaKey: false,
  ctrlKey: false,
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
});
