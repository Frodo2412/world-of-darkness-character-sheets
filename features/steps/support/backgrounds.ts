import { expect, type Locator, type Page } from '@playwright/test';
import { memoryFor, type ScenarioMemory } from '../fixtures';
import type { V20Character } from '../../../src/domain/v20/character';
import type { Haven, HavenKind, Merit, MeritCategory, OtherTrait, Person } from '../../../src/domain/v20/dossier/types';
import { characterArranged, saveCharacters } from './seed';
import { openSavedSheet, enterEditMode } from './sheet';
import { openSheetTab, showTab, tabPanelOf } from './tabs';

// What the Backgrounds scenarios know about the tab: how to arrange a character from the words of a
// scenario, and where the tab's parts are.

const NAME = 'Marguerite';

/** The names the scenarios' unnamed-by-the-scenario backgrounds take, in the order of the rows. */
const BACKGROUND_NAMES = ['Allies', 'Contacts', 'Herd', 'Resources', 'Retainers', 'Status', 'Fame', 'Mentor'];

/** "the second being ..." names the row a background goes in. */
const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];

const COUNTS: Record<string, number> = { a: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
export const countOf = (word: string): number => COUNTS[word.toLowerCase()];

/** The kind of entry a section holds, by the name a scenario gives the section. */
const KINDS: Record<string, string> = { Havens: 'haven', Merits: 'merit', Flaws: 'flaw', 'Other traits': 'other trait' };

/** The section a kind of entry is listed in. */
const SECTION_OF: Record<string, string> = { haven: 'Havens', merit: 'Merits', flaw: 'Flaws', 'other trait': 'Other traits' };

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

/** Text with no place to break, as long as a phone is narrow. */
const LONG = 'Supercalifragilisticexpialidocious'.repeat(2);

/** Gives every entry of every section long unbroken text, to see whether the tab keeps it inside the screen. */
function crowd(character: V20Character): void {
  for (const row of character.backgrounds) {
    Object.assign(row, { name: LONG, summary: LONG, note: LONG, people: [{ name: LONG, role: LONG }] });
  }
  for (const haven of character.havens) Object.assign(haven, { name: LONG, description: LONG, location: LONG, access: LONG, security: LONG });
  for (const entry of [...character.merits, ...character.flaws]) Object.assign(entry, { name: LONG, note: LONG });
  for (const trait of character.otherTraits) Object.assign(trait, { name: LONG, kind: LONG, note: LONG });
}

/** The names a scenario's counted entries ("two havens") are given, in order. */
const ENTRY_NAMES = {
  haven: ['The Orangery', 'Rue Mouffetard flat', 'The Cellar'],
  merit: ['Acute Sense', 'Eidetic Memory', 'Iron Will'],
  flaw: ['Hunted', 'Dark Secret', 'Enemy'],
  'other trait': ['Languages', 'Hobby', 'Pet'],
};

/** The Merits or the Flaws of the character. */
const pointedList = (character: V20Character, kind: string): Merit[] => (kind === 'merit' ? character.merits : character.flaws);

/** Adds the `place`th entry of the kind a scenario counts ("two havens", "three other traits"), under `called` when given. */
function addCounted(character: V20Character, kind: string, place: number, called?: string): void {
  const name = called ?? ENTRY_NAMES[kind as keyof typeof ENTRY_NAMES][place];
  if (kind === 'haven') character.havens.push(havenOf('Other', name, ''));
  else if (kind === 'other trait') character.otherTraits.push({ name, kind: '', note: '' });
  else (kind === 'merit' ? character.merits : character.flaws).push({ name, category: 'Physical', points: 1, note: '' });
}

/** Adds an entry of the kind with every field it has filled in, so that putting it back can be checked field by field. */
function fillEntry(character: V20Character, kind: string, name: string): void {
  if (kind === 'haven') {
    character.havens.push({ name, kind: 'Secondary', description: 'A glassed-in greenhouse', location: 'Quai de la Tournelle', access: 'Back stair only', security: 'Two ghouls' });
  } else if (kind === 'other trait') {
    character.otherTraits.push({ name, rating: 4, kind: 'Skill', note: 'French · native' });
  } else {
    pointedList(character, kind).push({ name, category: 'Supernatural', points: 3, note: `Note on ${name}` });
  }
}

/**
 * Sets one thing a scenario says the character has: `Allies 2 summarised "...", noted "...", with the
 * people "A" (role) and "B" (role)`, "two named backgrounds", "four blank rows", "backgrounds", `a merit
 * "Acute Sense" (Physical, 1 point)`, a haven, `an unrated other trait "Languages" of kind "Skill" noted
 * "French · native"`, or a count of entries ("two havens", "one flaw").
 */
function arrange(character: V20Character, part: string, cursor: Cursor): void {
  const detailed = part.match(
    /^(?:the (\w+) being )?(\w+) (\d+) summarised "([^"]*)"(?:, noted "([^"]*)")?(?:,? with (?:the people|one person) (.+))?$/,
  );
  const named = part.match(/^(\w+) named backgrounds?$/);
  const pointed = part.match(/^an? (merit|flaw) "([^"]+)" \((\w+), (\d+) points?\)$/);
  const other = part.match(/^an unrated other trait "([^"]+)" of kind "([^"]*)" noted "([^"]*)"$/);
  const counted = part.match(/^(\w+) (havens?|merits?|flaws?|other traits?)$/);
  const haven = part.match(/^an? (Primary|Secondary|Other) haven "([^"]+)"((?:,? (?:described|located|access|security) "[^"]*")*)$/);
  const entry = part.match(/^one (merit|flaw) "([^"]+)" of (\d+) points?$/);
  const filled = part.match(/^one (haven|merit|flaw|other trait) "([^"]+)" with every field filled$/);
  const earlier = part.match(/^one named entry in "([^"]+)"$/);
  const ofPoints = part.match(/^an? (merit|flaw) of (\d+) points?$/);
  const rated = part.match(/^the background (\w+) (\d+)$/);
  const nameless = part === 'a background row holding a note but no name';
  if (part === 'all with very long names') {
    crowd(character);
    return;
  }
  const backgroundsNamed = part.match(/^(\w+) backgrounds$/);
  if (entry !== null) {
    pointedList(character, entry[1]).push({ name: entry[2], category: 'Social', points: Number(entry[3]), note: `Note on ${entry[2]}` });
  } else if (filled !== null) {
    fillEntry(character, filled[1], filled[2]);
  } else if (earlier !== null) {
    addCounted(character, KINDS[earlier[1]], 0, `Earlier ${KINDS[earlier[1]]}`);
  } else if (ofPoints !== null) {
    pointedList(character, ofPoints[1]).push({ name: ofPoints[1] === 'merit' ? 'Acute Sense' : 'Hunted', category: 'Social', points: Number(ofPoints[2]), note: '' });
  } else if (rated !== null) {
    putBackground(character, cursor, { name: rated[1], rating: Number(rated[2]) });
  } else if (nameless) {
    putBackground(character, cursor, { name: '', rating: 0, note: 'Owes a favour' });
  } else if (backgroundsNamed !== null && countOf(backgroundsNamed[1]) !== undefined) {
    arrange(character, `${backgroundsNamed[1]} named backgrounds`, cursor);
  } else if (counted !== null) {
    for (let count = 0; count < countOf(counted[1]); count += 1) addCounted(character, counted[2].replace(/s$/, ''), count);
  } else if (other !== null) {
    character.otherTraits.push({ name: other[1], kind: other[2], note: other[3] } satisfies OtherTrait);
  } else if (/^a haven with no name$/.test(part)) {
    character.havens.push(havenOf('Other', '', ''));
  } else if (pointed !== null) {
    const entry: Merit = { name: pointed[2], category: pointed[3] as MeritCategory, points: Number(pointed[4]), note: '' };
    (pointed[1] === 'merit' ? character.merits : character.flaws).push(entry);
  } else if (haven !== null) {
    character.havens.push(havenOf(haven[1] as HavenKind, haven[2], haven[3]));
  } else if (detailed !== null) {
    const [, ordinal, name, rating, summary, note, people] = detailed;
    if (ordinal !== undefined) cursor.background = ORDINALS.indexOf(ordinal);
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
const ITEM_START = '(?=(?:an? |one |two |three |four |five |six |seven |eight |the background |the \\w+ being |all with ))';

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
  sectionNamed(page, section).locator('[data-list] > li').filter({ visible: true });

/** The card of one entry of a section, found by the heading with its name. */
export const entryCard = (page: Page, section: string, name: string): Locator =>
  cardsOf(page, section).filter({ has: page.getByRole('heading', { name, exact: true }) });

/** What a card shows in play mode: its edit form holds the same words in options and fields. */
export const playFace = (card: Locator): Locator => card.locator('.backgrounds-view');

/** The empty state of a section. */
export const emptyOf = (page: Page, section: string): Locator =>
  backgroundsPanel(page).locator(`[data-empty="${SECTIONS[section]}"]`);

/** The entries of the section index, as they read. */
export const indexEntries = (page: Page): Locator => backgroundsPanel(page).locator('[data-section-index] li');

/** What this tab's steps remember about the scenario. */
interface BackgroundsMemory {
  /** The entry a scenario put in a section for steps that say "it": the section and the name. */
  featured?: { section: string; name: string };
  /** What a step saw before the sheet was reloaded, to be compared with what is shown after. */
  before?: string[];
  /** The section whose points a scenario is correcting. */
  section?: string;
}

export const backgroundsMemory = (memory: ScenarioMemory): BackgroundsMemory =>
  memoryFor<BackgroundsMemory>({ memory }, 'backgrounds', () => ({}));

/** The one entry a scenario's words feature ("one haven "The Orangery" with every field filled"), if they name one. */
export function featuredEntry(words: string): { section: string; name: string } | undefined {
  const match = words.match(/^one (haven|merit|flaw|other trait) "([^"]+)"/);
  return match === null ? undefined : { section: SECTION_OF[match[1]], name: match[2] };
}

