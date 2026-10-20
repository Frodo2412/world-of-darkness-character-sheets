import { expect, type Locator, type Page } from '@playwright/test';
import { blankBuild, type V20Build } from '../../../src/domain/v20/creation/build';
import { play, type Step } from '../../../src/domain/v20/creation/testing/play';
import { createBuildStore } from '../../../src/storage/buildStore';
import type { StoragePort } from '../../../src/storage/storagePort';
import { createAction, openRoster } from './pages';
import { ANNOUNCEMENT_WINDOW_MS, waitOnPageClock, watchAnnouncements } from './announcements';
import { storedKeys, storedText, writeRecord } from './storage';

export const BUILD_KEY_PREFIX = 'wod-sheets:build:';

export const BUILDER_ADDRESS = /\/build\/\?id=.+/;

export const builderAddress = (id: string): string => `/build/?id=${encodeURIComponent(id)}`;

/** The id of the build the builder has open. */
export const openBuildId = (page: Page): string =>
  new URL(page.url()).searchParams.get('id') ?? '';

/** Starts a build from the roster and ends on the builder. */
export async function startBuild(page: Page): Promise<void> {
  await openRoster(page);
  await createAction(page, 'Start character creator').click();
  await expect(page).toHaveURL(BUILDER_ADDRESS);
  await expect(page.getByRole('heading', { name: 'Build a character' })).toBeVisible();
  await watchAnnouncements(page);
}

// The Creation settings dialog

export const creationSettingsButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Creation settings', exact: true });

export const settingsDialog = (page: Page): Locator => page.getByRole('dialog', { name: 'Creation settings' });

export const baseGeneration = (page: Page): Locator =>
  settingsDialog(page).getByRole('combobox', { name: 'Base generation', exact: true });

export const extraFreebies = (page: Page): Locator =>
  settingsDialog(page).getByRole('textbox', { name: 'Extra freebie points', exact: true });

/** One of the dialog's live readouts, such as "Freebie pool". */
export const readout = (page: Page, name: string): Locator =>
  settingsDialog(page).getByRole('status', { name, exact: true });

/** Opens Creation settings with its button, unless it is already open. */
export async function openCreationSettings(page: Page): Promise<void> {
  if (!(await settingsDialog(page).isVisible())) await creationSettingsButton(page).click();
  await expect(settingsDialog(page)).toBeVisible();
}

/** Closes Creation settings with Done, if it is open: the page behind a modal dialog cannot be used. */
export async function closeCreationSettings(page: Page): Promise<void> {
  if (!(await settingsDialog(page).isVisible())) return;
  await settingsDialog(page).getByRole('button', { name: 'Done', exact: true }).click();
  await expect(settingsDialog(page)).toBeHidden();
}

/** Enters text the way a player finishes an entry: typed, then the field is left. The dialog stays open. */
export async function enterExtraFreebies(page: Page, text: string): Promise<void> {
  await openCreationSettings(page);
  await extraFreebies(page).fill(text);
  await extraFreebies(page).blur();
}

/** Chooses a base generation. The dialog stays open, so a refusal can be read. */
export async function setBaseGeneration(page: Page, label: string): Promise<void> {
  await openCreationSettings(page);
  await baseGeneration(page).selectOption({ label });
}

/** The build record as the builder last stored it. */
export async function storedBuild(page: Page): Promise<V20Build> {
  return JSON.parse((await storedText(page, BUILD_KEY_PREFIX + openBuildId(page)))!) as V20Build;
}

let nextSeedId = 0;

interface BuildValues {
  settings?: Partial<V20Build['settings']>;
  concept?: Partial<V20Build['concept']>;
  clan?: string;
}

/** A blank build with the given values, for arranging saved data. */
export function buildWith(values: BuildValues = {}): V20Build {
  nextSeedId += 1;
  const build = blankBuild(`seed-build-${String(nextSeedId).padStart(4, '0')}`);
  Object.assign(build.settings, values.settings);
  Object.assign(build.concept, values.concept);
  if (values.clan !== undefined) build.clan = values.clan;
  return build;
}

/** Opens the Review & resolve screen and activates Finish. */
export async function activateFinish(page: Page): Promise<void> {
  await openStep(page, 'Review & resolve');
  // Force: a blocked Finish is only aria-disabled, which Playwright would otherwise wait out.
  await finishButton(page).click({ force: true });
}

export const finishDialog = (page: Page): Locator =>
  page.getByRole('dialog', { name: 'Finish with unspent freebie points?' });

/** The Finish control, whether its label says what is left or not. */
export const finishButton = (page: Page): Locator => page.getByRole('button', { name: /^Finish character/ });

export const outstandingItems = (page: Page): Locator => page.locator('[data-outstanding-list] li');

/** Finishes the build, accepting the unspent-freebie question when `accept` and it is asked. */
export async function finishOpenBuild(page: Page, accept = true): Promise<void> {
  await activateFinish(page);
  if (accept && (await finishDialog(page).isVisible())) {
    await finishDialog(page).getByRole('button', { name: /^Finish with/ }).click();
  }
}

