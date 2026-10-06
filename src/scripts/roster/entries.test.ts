import { describe, expect, it } from 'vitest';
import type { LibraryEntry } from '../../domain/v20/library';
import { drawSafely, sheetUrl, slot } from './entries';

/** Just enough of an element for `slot`: it finds a slot by the selector it is asked for. */
const rootWith = (slots: string[]): ParentNode =>
  ({
    querySelector: (selector: string) =>
      slots.some((name) => selector === `[data-slot="${name}"]`) ? { marker: selector } : null,
  }) as unknown as ParentNode;

describe('slot', () => {
  it('returns the element marked with the name', () => {
    expect(slot(rootWith(['name']), 'name')).toEqual({ marker: '[data-slot="name"]' });
  });

  it('throws when the template has no such slot, naming it', () => {
    expect(() => slot(rootWith(['name']), 'summary')).toThrow('The entry template has no "summary" slot.');
  });
});

describe('drawSafely', () => {
  const readable = (kind: 'character' | 'build', id: string): LibraryEntry => ({
    kind,
    id,
    name: 'Lucita',
    monogram: 'L',
    summary: '',
    temperament: '',
    chronicle: '',
    chronicleLabel: 'Unassigned',
    clan: '',
    concept: '',
    chronicleKey: '',
    clanKey: '',
  });
  // Draws an entry as a label; a character's label needs an address, which can throw.
  const draw = (entry: LibraryEntry): string =>
    entry.kind === 'character' ? sheetUrl(entry.id) : `${entry.kind}:${entry.id}`;
  const LONE_SURROGATE = 'a\ud800';

  it('draws an entry that can be drawn as itself', () => {
    expect(drawSafely(draw, readable('character', 'c1'))).toBe('/sheet/?id=c1');
  });

  it('draws a character that cannot be drawn as an unreadable character', () => {
    expect(() => sheetUrl(LONE_SURROGATE)).toThrow(URIError);
    expect(drawSafely(draw, readable('character', LONE_SURROGATE))).toBe(
      `unreadable-character:${LONE_SURROGATE}`,
    );
  });

  it('draws a build that cannot be drawn as an unreadable build', () => {
    const failing = (entry: LibraryEntry): string => {
      if (entry.kind === 'build') throw new Error('cannot be drawn');
      return draw(entry);
    };
    expect(drawSafely(failing, readable('build', 'b1'))).toBe('unreadable-build:b1');
  });
});
