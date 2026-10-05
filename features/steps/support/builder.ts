import { expect, type Locator, type Page } from '@playwright/test';
import { blankBuild, type V20Build } from '../../../src/domain/v20/creation/build';
import { createBuildStore } from '../../../src/storage/buildStore';
import type { StoragePort } from '../../../src/storage/storagePort';
import { openRoster } from './pages';

export const BUILD_KEY_PREFIX = 'wod-sheets:build:';

export const BUILDER_ADDRESS = /\/build\/\?id=.+/;

export const builderAddress = (id: string): string => `/build/?id=${encodeURIComponent(id)}`;

/** The id of the build the builder has open. */
export const openBuildId = (page: Page): string =>
  new URL(page.url()).searchParams.get('id') ?? '';

/** Starts a build from the roster and ends on the builder. */
export async function startBuild(page: Page): Promise<void> {
  await openRoster(page);
  await page.getByRole('button', { name: 'Build a character' }).click();
  await expect(page).toHaveURL(BUILDER_ADDRESS);
  await expect(page.getByRole('heading', { name: 'Build a character' })).toBeVisible();
}

export const baseGeneration = (page: Page): Locator =>
  page.getByRole('combobox', { name: 'Base generation', exact: true });

export const extraFreebies = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Extra freebie points', exact: true });

/** A read-only value the builder shows, such as "Freebie budget". */
export const readout = (page: Page, name: string): Locator =>
  page.getByRole('status', { name, exact: true });

/** Enters text the way a player finishes an entry: typed, then the field is left. */
export async function enterExtraFreebies(page: Page, text: string): Promise<void> {
  const field = extraFreebies(page);
  await field.fill(text);
  await field.blur();
}

export async function setBaseGeneration(page: Page, label: string): Promise<void> {
  await baseGeneration(page).selectOption({ label });
}

let nextSeedId = 0;

/** A blank build with the given settings, for arranging saved data. */
export function buildWith(settings: Partial<V20Build['settings']> = {}): V20Build {
  nextSeedId += 1;
  const build = blankBuild(`seed-build-${String(nextSeedId).padStart(4, '0')}`);
  Object.assign(build.settings, settings);
  return build;
}

/**
 * Puts builds into the browser's storage as if they had been saved earlier.
 * The app's own store writes the records, so keys and format are the real ones.
 * States the rules refuse to reach are seeded as literal records instead.
 */
export async function saveBuilds(page: Page, builds: V20Build[]): Promise<void> {
  const records = new Map<string, string>();
  const recorder: StoragePort = {
    length: 0,
    key: () => null,
    getItem: (key) => records.get(key) ?? null,
    setItem: (key, value) => void records.set(key, value),
    removeItem: (key) => void records.delete(key),
  };
  const store = createBuildStore(recorder);
  for (const build of builds) store.save(build);

  await page.goto('/');
  await page.evaluate((entries) => {
    for (const [key, value] of entries) window.localStorage.setItem(key, value);
  }, [...records]);
}
