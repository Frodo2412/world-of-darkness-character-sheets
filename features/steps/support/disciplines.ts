import { expect, type Locator, type Page } from '@playwright/test';
import type { V20Character } from '../../../src/domain/v20/character';
import {
  ABILITY_GROUPS,
  ATTRIBUTE_GROUPS,
  HEALTH_LEVELS,
  type AbilityKey,
  type AttributeKey,
  type HealthLevelKey,
} from '../../../src/domain/v20/traits';
import { DISCIPLINE_CATALOGUE } from '../../../src/domain/v20/disciplines';
import type { ScenarioMemory } from '../fixtures';
import { characterArranged, saveCharacters } from './seed';
import { openSheetTab, showTab, tabPanelOf } from './tabs';
import { memoryFor } from '../fixtures';

// What the Disciplines scenarios know about the tab: how to arrange a character from the words of a
// scenario, and where the tab's parts are.

const NAME = 'Marguerite';

const labelled = <K extends string>(groups: readonly { traits: readonly { key: K; label: string }[] }[]): Map<string, K> =>
  new Map(groups.flatMap((group) => group.traits.map((trait) => [trait.label, trait.key] as const)));

const ATTRIBUTES = labelled<AttributeKey>(ATTRIBUTE_GROUPS);
const ABILITIES = labelled<AbilityKey>(ABILITY_GROUPS);
const WOUNDS = new Map<string, HealthLevelKey>(HEALTH_LEVELS.map((level) => [level.label, level.key]));

/** Marks a health box with damage; any damage makes the wound, and the worst level marked sets the penalty. */
const wound = (character: V20Character, level: HealthLevelKey): void => void (character.health[level] = 'lethal');

/**
 * Sets one thing a scenario says the character has: "Presence 3" (a Discipline), "Charisma 3" (an
 * attribute), "Performance 0" (an ability), `a Discipline named "Homebrewed" rated 2`, "Dominate rated 0",
 * `a Hurt wound (1 die off every pool)` or "the health track fully marked Incapacitated".
 */
function arrange(character: V20Character, part: string, next: { row: number }): void {
  const named = part.match(/^a Discipline named "(.+)" rated (\d+)$/) ?? part.match(/^(.+?) rated (\d+)$/);
  const rated = part.match(/^(.+?) (\d+)$/);
  const hurt = part.match(/^an? (\w+) wound\b/);
  if (named !== null) {
    character.disciplines[next.row++] = { name: named[1], rating: Number(named[2]) };
  } else if (rated !== null && ATTRIBUTES.has(rated[1])) {
    character.attributes[ATTRIBUTES.get(rated[1])!] = Number(rated[2]);
  } else if (rated !== null && ABILITIES.has(rated[1])) {
    character.abilities[ABILITIES.get(rated[1])!] = Number(rated[2]);
  } else if (rated !== null) {
    character.disciplines[next.row++] = { name: rated[1], rating: Number(rated[2]) };
  } else if (hurt !== null && WOUNDS.has(hurt[1])) {
    wound(character, WOUNDS.get(hurt[1])!);
  } else if (part === 'the health track fully marked Incapacitated') {
    for (const { key } of HEALTH_LEVELS) wound(character, key);
  } else if (part !== 'no named Disciplines') {
    throw new Error(`a Disciplines scenario cannot arrange "${part}"`);
  }
}

/** A character made from the words of a scenario: "Presence 1, Charisma 3 and a Hurt wound (1 die off every pool)". */
export function disciplineCharacter(words: string): V20Character {
  return characterArranged({ name: NAME, clan: 'Toreador' }, (character) => {
    const next = { row: 0 };
    for (const part of words.split(/,\s*|\s+and\s+(?=a |an |the |[A-Z])/)) arrange(character, part.trim(), next);
  });
}

/** Saves a character made from the words, as the scenario's character. */
export async function saveDisciplineCharacter(page: Page, memory: { saved: V20Character[] }, words: string): Promise<void> {
  memory.saved = [disciplineCharacter(words)];
  await saveCharacters(page, memory.saved);
}

