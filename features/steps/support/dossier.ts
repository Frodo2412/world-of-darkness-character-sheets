import { expect, type Locator, type Page } from '@playwright/test';
import { DOSSIER_FIELDS, type V20Character } from '../../../src/domain/v20/character';
import { openSheetAt } from './tabs';

// This file is the one place that knows what the whole tab bar looks like: the integration steps ask
// for the bar and its tabs through the functions below.

export const tabBar = (page: Page): Locator => page.getByRole('tablist');

/** Every tab in the bar, in order. */
export const tabs = (page: Page): Locator => tabBar(page).getByRole('tab');

export const tabNamed = (page: Page, name: string): Locator => tabBar(page).getByRole('tab', { name, exact: true });

/** The names of the tabs in the bar, in order. */
export const tabNames = async (page: Page): Promise<string[]> => (await tabs(page).allTextContents()).map((text) => text.trim());

/** The keys the tabs go by in the sheet's address, in order. */
export const tabKeys = (page: Page): Promise<string[]> => tabs(page).evaluateAll((items) => items.map((item) => (item as HTMLElement).dataset.tabKey ?? ''));

/** Opens a saved character's sheet on a tab (the Character sheet when none) and waits for it. */
export async function openSheetOn(page: Page, id: string, key: string | undefined): Promise<void> {
  await openSheetAt(page, id, key);
  await expect(page.locator('[data-tab-panel]:not([hidden])')).toBeVisible();
}

/** The tab the address names, or undefined when it names none. */
export const addressedTab = (page: Page): string | null => new URL(page.url()).searchParams.get('tab');

/** A record as it was saved before the dossier fields existed: the same record without them. */
export function asSavedBeforeTheTabs(character: V20Character): string {
  const record: Record<string, unknown> = { ...character };
  for (const field of DOSSIER_FIELDS) delete record[field];
  return JSON.stringify(record);
}

/** Every free-text field the Character sheet had before the dossier tabs, filled, so a change to one is found. */
export function withLegacyText(character: V20Character): V20Character {
  Object.assign(character.header, {
    name: 'Éloïse Voss',
    player: 'Bruno',
    chronicle: 'The Glass City',
    nature: 'Visionary',
    demeanor: 'Bon Vivant',
    concept: 'Antiquarian',
    clan: 'Toreador',
    generation: '10th',
    sire: 'Lucien Delacroix',
  });
  character.humanity = { ...character.humanity, rating: 7, pathName: 'Path of Honorable Accord', bearing: 'Aloof  and precise', bearingModifier: '+1 Social' };
  character.bloodPool = { current: 8, perTurn: ' 1 blood / turn ' };
  character.weakness = ' Cannot enter a home uninvited ';
  character.experience = '12 XP spent on Brawl\n(2 unspent)';
  character.notes = 'Met Lucita at the Elysium.\n  Owes the Prince a boon — "no questions".\n';
  character.disciplines[0] = { name: 'Presence', rating: 3 };
  character.abilities.stealth = 0;
  return character;
}

/** The text fields a character had before the dossier tabs, by name, exactly as stored. */
export function legacyTextOf(character: V20Character): Record<string, string> {
  return {
    ...Object.fromEntries(Object.entries(character.header).map(([field, text]) => [`header.${field}`, text])),
    'humanity.pathName': character.humanity.pathName,
    'humanity.bearing': character.humanity.bearing,
    'humanity.bearingModifier': character.humanity.bearingModifier,
    'bloodPool.perTurn': character.bloodPool.perTurn,
    weakness: character.weakness,
    experience: character.experience,
    notes: character.notes,
  };
}
