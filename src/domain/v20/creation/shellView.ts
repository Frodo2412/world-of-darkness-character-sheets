// What the builder's shell says about the build: the identity bar and the "Your character" panel.
// Pure reads over the build; the page draws what these return and judges nothing itself.

import { allotmentStates, type AllotmentState } from './allotments';
import { composeConcept, type V20Build } from './build';
import { freebieReport, traitReport } from './progress';
import { RANKS, SCREENS, type Rank, type ScreenId } from './rules';

const UNNAMED = 'Unnamed character';
const NOT_CHOSEN = 'Not chosen';
const NOT_ALLOCATED = 'Not allocated';
const SEPARATOR = ' · ';

/** The product's name beside the chronicle in the top bar. */
const PRODUCT = 'Character builder';

export interface Identity {
  /** The character's name, or "Unnamed character". */
  name: string;
  /** One or two letters for the avatar; "?" while there is no name to take them from. */
  initials: string;
  /** Clan · concept · chronicle, whichever are set. Empty when none is. */
  subtitle: string;
  /** The chronicle alone, trimmed; empty when none is set. */
  chronicle: string;
  /** "<Chronicle> / Character builder", or "Character builder" with no chronicle. */
  topBar: string;
  /** "Nature / Demeanor" as the identity bar reads it. */
  natureDemeanor: string;
}

const trimmed = (text: string): string => text.trim();

/** The first letter or digit of `word`, with the marks that follow it; undefined for a word made of neither. */
const firstLetter = (word: string): string | undefined => word.match(/[\p{L}\p{N}]\p{M}*/u)?.[0];

/** The first letters of the first and last words, so "Éloïse Voss" is ÉV and one word is one letter. */
export function initialsOf(name: string): string {
  const letters = trimmed(name)
    .split(/\s+/)
    .map(firstLetter)
    .filter((letter): letter is string => letter !== undefined);
  if (letters.length === 0) return '?';
  const chosen = letters.length === 1 ? [letters[0]] : [letters[0], letters[letters.length - 1]];
  return chosen.join('').toLocaleUpperCase();
}

function natureDemeanorOf(build: V20Build): string {
  const nature = trimmed(build.concept.nature);
  const demeanor = trimmed(build.concept.demeanor);
  if (nature === '' && demeanor === '') return NOT_CHOSEN;
  return `${nature || NOT_CHOSEN} / ${demeanor || NOT_CHOSEN}`;
}

export function identityOf(build: V20Build): Identity {
  const name = trimmed(build.concept.name);
  const chronicle = trimmed(build.concept.chronicle);
  const subtitle = [build.clan, composeConcept(build.concept.conceptKind, build.concept.concept), build.concept.chronicle]
    .map(trimmed)
    .filter((part) => part !== '')
    .join(SEPARATOR);
  return {
    name: name || UNNAMED,
    initials: initialsOf(name),
    subtitle,
    chronicle,
    topBar: chronicle === '' ? PRODUCT : `${chronicle} / ${PRODUCT}`,
    natureDemeanor: natureDemeanorOf(build),
  };
}

/** The rows of the "Your character" panel, in order, with the words each is labelled by. */
export const PANEL_ROWS = [
  { key: 'concept', label: 'Concept' },
  { key: 'clan', label: 'Clan' },
  { key: 'natureDemeanor', label: 'Nature / Demeanor' },
  { key: 'attributes', label: 'Attributes' },
  { key: 'abilities', label: 'Abilities' },
  { key: 'advantages', label: 'Advantages' },
  { key: 'freebies', label: 'Freebie points' },
  { key: 'humanity', label: 'Humanity' },
  { key: 'willpower', label: 'Willpower' },
] as const;

export type PanelRowKey = (typeof PANEL_ROWS)[number]['key'];

export interface CharacterRow {
  key: PanelRowKey;
  label: string;
  value: string;
  /** Humanity and Willpower are also drawn as dots. */
  dots?: { filled: number; max: number };
}

const rankOrder = (rank: Rank | ''): number => (rank === '' ? RANKS.length : RANKS.indexOf(rank));

/** "Social 7 · Mental 5 · Physical 3": the dots placed in each pool, the first-ranked pool first. */
function poolsText(pools: AllotmentState[]): string {
  if (pools.every((pool) => pool.placed === 0)) return NOT_ALLOCATED;
  return [...pools]
    .sort((a, b) => rankOrder(a.rank) - rankOrder(b.rank))
    .map((pool) => `${pool.label} ${pool.placed}`)
    .join(SEPARATOR);
}

const poolsOn = (build: V20Build, screen: ScreenId): AllotmentState[] =>
  allotmentStates(build).filter((state) => state.step === screen);

const screenIndex = (screen: ScreenId): number => SCREENS.findIndex((entry) => entry.id === screen);

/** Humanity and Willpower join the panel from Finishing touches on. */
const showsVirtueTotals = (screen: ScreenId): boolean => screenIndex(screen) >= screenIndex('finishing');

function dotsRow(build: V20Build, key: 'humanity' | 'willpower', label: string): CharacterRow {
  const { rating, max } = traitReport(build, key);
  return { key, label, value: String(rating), dots: { filled: rating, max } };
}

/** The panel's rows for the build, as seen from `screen`. */
export function characterRows(build: V20Build, screen: ScreenId): CharacterRow[] {
  const { remaining } = freebieReport(build);
  const values: Record<Exclude<PanelRowKey, 'humanity' | 'willpower'>, string> = {
    concept: composeConcept(build.concept.conceptKind, build.concept.concept) || NOT_CHOSEN,
    clan: build.clan || NOT_CHOSEN,
    natureDemeanor: natureDemeanorOf(build),
    attributes: poolsText(poolsOn(build, 'attributes')),
    abilities: poolsText(poolsOn(build, 'abilities')),
    advantages: poolsText(poolsOn(build, 'advantages')),
    freebies: remaining >= 0 ? `${remaining} remaining` : `Overspent by ${-remaining}`,
  };
  return PANEL_ROWS.flatMap(({ key, label }): CharacterRow[] => {
    if (key === 'humanity' || key === 'willpower') return showsVirtueTotals(screen) ? [dotsRow(build, key, label)] : [];
    return [{ key, label, value: values[key] }];
  });
}
