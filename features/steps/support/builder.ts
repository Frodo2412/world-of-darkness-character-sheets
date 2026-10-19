import { expect, type Locator, type Page } from '@playwright/test';
import { blankBuild, type V20Build } from '../../../src/domain/v20/creation/build';
import { play, type Step } from '../../../src/domain/v20/creation/testing/play';
import { createBuildStore } from '../../../src/storage/buildStore';
import type { StoragePort } from '../../../src/storage/storagePort';
import { ABILITY_GROUPS, ATTRIBUTE_GROUPS } from '../../../src/domain/v20/traits';
import { createAction, openRoster } from './pages';
import { ANNOUNCEMENT_WINDOW_MS, waitOnPageClock, watchAnnouncements } from './announcements';
import { storedKeys, writeRecord } from './storage';

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

export const baseGeneration = (page: Page): Locator =>
  page.getByRole('combobox', { name: 'Base generation', exact: true });

export const extraFreebies = (page: Page): Locator =>
  page.getByRole('textbox', { name: 'Extra freebie points', exact: true });

/** A read-only value the builder shows, such as "Freebie budget". */
export const readout = (page: Page, name: string): Locator =>
  page.getByRole('status', { name, exact: true });

/** Enters text the way a player finishes an entry: typed, then the field is left. */
export async function enterExtraFreebies(page: Page, text: string): Promise<void> {
  await openStep(page, 'Settings');
  const field = extraFreebies(page);
  await field.fill(text);
  await field.blur();
}

