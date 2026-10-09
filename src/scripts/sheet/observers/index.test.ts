import { describe, expect, it } from 'vitest';
import { observers } from './index';

describe('the observers folder', () => {
  it('registers nothing until a module is dropped into it, and never itself', () => {
    expect(observers).toEqual([]);
  });
});
