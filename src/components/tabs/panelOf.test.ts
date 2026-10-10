import { describe, expect, it } from 'vitest';
import { SHEET_KEY } from '../../scripts/tabs/descriptor';
import { panelOf } from './panelOf';
import SheetPanel from './SheetPanel.astro';

describe('panelOf', () => {
  it('gives the Character sheet its built-in panel', () => {
    expect(panelOf(SHEET_KEY)).toBe(SheetPanel);
  });
});
