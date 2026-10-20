// What the Clan screen shows: a card for each clan, the cards a search keeps, and the detail of the chosen
// clan. The Disciplines are the rules' (CLANS); the one-line descriptions and notes here are original,
// written for this builder.

import { matchByName } from './catalogue';
import { clanDisciplinesOf } from './ratings';
import { CLAN_NAMES, type ClanName } from './rules';

export interface ClanCard {
  name: ClanName;
  /** A short original line shown on the card and in the detail. */
  line: string;
}

// A Record, so a clan added to the rules cannot be left without its line.
const LINES: Record<ClanName, string> = {
  Assamite: 'Silent killers for hire, bound to an ancient creed.',
  Brujah: 'Passionate rebels quick to fight for an ideal.',
  'Follower of Set': 'Serpent-cult tempters trading in vice and forbidden bargains.',
  Gangrel: 'Wanderers kin to beasts, at home far from cities.',
  Giovanni: 'Necromancers bound by family, money and the dead.',
  Lasombra: 'Proud nobles ruling through shadow and ambition.',
  Malkavian: 'Seers touched by madness, speaking truths in riddles.',
  Nosferatu: 'Disfigured brokers of secrets, hidden beneath the city.',
  Ravnos: 'Wandering illusionists and tricksters, forever on the road.',
  Toreador: 'Artists and aesthetes devoted to beauty and passion.',
  Tremere: 'Scholars of blood sorcery in a strict hierarchy.',
  Tzimisce: 'Territorial fiends reshaping flesh and mind at will.',
  Ventrue: 'Aristocrats of the night, born to command.',
  Caitiff: 'Outcasts of no clan, free to learn any Discipline.',
};

/** Every clan, in the order the rules list them. */
export const CLAN_CARDS: readonly ClanCard[] = CLAN_NAMES.map((name) => ({ name, line: LINES[name] }));

/** The clans whose name holds `query`, ignoring case and the space around it; every clan for a blank query. */
export const clanCards = (query: string): ClanCard[] => matchByName(CLAN_CARDS, query);

/** What the detail says in place of Caitiff's Disciplines, which are not fixed. */
export const ANY_DISCIPLINE = 'Any Discipline';

/** Said in the detail of every chosen clan: only one clan's rule touches the creation numbers. */
export const CREATION_RULE_NOTE = "Only Nosferatu's Appearance rule changes creation arithmetic.";

/** Said beside the list, for a player who is unsure: Caitiff is a choice, not an empty answer. */
export const CAITIFF_NOTE = {
  heading: 'Not sure yet?',
  text: 'Caitiff is a clan choice distinct from leaving the clan unchosen.',
} as const;

export interface ClanDetail {
  name: ClanName;
  line: string;
  /** The clan's three Disciplines, or `'any'` for Caitiff. */
  disciplines: readonly string[] | 'any';
  /** The clan's own creation rule, when it has one. */
  rule?: string;
  note: string;
}

/** The detail of the clan called `name`; undefined for no clan or a name that is not one. */
export function clanDetail(name: string): ClanDetail | undefined {
  const card = CLAN_CARDS.find((entry) => entry.name === name);
  if (card === undefined) return undefined;
  const disciplines = clanDisciplinesOf(name);
  return {
    name: card.name,
    line: card.line,
    disciplines: disciplines.length === 0 ? 'any' : disciplines,
    ...(name === 'Nosferatu' ? { rule: 'Appearance is fixed at 0.' } : {}),
    note: CREATION_RULE_NOTE,
  };
}

export interface ClanListView {
  cards: ClanCard[];
  /** "All Clans · 14": the clans the search keeps. */
  heading: string;
  /** "Selected · 0/1": one clan is chosen of one that can be. */
  selected: string;
  /** Said to assistive technology each time the search changes the list. */
  results: string;
}

/** The list for a search `query`, with the clan `chosen` ('' for none). */
export function clanListView(query: string, chosen: string): ClanListView {
  const cards = clanCards(query);
  const count = cards.length;
  return {
    cards,
    heading: `All Clans · ${count}`,
    selected: `Selected · ${chosen === '' ? 0 : 1}/1`,
    results: count === 0 ? `No clan matches "${query.trim()}".` : `${count} ${count === 1 ? 'clan' : 'clans'} listed`,
  };
}