export async function setBaseGeneration(page: Page, label: string): Promise<void> {
  await baseGeneration(page).selectOption({ label });
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

/** Opens the Finishing touches step and activates Finish. */
export async function activateFinish(page: Page): Promise<void> {
  await openStep(page, 'Finishing touches');
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
}

export const finishDialog = (page: Page): Locator =>
  page.getByRole('dialog', { name: 'Finish with unspent freebie points?' });

export const finishButton = (page: Page): Locator => page.getByRole('button', { name: 'Finish', exact: true });

export const outstandingItems = (page: Page): Locator => page.locator('[data-outstanding-list] li');

/** Finishes the build open on Finishing touches, accepting the unspent-freebie question when `accept` and it is asked. */
export async function finishOpenBuild(page: Page, accept = true): Promise<void> {
  await activateFinish(page);
  if (accept && (await finishDialog(page).isVisible())) {
    await finishDialog(page).getByRole('button', { name: /^Finish with/ }).click();
  }
}

/** Finish while something is outstanding: reachable by keyboard, and explaining itself in text. */
export async function expectFinishExplains(page: Page, reason: string): Promise<void> {
  await openStep(page, 'Finishing touches');
  const finish = finishButton(page);
  await expect(finish).toHaveAttribute('aria-disabled', 'true');
  // aria-disabled, not the disabled attribute, so keyboard users can still reach it.
  expect(await finish.evaluate((button: HTMLButtonElement) => button.disabled)).toBe(false);
  await finish.focus();
  await expect(finish).toBeFocused();
  await expect(page.getByText(reason, { exact: true })).toBeVisible();
  await expect(finish).toHaveAccessibleDescription(new RegExp(reason));
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
  await expect(page.locator('[data-finish-notice]')).toContainText('left before this character can be finished');
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

export const stepNav = (page: Page): Locator =>
  page.getByRole('navigation', { name: 'Build steps' });

export const stepHeading = (page: Page, title: string): Locator =>
  page.getByRole('heading', { name: title, level: 2, exact: true });

/** Opens a step from the step navigation, unless it is already shown. */
export async function openStep(page: Page, title: string): Promise<void> {
  if (!(await stepHeading(page, title).isVisible())) {
    await stepNav(page).getByRole('link', { name: title, exact: true }).click();
  }
  await expect(stepHeading(page, title)).toBeVisible();
}

/** A builder field by its label; a step region of the same name is not a field. */
export const builderField = (page: Page, label: string): Locator =>
  page
    .locator('#builder')
    .getByLabel(label, { exact: true })
    .and(page.locator('input, select, textarea'));

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

// Traits and groups


/** The step a trait's creation dots are placed on, by its label. */
export function homeStepOf(label: string): string {
  if (ATTRIBUTE_GROUPS.some((group) => group.traits.some((trait) => trait.label === label))) {
    return 'Attributes';
  }
  if (ABILITY_GROUPS.some((group) => group.traits.some((trait) => trait.label === label))) {
    return 'Abilities';
  }
  if (label === 'Humanity' || label === 'Willpower') return 'Finishing touches';
  return 'Advantages';
}

/** The step a ranked group is on. */
export function groupStepOf(label: string): string {
  if (ATTRIBUTE_GROUPS.some((group) => group.label === label)) return 'Attributes';
  if (ABILITY_GROUPS.some((group) => group.label === label)) return 'Abilities';
  return 'Advantages';
}

/** The one step panel being shown. */
export const shownStep = (page: Page): Locator => page.locator('#builder [data-step]:visible');

/** "the Generation background" and "Generation" name the same row. */
export const traitName = (name: string): string =>
  name.replace(/^the (?:Attribute |Ability |Discipline |Background |Virtue )?/, '').replace(/ background$/, '');

/** Opens every collapsed freebie section on the shown step, so their rows can be found. */
export async function openFreebieSections(page: Page): Promise<void> {
  await shownStep(page).evaluate((step) => {
    for (const details of step.querySelectorAll('details')) details.open = true;
  });
}

/** A trait's rating control on the shown step, opening the trait's own step if it is not there. */
export async function traitRating(page: Page, name: string): Promise<Locator> {
  const label = traitName(name);
  await openFreebieSections(page);
  const here = shownStep(page).getByRole('slider', { name: label, exact: true });
  if ((await here.count()) > 0) return here;
  await openStep(page, homeStepOf(label));
  return shownStep(page).getByRole('slider', { name: label, exact: true });
}

/** Asks a rating for `target` the way a player would, by activating a dot. */
export async function requestRating(control: Locator, target: number): Promise<void> {
  const current = Number(await control.getAttribute('aria-valuenow'));
  if (current === target) return;
  if (target > 0) {
    await control.locator('.rating-mark').nth(target - 1).click();
    return;
  }
  // The first dot sets 1; activating it again lowers to 0, if the floor allows.
  await control.locator('.rating-mark').first().click();
  if (current > 1 && (await control.getAttribute('aria-valuenow')) === '1') {
    await control.locator('.rating-mark').first().click();
  }
}

export async function expectRated(control: Locator, value: number): Promise<void> {
  await expect(control).toHaveAttribute('aria-valuenow', String(value));
  await expect(control.locator('.rating-mark.is-filled')).toHaveCount(value);
}

/** Sets a trait through the page and checks it took. */
export async function rateTrait(page: Page, name: string, value: number): Promise<void> {
  const control = await traitRating(page, name);
  await requestRating(control, value);
  await expectRated(control, value);
}

export async function groupBox(page: Page, label: string): Promise<Locator> {
  await openFreebieSections(page);
  const here = shownStep(page).getByRole('group', { name: label, exact: true });
  if ((await here.count()) > 0) return here;
  await openStep(page, groupStepOf(label));
  return shownStep(page).getByRole('group', { name: label, exact: true });
}

export const groupReadout = async (page: Page, label: string): Promise<Locator> =>
  (await groupBox(page, label)).locator('[data-allotment-status]');

export const groupNotice = async (page: Page, label: string): Promise<Locator> =>
  (await groupBox(page, label)).locator('[data-notice]');

export async function rankSelect(page: Page, label: string): Promise<Locator> {
  return (await groupBox(page, label)).getByRole('combobox', { name: `${label} rank`, exact: true });
}

export async function rankGroup(page: Page, label: string, rank: string): Promise<void> {
  await (await rankSelect(page, label)).selectOption(rank);
}

/** Places `count` creation dots across a group's traits, filling each to `cap` in turn. */
export async function placeDots(page: Page, label: string, count: number, cap: number): Promise<void> {
  const group = await groupBox(page, label);
  const sliders = group.getByRole('slider');
  let left = count;
  for (const slider of await sliders.all()) {
    if (left === 0) break;
    const current = Number(await slider.getAttribute('aria-valuenow'));
    const target = Math.min(cap, current + left);
    left -= target - current;
    await requestRating(slider, target);
    await expectRated(slider, target);
  }
}

/** Saves a build made by playing the real updates, then opens it in the builder. */
export async function openPlayed(page: Page, ...steps: Step[]): Promise<V20Build> {
  return openPlayedFrom(page, buildWith(), ...steps);
}

/** As `openPlayed`, starting from `start` (given a fresh seed id) rather than a blank build. */
export async function openPlayedFrom(page: Page, start: V20Build, ...steps: Step[]): Promise<V20Build> {
  const build = play({ ...start, id: buildWith().id }, ...steps);
  await openSavedBuild(page, build);
  return build;
}

/** The freebie points remaining bar, shown on every step after Settings. */
export async function freebieBar(page: Page): Promise<Locator> {
  const bar = page.locator('[data-freebie-remaining]');
  if (!(await bar.isVisible())) await openStep(page, 'Finishing touches');
  return bar;
}
