import { describe, expect, test } from 'vitest';
import { caseFolded, folded, withoutAccents } from './text';

describe('folded', () => {
  test('trims surrounding space', () => {
    expect(folded('  The Glass City \t')).toBe('the glass city');
  });

  test('ignores case', () => {
    expect(folded('TOREADOR')).toBe('toreador');
  });

  test('removes accents', () => {
    expect(folded('Éloïse Voss')).toBe('eloise voss');
  });

  test('removes accents written as a letter and a combining mark', () => {
    expect(folded('e\u0301')).toBe('e');
  });

  test('keeps space inside the text', () => {
    expect(folded('Glass  City')).toBe('glass  city');
  });

  test('is empty for blank text', () => {
    expect(folded('')).toBe('');
    expect(folded('   ')).toBe('');
  });
});

describe('caseFolded', () => {
  test('trims surrounding space and ignores case', () => {
    expect(caseFolded(' The Glass City ')).toBe('the glass city');
    expect(caseFolded('THE GLASS CITY')).toBe('the glass city');
  });

  test('keeps accents: "Élysée" is not "Elysee"', () => {
    expect(caseFolded('Élysée')).toBe('élysée');
    expect(caseFolded('Élysée')).not.toBe(caseFolded('Elysee'));
  });

  test('keeps space inside the text', () => {
    expect(caseFolded('Glass  City')).toBe('glass  city');
  });

  test('is empty for blank text', () => {
    expect(caseFolded('   ')).toBe('');
  });

  test('reads an accented letter alike whether it is one character or a letter and a mark', () => {
    expect(caseFolded('\u00c9lys\u00e9e')).toBe(caseFolded('E\u0301lyse\u0301e'));
  });

  test('still tells an accented letter from a plain one', () => {
    expect(caseFolded('\u00c9lys\u00e9e')).not.toBe(caseFolded('Elysee'));
  });
});

describe('withoutAccents', () => {
  test('keeps case and surrounding space', () => {
    expect(withoutAccents(' Émile ')).toBe(' Emile ');
  });

  test('keeps Hangul syllables whole', () => {
    expect(withoutAccents('김민준')).toBe('김민준');
  });
});