/** The tab's panel. */
export const disciplinesPanel = (page: Page): Locator => tabPanelOf(page, 'disciplines');

/** Shows the Disciplines tab: opens the sheet on it, or chooses it in the bar when the sheet is already open. */
export async function showDisciplines(page: Page, memory: { saved: V20Character[] }): Promise<void> {
  if (new URL(page.url()).pathname.startsWith('/sheet/')) await showTab(page, 'Disciplines');
  else await openSheetTab(page, memory.saved[0].id, 'Disciplines');
  await expect(disciplinesPanel(page)).toBeVisible();
}

/** A Discipline's entry in the list on the left. */
export const disciplineItem = (page: Page, name: string): Locator =>
  disciplinesPanel(page)
    .locator('[data-disciplines-list] > li')
    .filter({ has: page.getByText(name, { exact: true }) });

/** The list of powers of the selected Discipline. */
export const powerRows = (page: Page): Locator => disciplinesPanel(page).locator('[data-disciplines-powers] > li');

/** One power's row, found by the heading with its name. */
export const powerRow = (page: Page, name: string): Locator =>
  powerRows(page).filter({ has: page.getByRole('heading', { name, exact: true }) });

/**
 * Anything a player could type into or change the contents of the tab with. The search field is
 * left out: it filters what is shown and changes nothing the character has.
 */
export const editors = (page: Page): Locator =>
  disciplinesPanel(page)
    .locator('input:not([data-search-input]), textarea, select, [contenteditable]:not([contenteditable="false"])')
    .or(disciplinesPanel(page).getByRole('button', { name: /^(Add|Remove)\b/ }))
    .filter({ visible: true });

/** Splits "Awe, Dread Gaze and Entrancement" into its names. */
export const namesIn = (list: string): string[] => list.split(/,\s*|\s+and\s+/);

/** What this tab's steps remember about the scenario. */
interface DisciplinesMemory {
  /** The power the scenario has expanded, which later "it shows" steps are about. */
  power?: string;
  /** What each key press did to the power's panel, in order. */
  panelStates: { state: 'expanded' | 'collapsed'; shown: boolean }[];
}

export const disciplinesMemory = (memory: ScenarioMemory): DisciplinesMemory =>
  memoryFor<DisciplinesMemory>({ memory }, 'disciplines', () => ({ panelStates: [] }));

/** The Discipline whose catalogue entry lists the power. */
const ownerOf = (power: string): string => {
  const owner = DISCIPLINE_CATALOGUE.find((entry) => entry.powers.some((candidate) => candidate.name === power));
  if (owner === undefined) throw new Error(`no catalogued Discipline lists a power called "${power}"`);
  return owner.name;
};

/** Selects the Discipline in the list, unless it is the one selected. */
export async function selectDiscipline(page: Page, name: string): Promise<void> {
  const button = disciplineItem(page, name).getByRole('button');
  if ((await button.getAttribute('aria-current')) !== 'true') await button.click();
  await expect(button).toHaveAttribute('aria-current', 'true');
}

/** The disclosure of a power: the <details> that opens to its panel. */
export const powerDetails = (page: Page, name: string): Locator => powerRow(page, name).locator('details');

/** The line of a power's rules called `label`: "Activation cost", "Duration", "Dice pool". */
export const ruleOf = (page: Page, power: string, label: string): Locator =>
  powerRow(page, power)
    .locator('.disciplines-rule')
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator('dd');

/** Shows the Disciplines tab, selects the power's Discipline, opens the power's panel and remembers it. */
export async function expandPower(page: Page, memory: ScenarioMemory & { saved: V20Character[] }, power: string): Promise<void> {
  await showDisciplines(page, memory);
  await selectDiscipline(page, ownerOf(power));
  const details = powerDetails(page, power);
  if (!(await details.evaluate((element: HTMLDetailsElement) => element.open))) await details.locator('summary').click();
  await expect(details).toHaveJSProperty('open', true);
  disciplinesMemory(memory).power = power;
}
