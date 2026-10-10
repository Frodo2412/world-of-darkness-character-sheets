import { expect, type Locator, type Page } from '@playwright/test';
import type { V20Character } from '../../../src/domain/v20/character';
import type { Haven, HavenKind, Merit, MeritCategory, Person } from '../../../src/domain/v20/dossier/types';
import { characterArranged, saveCharacters } from './seed';
import { openSavedSheet, enterEditMode } from './sheet';
import { openSheetTab, showTab, tabPanelOf } from './tabs';

// What the Backgrounds scenarios know about the tab: how to arrange a character from the words of a
// scenario, and where the tab's parts are.

const NAME = 'Marguerite';

/** The names the scenarios' unnamed-by-the-scenario backgrounds take, in the order of the rows. */
const BACKGROUND_NAMES = ['Allies', 'Contacts', 'Herd', 'Resources', 'Retainers', 'Status', 'Fame', 'Mentor'];

const COUNTS: Record<string, number> = { a: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
const countOf = (word: string): number => COUNTS[word.toLowerCase()];

/** The sections of the tab by the name a scenario gives them, and the key the panel's markup gives each. */
const SECTIONS: Record<string, string> = {
  Backgrounds: 'backgrounds',
  Havens: 'havens',
  Merits: 'merits',
  Flaws: 'flaws',
  'Other traits': 'otherTraits',
};

/** Where the next entry of each kind goes while a character is being arranged. */
interface Cursor {
  background: number;
}

/** "Camille Arnaud" (museum curator) and "Lucien Voss" (dockside fixer): the people a background has. */
export function peopleIn(text: string): Person[] {
  return [...text.matchAll(/"([^"]+)" \(([^)]+)\)/g)].map(([, name, role]) => ({ name, role }));
}

/** Puts a background in the next row, growing the list past six when the scenario names more. */
function putBackground(character: V20Character, cursor: Cursor, row: V20Character['backgrounds'][number]): void {
  character.backgrounds[cursor.background++] = row;
}

/** A haven from `described "..."`, `located "..."`, `access "..."` and `security "..."` clauses, each of which may be left out. */
function havenOf(kind: HavenKind, name: string, clauses: string): Haven {
  const clause = (word: string): string => clauses.match(new RegExp(`${word} "([^"]*)"`))?.[1] ?? '';
  return {
    name,
    kind,
    description: clause('described'),
    location: clause('located'),
    access: clause('access'),
    security: clause('security'),
  };
}

/**
 * Sets one thing a scenario says the character has: `Allies 2 summarised "...", noted "...", with the
 * people "A" (role) and "B" (role)`, "two named backgrounds", "four blank rows", "backgrounds", `a merit
 * "Acute Sense" (Physical, 1 point)` or a haven.
 */
function arrange(character: V20Character, part: string, cursor: Cursor): void {
  const detailed = part.match(/^(\w+) (\d+) summarised "([^"]*)"(?:, noted "([^"]*)")?(?:, with the people (.+))?$/);
  const named = part.match(/^(\w+) named backgrounds?$/);
  const pointed = part.match(/^an? (merit|flaw) "([^"]+)" \((\w+), (\d+) points?\)$/);
  const haven = part.match(/^an? (Primary|Secondary|Other) haven "([^"]+)"((?:,? (?:described|located|access|security) "[^"]*")*)$/);
  if (pointed !== null) {
    const entry: Merit = { name: pointed[2], category: pointed[3] as MeritCategory, points: Number(pointed[4]), note: '' };
    (pointed[1] === 'merit' ? character.merits : character.flaws).push(entry);
  } else if (haven !== null) {
    character.havens.push(havenOf(haven[1] as HavenKind, haven[2], haven[3]));
  } else if (detailed !== null) {
    const [, name, rating, summary, note, people] = detailed;
    putBackground(character, cursor, {
      name,
      rating: Number(rating),
      summary,
      ...(note === undefined ? {} : { note }),
      ...(people === undefined ? {} : { people: peopleIn(people) }),
    });
  } else if (named !== null) {
    for (let count = 0; count < countOf(named[1]); count += 1) {
      const place = cursor.background;
      putBackground(character, cursor, { name: BACKGROUND_NAMES[place], rating: (place % 5) + 1 });
    }
  } else if (part === 'backgrounds') {
    for (const [place, name] of ['Allies', 'Contacts'].entries()) putBackground(character, cursor, { name, rating: place + 2 });
  } else if (!/^\w+ blank rows$/.test(part)) {
    throw new Error(`a Backgrounds scenario cannot arrange "${part}"`);
  }
}

