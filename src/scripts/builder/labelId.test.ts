import { describe, expect, it } from 'vitest';
import { traitLabelId } from './labelId';

describe('traitLabelId', () => {
  it('prefixes the step and keeps a plain name readable', () => {
    expect(traitLabelId('advantages', 'discipline:Dominate')).toBe('advantages-discipline-Dominate-label');
  });

  it('escapes every other character an id would not keep, as its code point between underscores', () => {
    expect(traitLabelId('abilities', 'ability:Animal Ken')).toBe('abilities-ability-Animal_20_Ken-label');
    expect(traitLabelId('advantages', 'discipline:Dark-Arts')).toBe('advantages-discipline-Dark_2d_Arts-label');
  });

  it('gives names that differ only in punctuation different ids', () => {
    const names = ['Dark Arts', 'Dark-Arts', 'Dark_Arts', 'Dark:Arts', 'Dark.Arts', 'DarkArts', 'Dark  Arts', 'Dark_2d_Arts', 'Dark\u00e9Arts', 'Dark\u{1F480}Arts'];
    const ids = names.map((name) => traitLabelId('advantages', `discipline:${name}`));
    expect(new Set(ids).size).toBe(names.length);
  });

  it('keeps a ref with no kind apart from one with a kind', () => {
    expect(traitLabelId('advantages', 'a:b')).not.toBe(traitLabelId('advantages', 'a-b'));
    expect(traitLabelId('advantages', 'a:b:c')).not.toBe(traitLabelId('advantages', 'a:b-c'));
  });

  it('makes ids of only letters, digits, hyphens and underscores', () => {
    expect(traitLabelId('advantages', 'discipline:Blood "Song" \\ \'Echo\'')).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('keeps one trait on two steps apart', () => {
    expect(traitLabelId('advantages', 'background:Herd')).not.toBe(traitLabelId('finishing', 'background:Herd'));
  });
});
