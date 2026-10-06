import type { Page } from '@playwright/test';
import { blankCharacter, type V20Character } from '../../../src/domain/v20/character';
import { CLAN_NAMES } from '../../../src/domain/v20/creation/rules';
import { createCharacterStore, type StoragePort } from '../../../src/storage/characterStore';
import { buildWith, saveBuilds } from './builder';
import { overwriteRecord, type StoredRecord } from './storage';

type HeaderValues = Partial<V20Character['header']>;

let nextSeedId = 0;

/** A blank character with the given header fields, for arranging saved data. */
export function characterWith(header: HeaderValues): V20Character {
  nextSeedId += 1;
  const character = blankCharacter(`seed-${String(nextSeedId).padStart(4, '0')}`);
  Object.assign(character.header, header);
  return character;
}

/**
 * Characters created one after the other: the ids are explicit and strictly ascending, the
 * order the app gives them, so a scenario that needs "older" and "newer" does not lean on
 * how many seeds an earlier scenario happened to make.
 */
export function inCreationOrder(...headers: HeaderValues[]): V20Character[] {
  return headers.map((header, index) => ({
    ...characterWith(header),
    id: `ordered-${String(index + 1).padStart(4, '0')}`,
  }));
}

/** As `characterWith`, then `arrange` changes whatever else a scenario needs saved. */
export function characterArranged(
  header: HeaderValues,
  arrange: (character: V20Character) => void,
): V20Character {
  const character = characterWith(header);
  arrange(character);
  return character;
}

/**
 * A character that can overflow, for the layout scenarios: a ten-dot rating, long unbroken
 * names, a blood pool drawn as a bar and a wound.
 */
export function crowdedCharacter(header: HeaderValues): V20Character {
  return characterArranged({ ...header, generation: '4' }, (character) => {
    character.attributes.strength = 8;
    character.attributes.manipulation = 4;
    character.abilities.investigation = 3;
    character.abilities.intimidation = 2;
    character.customAbilities.talents = { name: 'Supercalifragilisticexpialidocious'.repeat(2), rating: 7 };
    character.disciplines[0] = { name: 'Thaumaturgical Sanguinary Dominationesque', rating: 5 };
    character.humanity = {
      ...character.humanity,
      rating: 6,
      pathName: 'The Path of Honorable Accord and Unbroken Conviction',
    };
    character.bloodPool.current = 30;
    character.health.wounded = 'lethal';
  });
}

/** Arranges one character, remembers it as the scenario's saved character and saves it: the body of a seed-and-save Given. */
export async function givenSaved(
  page: Page,
  memory: { saved: V20Character[] },
  header: HeaderValues,
  arrange: (character: V20Character) => void = () => {},
): Promise<void> {
  memory.saved = [characterArranged(header, arrange)];
  await saveCharacters(page, memory.saved);
}

/**
 * Puts characters into the browser's storage as if they had been saved
 * earlier. The app's own store writes the records, so the keys and format
 * are always the real ones.
 */
export async function saveCharacters(page: Page, characters: V20Character[]): Promise<void> {
  const records = new Map<string, string>();
  const recorder: StoragePort = {
    length: 0,
    key: () => null,
    getItem: (key) => records.get(key) ?? null,
    setItem: (key, value) => void records.set(key, value),
    removeItem: (key) => void records.delete(key),
  };
  const store = createCharacterStore(recorder);
  for (const character of characters) store.save(character);

  await page.goto('/');
  await page.evaluate((entries) => {
    for (const [key, value] of entries) window.localStorage.setItem(key, value);
  }, [...records]);
}

/**
 * Saves characters from a second page of the same browser, as another window would, then closes it.
 * Storage is shared, so a page already open sees them only after it reads again.
 */
export async function saveFromAnotherPage(page: Page, characters: V20Character[]): Promise<void> {
  const other = await page.context().newPage();
  await saveCharacters(other, characters);
  await other.close();
}

/** Saves one character per header, created one after the other, and remembers them. */
export async function saveInOrder(
  page: Page,
  memory: { saved: V20Character[] },
  headers: Parameters<typeof inCreationOrder>,
): Promise<void> {
  memory.saved = inCreationOrder(...headers);
  await saveCharacters(page, memory.saved);
}

/** One row of a scenario's table of what is saved: a character or a build in progress. */
export interface LibraryRow {
  kind: 'character' | 'build';
  name: string;
  clan: string;
  concept: string;
  /** A table with no such column leaves it out. */
  player?: string;
  chronicle: string;
}

/** The builder only lets a build hold one of its clans, spelled as it spells them; the store reads any other as damaged. */
function assertBuildable(clan: string): string {
  if (clan !== '' && !(CLAN_NAMES as readonly string[]).includes(clan)) {
    throw new Error(`a build cannot be of clan "${clan}": the builder allows ${CLAN_NAMES.join(', ')}`);
  }
  return clan;
}

/**
 * Characters and builds created one after the other, as the table lists them: the ids are
 * explicit and strictly ascending across both stores, which is the order the roster lists
 * them in. A build has no player, so that column is ignored for one.
 */
export async function saveLibraryInOrder(
  page: Page,
  memory: { saved: V20Character[] },
  rows: LibraryRow[],
): Promise<void> {
  const idAt = (index: number): string => `ordered-${String(index + 1).padStart(4, '0')}`;
  const characters = rows.flatMap(({ kind, name, clan, concept, player = '', chronicle }, index) =>
    kind === 'character' ? [{ ...characterWith({ name, clan, concept, player, chronicle }), id: idAt(index) }] : [],
  );
  const builds = rows.flatMap(({ kind, name, clan, concept, chronicle }, index) =>
    kind === 'build' ? [{ ...buildWith({ clan: assertBuildable(clan), concept: { name, concept, chronicle } }), id: idAt(index) }] : [],
  );
  memory.saved = characters;
  await saveCharacters(page, characters);
  await saveBuilds(page, builds);
}

/** Headers that differ only in their chronicle: '' leaves it blank. */
export const inChronicles = (chronicles: string[]): { chronicle: string }[] =>
  chronicles.map((chronicle) => ({ chronicle }));

/** A record cut off part-way through writing, as storage damage leaves it. */
export const DAMAGED_CHARACTER_TEXT = '{"id": "broken", "header": {"name": "Fat';

/** Saves a character named "Fatima", then leaves her record unreadable; the record is what is left. */
export async function saveDamagedCharacter(page: Page): Promise<StoredRecord & { id: string }> {
  const character = characterWith({ name: 'Fatima' });
  await saveCharacters(page, [character]);
  return { id: character.id, ...(await overwriteRecord(page, character.id, DAMAGED_CHARACTER_TEXT)) };
}

/** Saves a build, then leaves its record unreadable; the record is what is left. */
export async function saveDamagedBuild(page: Page): Promise<StoredRecord & { id: string }> {
  const build = buildWith();
  await saveBuilds(page, [build]);
  return { id: build.id, ...(await overwriteRecord(page, build.id, '{"id": "bro')) };
}
