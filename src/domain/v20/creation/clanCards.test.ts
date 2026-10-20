import { describe, expect, test } from 'vitest';
import {
  ANY_DISCIPLINE,
  CAITIFF_NOTE,
  CLAN_CARDS,
  CREATION_RULE_NOTE,
  clanCards,
  clanDetail,
  clanListView,
  creationRuleNote,
  fixedTraitRule,
  keepLabel,
  switchLabel,
  switchQuestion,
} from './clanCards';
import { CLANS, CLAN_FIXED_TRAITS, CLAN_NAMES } from './rules';

const words = (line: string): string[] => line.split(/\s+/).filter(Boolean);
const names = (cards: readonly { name: string }[]): string[] => cards.map((card) => card.name);

/** Any pronoun at all, including the relative ones: the lines name roles and acts, never a person. */
const PRONOUN =
  /\b(?:i|me|my|mine|myself|we|us|our|ours|ourselves|you|your|yours|yourself|he|him|his|himself|she|her|hers|herself|it|its|itself|they|them|their|theirs|themselves|who|whom|whose|which|that|this|these|those)\b/i;

describe('the clan cards', () => {
  test('are the thirteen clans and Caitiff, in the rules order', () => {
    expect(names(CLAN_CARDS)).toEqual([...CLAN_NAMES]);
    expect(CLAN_CARDS).toHaveLength(14);
  });

  test.each(CLAN_CARDS)('$name has an original one-liner of at most twelve words, with no pronoun', ({ line }) => {
    expect(line.trim()).not.toBe('');
    expect(words(line).length).toBeLessThanOrEqual(12);
    expect(line).not.toMatch(PRONOUN);
  });

  test('no two share a line', () => {
    expect(new Set(CLAN_CARDS.map((card) => card.line)).size).toBe(CLAN_CARDS.length);
  });

  test.each([CAITIFF_NOTE.heading, CAITIFF_NOTE.text, CREATION_RULE_NOTE])('the note %j has no pronoun and is short', (note) => {
    expect(note).not.toMatch(PRONOUN);
    expect(words(note).length).toBeLessThanOrEqual(12);
  });
});

describe('searching the clans', () => {
  test.each(['', '   '])('lists all fourteen for the blank query %j', (query) => {
    expect(clanCards(query)).toHaveLength(14);
  });

  test.each([
    ['ven', ['Ventrue']],
    ['VEN', ['Ventrue']],
    ['  tor  ', ['Toreador']],
    ['ra', ['Lasombra', 'Nosferatu', 'Ravnos']],
    ['of set', ['Follower of Set']],
  ])('keeps the clans holding %j, in the rules order', (query, expected) => {
    expect(names(clanCards(query))).toEqual(expected);
  });

  test('keeps nothing for a query no clan holds', () => {
    expect(clanCards('zzz')).toEqual([]);
  });
});

describe('the list summary', () => {
  test('counts the listed clans and the chosen one', () => {
    expect(clanListView('', '')).toMatchObject({ heading: 'All Clans · 14', selected: 'Selected · 0/1', results: '14 clans listed' });
    expect(clanListView('', 'Toreador').selected).toBe('Selected · 1/1');
  });

  test('counts a search, and a chosen clan the search hides', () => {
    expect(clanListView('ven', 'Toreador')).toMatchObject({ heading: 'All Clans · 1', selected: 'Selected · 1/1', results: '1 clan listed' });
    expect(names(clanListView('ven', '').cards)).toEqual(['Ventrue']);
  });

  test('says that no clan matches, with the query as entered but trimmed', () => {
    expect(clanListView('  zzz ', '')).toMatchObject({ heading: 'All Clans · 0', results: 'No clan matches "zzz".' });
  });
});

describe('the clan detail', () => {
  test.each(CLANS.filter((clan) => clan.name !== 'Caitiff'))('$name lists the Disciplines the rules give it', ({ name, disciplines }) => {
    expect(clanDetail(name)?.disciplines).toEqual(disciplines);
  });

  test('Toreador has Auspex, Celerity and Presence', () => {
    expect(clanDetail('Toreador')?.disciplines).toEqual(['Auspex', 'Celerity', 'Presence']);
  });

  test('Caitiff has any Discipline', () => {
    expect(clanDetail('Caitiff')?.disciplines).toBe('any');
    expect(ANY_DISCIPLINE).toBe('Any Discipline');
  });

  test('only Nosferatu carries a rule of its own, and every clan carries the creation note', () => {
    expect(clanDetail('Nosferatu')?.rule).toBe('Appearance is fixed at 0.');
    for (const { name } of CLAN_CARDS.filter((card) => card.name !== 'Nosferatu')) expect(clanDetail(name)?.rule).toBeUndefined();
    for (const { name } of CLAN_CARDS) expect(clanDetail(name)?.note).toBe(CREATION_RULE_NOTE);
  });

  test('says, for the current rules data, that only Nosferatu changes creation arithmetic', () => {
    expect(CREATION_RULE_NOTE).toBe("Only Nosferatu's Appearance rule changes creation arithmetic.");
  });

  test('gives a rule to exactly the clans the rules fix a trait for', () => {
    const ruled = CLAN_NAMES.filter((name) => clanDetail(name)?.rule !== undefined);
    expect(ruled).toEqual(CLAN_NAMES.filter((name) => Object.keys(CLAN_FIXED_TRAITS[name] ?? {}).length > 0));
  });

  test('carries the clan and its line', () => {
    expect(clanDetail('Gangrel')).toMatchObject({ name: 'Gangrel', line: CLAN_CARDS.find((card) => card.name === 'Gangrel')!.line });
  });

  test.each(['', 'Vampire', 'toreador'])('has no detail for %j', (name) => {
    expect(clanDetail(name)).toBeUndefined();
  });
});

describe('the label of the button that keeps the current clan', () => {
  test('names the clan kept', () => {
    expect(keepLabel('Toreador')).toBe('Keep Toreador');
  });

  test('says so when no clan is chosen, rather than ending on a space', () => {
    expect(keepLabel('')).toBe('Keep no clan');
  });
});

describe('the words of a clan switch question', () => {
  test('ask about the clan switched to and offer to switch to it', () => {
    expect(switchQuestion('Gangrel')).toBe('Switching to Gangrel:');
    expect(switchLabel('Gangrel')).toBe('Switch to Gangrel');
  });
});

describe('the creation rules derived from the fixed traits', () => {
  test('a clan\'s rule names each trait it fixes and the rating', () => {
    expect(fixedTraitRule({ 'attribute:appearance': 0 })).toBe('Appearance is fixed at 0.');
    expect(fixedTraitRule({ 'attribute:appearance': 0, 'ability:alertness': 2 })).toBe('Appearance is fixed at 0 and Alertness is fixed at 2.');
  });

  test('the note names every clan that fixes a trait, and the traits', () => {
    expect(creationRuleNote({ Nosferatu: { 'attribute:appearance': 0 } })).toBe("Only Nosferatu's Appearance rule changes creation arithmetic.");
    expect(creationRuleNote({ Nosferatu: { 'attribute:appearance': 0 }, Brujah: { 'ability:alertness': 2 } })).toBe(
      "Only Nosferatu's Appearance rule and Brujah's Alertness rule change creation arithmetic.",
    );
  });

  test('a clan with nothing fixed is left out', () => {
    expect(creationRuleNote({ Nosferatu: { 'attribute:appearance': 0 }, Brujah: {} })).toBe("Only Nosferatu's Appearance rule changes creation arithmetic.");
  });
});