/** The start of one thing a scenario says a character has: what a comma or "and" must be followed by to separate two of them. */
const ITEM_START = '(?=(?:an? |one |two |three |four |five |six |seven |eight |the background ))';

/** What a scenario says when it wants a character with nothing on the tab. */
const NOTHING = 'no backgrounds, havens, merits, flaws or other traits';

/** A character made from the words of a scenario: "two named backgrounds and four blank rows". */
export function backgroundsCharacter(words: string): V20Character {
  if (words === NOTHING) return characterArranged({ name: NAME, clan: 'Toreador' }, () => {});
  const parts = words.split(new RegExp(`,\\s+${ITEM_START}|\\s+and\\s+${ITEM_START}`));
  return characterArranged({ name: NAME, clan: 'Toreador' }, (character) => {
    const cursor: Cursor = { background: 0 };
    for (const part of parts) arrange(character, part.trim(), cursor);
  });
}

/** Saves a character made from the words, as the scenario's character. */
export async function saveBackgroundsCharacter(page: Page, memory: { saved: V20Character[] }, words: string): Promise<void> {
  memory.saved = [backgroundsCharacter(words)];
  await saveCharacters(page, memory.saved);
}

/** Saves a character made from the words and opens its sheet, in edit mode when asked. */
export async function openBackgroundsCharacter(
  page: Page,
  memory: { saved: V20Character[] },
  words: string,
  mode: 'play' | 'edit',
): Promise<void> {
  memory.saved = [backgroundsCharacter(words)];
  await openSavedSheet(page, memory.saved[0]);
  if (mode === 'edit') await enterEditMode(page);
}

/** The tab's panel. */
export const backgroundsPanel = (page: Page): Locator => tabPanelOf(page, 'backgrounds');

/** Shows the Backgrounds tab: opens the sheet on it, or chooses it in the bar when the sheet is already open. */
export async function showBackgrounds(page: Page, memory: { saved: V20Character[] }): Promise<void> {
  if (new URL(page.url()).pathname.startsWith('/sheet/')) await showTab(page, 'Backgrounds');
  else await openSheetTab(page, memory.saved[0].id, 'Backgrounds');
  await expect(backgroundsPanel(page)).toBeVisible();
}

/** The cards of the Backgrounds section that are showing. */
export const backgroundCards = (page: Page): Locator =>
  backgroundsPanel(page).locator('[data-list="backgrounds"] > li').filter({ visible: true });

/** One background's card, found by the heading with its name. */
export const backgroundCard = (page: Page, name: string): Locator =>
  backgroundCards(page).filter({ has: page.getByRole('heading', { name, exact: true }) });

/** The section of the tab a scenario calls `name` ("Havens", "Other traits"). */
export function sectionNamed(page: Page, name: string): Locator {
  const key = SECTIONS[name];
  if (key === undefined) throw new Error(`the Backgrounds tab has no section called "${name}"`);
  return backgroundsPanel(page).locator(`[data-section="${key}"]`);
}

/** The cards of a section that are showing. */
export const cardsOf = (page: Page, section: string): Locator =>
  sectionNamed(page, section).locator('ul > li').filter({ visible: true });

/** The card of one entry of a section, found by the heading with its name. */
export const entryCard = (page: Page, section: string, name: string): Locator =>
  cardsOf(page, section).filter({ has: page.getByRole('heading', { name, exact: true }) });

/** The empty state of a section. */
export const emptyOf = (page: Page, section: string): Locator =>
  backgroundsPanel(page).locator(`[data-empty="${SECTIONS[section]}"]`);
