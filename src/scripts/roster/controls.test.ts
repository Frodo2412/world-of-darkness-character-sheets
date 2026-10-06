import { describe, expect, it } from 'vitest';
import { isShortcut, shortcutFor, type KeyPress } from './controls';

const press = (overrides: Partial<KeyPress>): KeyPress => ({
  key: 'k',
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  isComposing: false,
  ...overrides,
});

describe('shortcutFor', () => {
  it('is Command K on the Apple platform names, from userAgentData or from navigator.platform', () => {
    for (const source of [
      { userAgentData: { platform: 'macOS' } },
      { platform: 'MacIntel' },
      { platform: 'iPhone' },
      { platform: 'iPad' },
    ]) {
      expect(shortcutFor(source)).toEqual({ modifier: 'Meta', hint: '⌘ K', keyShortcuts: 'Meta+K' });
    }
  });

  it('is Control K on any other platform, and when the platform is not known', () => {
    for (const source of [{ userAgentData: { platform: 'Windows' } }, { platform: 'Win32' }, { platform: 'Linux x86_64' }, {}]) {
      expect(shortcutFor(source)).toEqual({ modifier: 'Control', hint: 'Ctrl K', keyShortcuts: 'Control+K' });
    }
  });

  it('reads userAgentData first, and navigator.platform only when it has none', () => {
    expect(shortcutFor({ userAgentData: { platform: 'Windows' }, platform: 'MacIntel' }).modifier).toBe('Control');
    expect(shortcutFor({ userAgentData: {}, platform: 'MacIntel' }).modifier).toBe('Meta');
  });
});

describe('isShortcut', () => {
  const apple = shortcutFor({ platform: 'MacIntel' });
  const other = shortcutFor({ platform: 'Win32' });

  it('is K with Command on an Apple platform and with Control elsewhere, in either case', () => {
    expect(isShortcut(press({ metaKey: true }), apple)).toBe(true);
    expect(isShortcut(press({ key: 'K', metaKey: true }), apple)).toBe(true);
    expect(isShortcut(press({ ctrlKey: true }), other)).toBe(true);
  });

  it("is not the other platform's combination", () => {
    expect(isShortcut(press({ ctrlKey: true }), apple)).toBe(false);
    expect(isShortcut(press({ metaKey: true }), other)).toBe(false);
  });

  it('is not K with no modifier, with both, or with more held', () => {
    expect(isShortcut(press({}), apple)).toBe(false);
    expect(isShortcut(press({ metaKey: true, ctrlKey: true }), apple)).toBe(false);
    expect(isShortcut(press({ metaKey: true, shiftKey: true }), apple)).toBe(false);
    expect(isShortcut(press({ ctrlKey: true, altKey: true }), other)).toBe(false);
  });

  it('is not another key', () => {
    expect(isShortcut(press({ key: 'j', metaKey: true }), apple)).toBe(false);
  });

  it('is not a press made while composing text', () => {
    expect(isShortcut(press({ metaKey: true, isComposing: true }), apple)).toBe(false);
  });
});
