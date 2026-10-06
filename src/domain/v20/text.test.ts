import { describe, expect, test } from 'vitest';
import { folded, withoutAccents } from './text';

describe('folded', () => {
  test('trims surrounding space', () => {
    expect(folded('  The Glass City \t')).toBe('the glass city');
  });

  test('ignores case', () => {
    expect(folded('TOREADOR')).toBe(folded('toreador'));
  });

  test('removes accents', () => {
    expect(folded('Éloïse Voss')).toBe('eloise voss');
  });

  test('keeps space inside the text', () => {
    expect(folded('Glass  City')).toBe('glass  city');
  });

  test('is empty for blank text', () => {
    expect(folded('')).toBe('');
    expect(folded('   ')).toBe('');
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
