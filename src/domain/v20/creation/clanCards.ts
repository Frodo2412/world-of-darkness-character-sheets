// What the Clan screen shows: a card for each clan, the cards a search keeps, and the detail of the chosen
// clan. The Disciplines are the rules' (CLANS); the one-line descriptions and notes here are original,
// written for this builder.

import { matchByName } from './catalogue';
import { clanDisciplinesOf, traitLabel } from './ratings';
import { CLAN_FIXED_TRAITS, CLAN_NAMES, type ClanName } from './rules';
import { list, searchListWords } from './wording';

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

// The fixed traits are keyed by trait ref; the type comes from `traitLabel`, as the layer map keeps this file off `build`.
type TraitRef = Parameters<typeof traitLabel>[0];

type FixedTraits = Readonly<Partial<Record<ClanName, Readonly<Record<string, number>>>>>;

const labelsOf = (traits: Readonly<Record<string, number>>): string[] => Object.keys(traits).map((ref) => traitLabel(ref as TraitRef));

/** What a clan's fixed traits say in its detail: "Appearance is fixed at 0." */
export const fixedTraitRule = (traits: Readonly<Record<string, number>>): string =>
  `${list(Object.entries(traits).map(([ref, rating]) => `${traitLabel(ref as TraitRef)} is fixed at ${rating}`))}.`;

/** The note every clan's detail carries: only the clans that fix a trait touch the creation numbers. */
export function creationRuleNote(fixed: FixedTraits): string {
  const rules = Object.entries(fixed)
    .filter(([, traits]) => Object.keys(traits).length > 0)
    .map(([clan, traits]) => `${clan}'s ${list(labelsOf(traits))} rule`);
  return `Only ${list(rules)} ${rules.length === 1 ? 'changes' : 'change'} creation arithmetic.`;
}

/** Said in the detail of every chosen clan. */
export const CREATION_RULE_NOTE = creationRuleNote(CLAN_FIXED_TRAITS);

/** Said beside the list, for a player who is unsure: Caitiff is a choice, not an empty answer. */
export const CAITIFF_NOTE = {
  heading: 'Not sure yet?',
  text: 'Caitiff is a clan choice distinct from leaving the clan unchosen.',
} as const;

/** The question's opening line when a switch to `clan` would remove something. */
export const switchQuestion = (clan: string): string => `Switching to ${clan}:`;

/** The button that answers a switch question by switching to `clan`. */
export const switchLabel = (clan: string): string => `Switch to ${clan}`;

/** The button that answers a switch question by keeping the chosen clan; '' is no clan chosen yet. */
export const keepLabel = (chosen: string): string => `Keep ${chosen === '' ? 'no clan' : chosen}`;

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
  const fixed = CLAN_FIXED_TRAITS[card.name];
  return {
    name: card.name,
    line: card.line,
    disciplines: disciplines.length === 0 ? 'any' : disciplines,
    ...(fixed === undefined || Object.keys(fixed).length === 0 ? {} : { rule: fixedTraitRule(fixed) }),
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
  return {
    cards,
    selected: `Selected · ${chosen === '' ? 0 : 1}/1`,
    ...searchListWords('clan', 'clans', cards.length, query),
  };
}
