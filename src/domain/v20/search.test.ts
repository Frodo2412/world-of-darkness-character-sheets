import { describe, expect, it } from 'vitest';
import { matchesQuery } from './search';

describe('matchesQuery', () => {
  it('ignores case on both sides', () => {
    expect(matchesQuery('ELOISE', 'Eloise Marchand')).toBe(true);
    expect(matchesQuery('eloise', 'ELOISE MARCHAND')).toBe(true);
  });

  it('ignores accents on both sides', () => {
    expect(matchesQuery('eloise', 'Éloïse')).toBe(true);
    expect(matchesQuery('Éloïse', 'eloise')).toBe(true);
  });

  it('ignores space around the query and between its words', () => {
    expect(matchesQuery('  blood   buff  ', 'Blood Buff')).toBe(true);
  });

  it('wants every word, each in some field', () => {
    expect(matchesQuery('celerity swift', 'Celerity', 'Swift as a viper')).toBe(true);
    expect(matchesQuery('celerity slow', 'Celerity', 'Swift as a viper')).toBe(false);
  });

  it('matches a word inside a longer one', () => {
    expect(matchesQuery('cele', 'Celerity')).toBe(true);
  });

  it('matches everything for an empty or blank query', () => {
    expect(matchesQuery('', 'anything')).toBe(true);
    expect(matchesQuery('   ')).toBe(true);
  });

  it('matches nothing when a word is in no field', () => {
    expect(matchesQuery('zzz', 'Celerity', 'Swift')).toBe(false);
  });

  it('skips a field that is not there', () => {
    expect(matchesQuery('swift', undefined, 'Swift as a viper')).toBe(true);
    expect(matchesQuery('swift', undefined)).toBe(false);
  });
});
