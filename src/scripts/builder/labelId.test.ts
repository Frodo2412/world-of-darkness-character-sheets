import { describe, expect, it } from 'vitest';
import { traitLabelId } from './labelId';

describe('traitLabelId', () => {
  it('prefixes the step and replaces every character an id would not keep', () => {
    expect(traitLabelId('advantages', 'discipline:Dominate')).toBe('advantages-discipline-Dominate-label');
    expect(traitLabelId('abilities', 'ability:Animal Ken')).toBe('abilities-ability-Animal-Ken-label');
  });

  it('keeps one trait on two steps apart', () => {
    expect(traitLabelId('advantages', 'background:Herd')).not.toBe(traitLabelId('finishing', 'background:Herd'));
  });
});
