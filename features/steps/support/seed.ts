import type { Page } from '@playwright/test';
import { blankCharacter, type V20Character } from '../../../src/domain/v20/character';
import { createCharacterStore, type StoragePort } from '../../../src/storage/characterStore';

type HeaderValues = Partial<V20Character['header']>;

let nextSeedId = 0;

/** A blank character with the given header fields, for arranging saved data. */
export function characterWith(header: HeaderValues): V20Character {
  nextSeedId += 1;
  const character = blankCharacter(`seed-${String(nextSeedId).padStart(4, '0')}`);
  Object.assign(character.header, header);
  return character;
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