/** Finish while something is outstanding: reachable by keyboard, and explaining itself in text. */
export async function expectFinishExplains(page: Page, reason: string): Promise<void> {
  await openStep(page, 'Review & resolve');
  const finish = page.getByRole('button', { name: reason, exact: true });
  await expect(finish).toHaveAttribute('aria-disabled', 'true');
  // aria-disabled, not the disabled attribute, so keyboard users can still reach it.
  expect(await finish.evaluate((button: HTMLButtonElement) => button.disabled)).toBe(false);
  await finish.focus();
  await expect(finish).toBeFocused();
  // The label says it once; no second copy of the text is there for a screen reader to read twice.
  await expect(page.getByText(reason, { exact: true })).toHaveCount(1);
  await expect(finish).toBeVisible();
}

/** Activates Finish from the keyboard while it is unavailable and checks that only the reason is said. */
export async function expectFinishDoesNothing(page: Page): Promise<void> {
  const finish = finishButton(page);
  const address = page.url();
  const stored = await storedKeys(page, BUILD_KEY_PREFIX);
  await finish.focus();
  await finish.press('Enter');
  await waitOnPageClock(page, ANNOUNCEMENT_WINDOW_MS);
  await expect(finishDialog(page)).toBeHidden();
  expect(page.url()).toBe(address);
  expect(await storedKeys(page, BUILD_KEY_PREFIX)).toEqual(stored);
  await expect(finish).toBeFocused();
  await expect(page.locator('[data-finish-notice]')).toContainText('resolve the outstanding items first');
}

/** Opens a build already in storage, without saving anything first; one that cannot be read is opened too. */
export async function openStored(page: Page, id: string): Promise<void> {
  await page.goto(builderAddress(id));
  await expect(page.getByRole('heading', { name: /^Build (a character|could not be read)$/ })).toBeVisible();
  await watchAnnouncements(page);
}

export async function reloadBuilder(page: Page): Promise<void> {
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Build a character' })).toBeVisible();
  await watchAnnouncements(page);
}

/** Writes a build record exactly as given, for states the app's own store would not write. */
export async function storeRawBuild(page: Page, id: string, record: unknown): Promise<void> {
  await page.goto('/');
  await writeRecord(page, BUILD_KEY_PREFIX + id, JSON.stringify(record));
}

/** Saves the builds, then opens the first in the builder. */
export async function openSavedBuild(page: Page, build: V20Build): Promise<void> {
  await saveBuilds(page, [build]);
  await page.goto(builderAddress(build.id));
  await expect(page.getByRole('heading', { name: 'Build a character' })).toBeVisible();
  await watchAnnouncements(page);
}

/** The screen list (the sidebar), whose items are the old steps' navigation. */
export const stepNav = (page: Page): Locator =>
  page.getByRole('navigation', { name: 'Build screens' });

/**
 * The sidebar's name for a screen. The scenarios that predate the sidebar say "Concept" for the screen
 * the sidebar calls "Character concept"; every other name is the same, whatever its case.
 */
export function screenTitle(title: string): string {
  return /^concept$/i.test(title) ? 'Character concept' : title;
}

/** A screen's link in the sidebar. */
export const stepLink = (page: Page, title: string): Locator =>
  stepNav(page).getByRole('link', { name: screenTitle(title), exact: true });

export const stepHeading = (page: Page, title: string): Locator =>
  page.getByRole('heading', { name: screenTitle(title), level: 2, exact: true });

/** The one step panel being shown. */
export const shownStep = (page: Page): Locator => page.locator('#builder [data-step]:visible');

/** Opens a screen from the sidebar, unless it is already shown. */
export async function openStep(page: Page, title: string): Promise<void> {
  await closeCreationSettings(page);
  if (!(await stepHeading(page, title).isVisible())) {
    await stepLink(page, title).click();
  }
  await expect(stepHeading(page, title)).toBeVisible();
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

/** Saves a build made by playing the real updates, then opens it in the builder. */
export async function openPlayed(page: Page, ...steps: Step[]): Promise<V20Build> {
  return openPlayedFrom(page, buildWith(), ...steps);
}

/**
 * As `openPlayed`, starting from `start` rather than a blank build. A builder already open on a build
 * (the scenario's background started one) has that build replaced, so a second one is not left behind.
 */
export async function openPlayedFrom(page: Page, start: V20Build, ...steps: Step[]): Promise<V20Build> {
  const open = BUILDER_ADDRESS.test(page.url()) ? openBuildId(page) : '';
  const build = play({ ...start, id: open || buildWith().id }, ...steps);
  await openSavedBuild(page, build);
  return build;
}

/** The freebie points remaining bar, shown on every step. */
export const freebieBar = (page: Page): Locator => page.locator('[data-freebie-remaining]');
