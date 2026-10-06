import { describe, expect, it } from 'vitest';
import { slot } from './entries';

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
