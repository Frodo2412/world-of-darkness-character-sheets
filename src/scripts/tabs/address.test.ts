import { describe, expect, it } from 'vitest';
import { blankCharacter } from '../../domain/v20/character';
import { hrefFor, tabFromUrl, titleFor } from './address';

const keys = ['sheet', 'disciplines', 'combat'];
const at = (address: string): URL => new URL(address, 'http://localhost/');

describe('tabFromUrl', () => {
  it('is the Character sheet when the address names no tab', () => {
    expect(tabFromUrl(at('/sheet/?id=a1'), keys)).toBe('sheet');
  });

  it('is the tab the address names', () => {
    expect(tabFromUrl(at('/sheet/?id=a1&tab=combat'), keys)).toBe('combat');
  });

  it('is the Character sheet for a tab that does not exist', () => {
    expect(tabFromUrl(at('/sheet/?id=a1&tab=nonsense'), keys)).toBe('sheet');
  });

  it('is the Character sheet for an empty tab', () => {
    expect(tabFromUrl(at('/sheet/?id=a1&tab='), keys)).toBe('sheet');
  });

  it('is case sensitive, like the keys', () => {
    expect(tabFromUrl(at('/sheet/?id=a1&tab=Combat'), keys)).toBe('sheet');
  });
});

describe('hrefFor', () => {
  it('sets the tab and keeps the character', () => {
    expect(hrefFor(at('/sheet/?id=a1'), 'combat')).toBe('/sheet/?id=a1&tab=combat');
  });

  it('replaces the tab already in the address', () => {
    expect(hrefFor(at('/sheet/?id=a1&tab=combat'), 'disciplines')).toBe('/sheet/?id=a1&tab=disciplines');
  });

  it('drops the tab for the Character sheet', () => {
    expect(hrefFor(at('/sheet/?id=a1&tab=combat'), 'sheet')).toBe('/sheet/?id=a1');
  });

  it('keeps an id that needs escaping', () => {
    expect(hrefFor(at(`/sheet/?id=${encodeURIComponent('a b&c')}`), 'combat')).toBe('/sheet/?id=a+b%26c&tab=combat');
  });

  it('never carries the edit marker', () => {
    expect(hrefFor(at('/sheet/?id=a1#edit'), 'combat')).toBe('/sheet/?id=a1&tab=combat');
  });
});

describe('titleFor', () => {
  it('names the tab and the character', () => {
    const character = { ...blankCharacter('a1'), header: { ...blankCharacter('a1').header, name: 'Ada Lovelace' } };
    expect(titleFor('Combat', character)).toBe('Combat · Ada Lovelace');
  });

  it('calls a blank name "Unnamed character"', () => {
    expect(titleFor('Combat', blankCharacter('a1'))).toBe('Combat · Unnamed character');
  });
});
