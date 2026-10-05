import { describe, expect, test } from 'vitest';
import { blankCharacter, setHeaderField } from './character';
import {
  generationLabel,
  generationNumber,
  identitySummary,
  monogram,
  namedRows,
  ordinal,
  temperament,
} from './identity';
import type { HeaderField } from './traits';

describe('ordinal', () => {
  test.each([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [10, '10th'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
    [21, '21st'],
    [22, '22nd'],
    [23, '23rd'],
    [101, '101st'],
    [111, '111th'],
  ])('%i is %s', (n, expected) => {
    expect(ordinal(n)).toBe(expected);
  });
});

describe('generationNumber', () => {
  test.each([
    ['10', 10],
    ['10th', 10],
    ['3rd', 3],
    [' 9th generation ', 9],
    ['between 8 and 9', 8],
  ])('reads %j as %i', (text, expected) => {
    expect(generationNumber(text)).toBe(expected);
  });

  test.each(['', '   ', 'banana'])('finds no number in %j', (text) => {
    expect(generationNumber(text)).toBeUndefined();
  });
});

describe('generationLabel', () => {
  test.each([
    ['10', '10th generation'],
    ['10th', '10th generation'],
    ['3rd', '3rd generation'],
    ['  12 ', '12th generation'],
  ])('words %j as %j', (text, expected) => {
    expect(generationLabel(text)).toBe(expected);
  });

  test('keeps the trimmed text when no number is readable', () => {
    expect(generationLabel('  banana ')).toBe('banana');
  });

  test('is empty for blank text', () => {
    expect(generationLabel('')).toBe('');
    expect(generationLabel('   ')).toBe('');
  });
});

describe('monogram', () => {
  test('takes the first letters of the first and last words', () => {
    expect(monogram('Éloïse Voss')).toBe('EV');
    expect(monogram('Maria de la Cruz')).toBe('MC');
  });

  test('is one letter for a single word', () => {
    expect(monogram('Lucita')).toBe('L');
  });

  test('removes diacritics and upper-cases', () => {
    expect(monogram('émile zola')).toBe('EZ');
  });

  test('ignores surrounding and repeated whitespace', () => {
    expect(monogram('  Ana   Ruiz  ')).toBe('AR');
  });

  test('keeps Hangul syllables whole', () => {
    expect(monogram('김 민준')).toBe('김민');
  });

  test('skips quotes around a nickname', () => {
    expect(monogram('"Mad" Jack')).toBe('MJ');
  });

  test('takes only the first and last of three words', () => {
    expect(monogram('Anne Marie Lopez')).toBe('AL');
  });

  test('is empty for a blank name', () => {
    expect(monogram('')).toBe('');
    expect(monogram('   ')).toBe('');
  });
});

describe('identitySummary', () => {
  const withHeader = (fields: Partial<Record<HeaderField, string>>) =>
    (Object.entries(fields) as [HeaderField, string][]).reduce(
      (character, [key, value]) => setHeaderField(character, key, value),
      blankCharacter('c1'),
    );

  test('joins clan, generation label and concept', () => {
    const character = withHeader({ clan: 'Toreador', generation: '10th', concept: 'Antiquarian' });
    expect(identitySummary(character)).toBe('Toreador · 10th generation · Antiquarian');
  });

  test('leaves out the parts that are blank', () => {
    expect(identitySummary(withHeader({ clan: 'Brujah', generation: '' }))).toBe('Brujah');
    expect(identitySummary(withHeader({ clan: 'Brujah', generation: 'banana' }))).toBe('Brujah · banana');
    expect(identitySummary(withHeader({ concept: ' Fixer ' }))).toBe('Fixer');
  });

  test('is empty when nothing is entered', () => {
    expect(identitySummary(blankCharacter('c1'))).toBe('');
  });
});

describe('temperament', () => {
  const withHeader = (fields: Partial<Record<HeaderField, string>>) =>
    (Object.entries(fields) as [HeaderField, string][]).reduce(
      (character, [key, value]) => setHeaderField(character, key, value),
      blankCharacter('c1'),
    );

  test('joins nature and demeanor', () => {
    expect(temperament(withHeader({ nature: 'Architect', demeanor: ' Judge ' }))).toBe('Architect / Judge');
  });

  test('shows the one that is entered', () => {
    expect(temperament(withHeader({ nature: 'Architect' }))).toBe('Architect');
    expect(temperament(withHeader({ demeanor: 'Judge' }))).toBe('Judge');
  });

  test('is empty when neither is entered', () => {
    expect(temperament(withHeader({ nature: '  ' }))).toBe('');
    expect(temperament(blankCharacter('c1'))).toBe('');
  });
});

describe('namedRows', () => {
  test('keeps the rows with a name, in order, with their ratings', () => {
    const rows = [
      { name: 'Dominate', rating: 3 },
      { name: '', rating: 0 },
      { name: 'Potence', rating: 1 },
    ];
    expect(namedRows(rows)).toEqual([
      { name: 'Dominate', rating: 3 },
      { name: 'Potence', rating: 1 },
    ]);
  });

  test('drops a row whose name is only spaces, whatever its rating', () => {
    expect(namedRows([{ name: '   ', rating: 4 }])).toEqual([]);
  });

  test('keeps a named row rated zero and trims its name', () => {
    expect(namedRows([{ name: '  Hobby Talent ', rating: 0 }])).toEqual([{ name: 'Hobby Talent', rating: 0 }]);
  });

  test('is empty when there are no rows', () => {
    expect(namedRows([])).toEqual([]);
  });
});
