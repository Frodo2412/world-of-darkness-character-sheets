// Wording shared by the messages the creation rules write.

import { SCREENS, type ScreenId } from './rules';

/** "1 dot", "3 dots": a count with its noun in the right number. */
export const plural = (count: number, one: string, many = `${one}s`): string =>
  `${count} ${count === 1 ? one : many}`;

/** "primary" as "Primary". */
export const titleCase = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

/** 5 as "five": a small count in a sentence. A count with no word reads as digits. */
export const numberWord = (count: number): string => NUMBER_WORDS[count] ?? String(count);

/** "Physical", "Physical and Social", "Physical, Social and Mental". */
export const list = (items: readonly string[]): string =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/** "1 item left", "3 items left": how many outstanding items stand between a build and Finish. */
export const itemsLeftText = (count: number): string => `${plural(count, 'item')} left`;

/**
 * The words around a searchable list: "All Clans · 14" for its heading, and what is said to assistive
 * technology each time the search changes it, "14 clans listed" or `No clan matches "x".`.
 */
export function searchListWords(noun: string, pluralNoun: string, count: number, query: string): { heading: string; results: string } {
  return {
    heading: `All ${titleCase(pluralNoun)} · ${count}`,
    results: count === 0 ? `No ${noun} matches "${query.trim()}".` : `${plural(count, noun, pluralNoun)} listed`,
  };
}

/** What a value the player has not chosen yet reads. */
export const NOT_CHOSEN = 'Not chosen';

/** Why no Discipline dots can be placed before a clan is chosen: Continue's reason, the Disciplines card's and a refusal's. */
export const DISCIPLINES_NEED_CLAN = 'Choose a clan to place Discipline dots';

/** What a pool with no dots placed reads. */
export const NOT_ALLOCATED = 'Not allocated';

/** What the Blood Pool reads until the player records one. */
export const NOT_RECORDED = 'Not recorded';

/** The title a screen is shown under: in the sidebar, as its heading and in the page title. */
export const screenTitle = (id: ScreenId): string => SCREENS.find((screen) => screen.id === id)!.title;

/** Where a screen sits among the nine, from 0. */
export const screenIndex = (id: ScreenId): number => SCREENS.findIndex((screen) => screen.id === id);