/** The edit-mode fields of an entry, by the label the player sees. */
export const nameField = (card: Locator): Locator => card.getByRole('textbox', { name: 'Name', exact: true });
export const field = (card: Locator, label: RegExp | string): Locator => card.getByLabel(label, typeof label === 'string' ? { exact: true } : {});

/** The button that adds to a section, by the section's name. */
export const addButton = (page: Page, section: string): Locator =>
  sectionNamed(page, section).locator('[data-action="add"]');

/** The button that removes the entry called `name`. */
export const removeButton = (page: Page, name: string): Locator => page.getByRole('button', { name: `Remove ${name}`, exact: true });

/** The names of a section's entries as shown: what is typed in each name field in edit mode, the headings in play mode. */
export async function entryNames(page: Page, section: string): Promise<string[]> {
  const fields = nameField(cardsOf(page, section));
  if ((await fields.count()) > 0) return Promise.all((await fields.all()).map((input) => input.inputValue()));
  return cardsOf(page, section).getByRole('heading').allTextContents();
}

/** Reloads the sheet, which opens in play mode on the tab it was on. */
export async function reloadSheet(page: Page): Promise<void> {
  await page.reload();
  await expect(backgroundsPanel(page)).toBeVisible();
}

/** The text of the entry of the section index called `label` ("Merits"), whatever count it carries. */
export const indexEntryOf = async (page: Page, label: string): Promise<string> =>
  (await indexEntries(page).filter({ hasText: new RegExp(`^${label} ·`) }).textContent()) ?? '';

/** The text of a section's heading count and of its entry in the section index, for comparing across a reload. */
export const countsShown = async (page: Page, section: string): Promise<string[]> => [
  (await sectionNamed(page, section).locator('.dossier-heading-count').textContent()) ?? '',
  await indexEntryOf(page, section),
];
