import { describe, expect, it } from 'vitest';
import { observers } from './index';

describe('the observers folder', () => {
  // True of an empty folder and of a full one, so dropping a module in never breaks it; the folder's
  // own index and test files are not among them, or they would have no afterRender.
  it('registers only modules that export afterRender', () => {
    for (const observer of observers) expect(typeof observer.afterRender).toBe('function');
  });
});
