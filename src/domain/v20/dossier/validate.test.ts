import { describe, expect, test } from 'vitest';
import {
  validBackgrounds,
  validFlaws,
  validHavens,
  validMerits,
  validOtherTraits,
} from './validate';

const row = (extra: object = {}) => ({ name: '', rating: 0, ...extra });
const sixRows = () => Array.from({ length: 6 }, () => row());

describe('validBackgrounds', () => {
  test('accepts the six blank rows', () => {
    expect(validBackgrounds(sixRows())).toBe(true);
  });

  test('accepts more than six rows', () => {
    expect(validBackgrounds([...sixRows(), row({ name: 'Allies', rating: 2 }), row()])).toBe(true);
  });

  test('accepts rows with their details', () => {
    const detailed = row({ summary: 's', note: 'n', people: [{ name: 'Maria', role: 'Regnant' }] });
    expect(validBackgrounds([detailed, ...sixRows().slice(1)])).toBe(true);
  });

  test.each([
    ['fewer than six rows', sixRows().slice(1)],
    ['not a list', {}],
    ['a row without a rating', [...sixRows().slice(1), { name: 'x' }]],
    ['a summary that is not text', [row({ summary: 4 }), ...sixRows().slice(1)]],
    ['people that are not a list', [row({ people: 'Maria' }), ...sixRows().slice(1)]],
    ['a person without a role', [row({ people: [{ name: 'Maria' }] }), ...sixRows().slice(1)]],
  ])('rejects %s', (_description, value) => {
    expect(validBackgrounds(value)).toBe(false);
  });
});

describe.each([
  ['merits', validMerits],
  ['flaws', validFlaws],
])('%s', (_name, valid) => {
  const entry = { name: 'Eidetic Memory', category: 'Mental', points: 2, note: '' };

  test('accepts none and accepts entries', () => {
    expect(valid([])).toBe(true);
    expect(valid([entry])).toBe(true);
  });

  test.each([
    ['not a list', {}],
    ['an entry without points', [{ ...entry, points: undefined }]],
    ['points that are text', [{ ...entry, points: '2' }]],
    ['a category outside the four', [{ ...entry, category: 'Other' }]],
    ['an entry that is text', ['Eidetic Memory']],
  ])('rejects %s', (_description, value) => {
    expect(valid(value)).toBe(false);
  });
});

describe('validOtherTraits', () => {
  const trait = { name: 'Fame', kind: 'Status', note: '' };

  test('accepts a trait with or without a rating', () => {
    expect(validOtherTraits([trait, { ...trait, rating: 3 }])).toBe(true);
  });

  test.each([
    ['a rating that is text', [{ ...trait, rating: '3' }]],
    ['no kind', [{ name: 'Fame', note: '' }]],
    ['not a list', null],
  ])('rejects %s', (_description, value) => {
    expect(validOtherTraits(value)).toBe(false);
  });
});

describe('validHavens', () => {
  const haven = {
    name: 'Cellar',
    kind: 'Primary',
    description: '',
    location: '',
    access: '',
    security: '',
  };

  test('accepts havens', () => {
    expect(validHavens([haven])).toBe(true);
  });

  test.each([
    ['a kind outside the three', [{ ...haven, kind: 'Tertiary' }]],
    ['a missing security field', [{ ...haven, security: undefined }]],
    ['not a list', 'Cellar'],
  ])('rejects %s', (_description, value) => {
    expect(validHavens(value)).toBe(false);
  });
});
