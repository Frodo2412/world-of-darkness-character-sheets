import { expect, type Locator, type Page } from '@playwright/test';
import { blankBuild, type V20Build } from '../../../src/domain/v20/creation/build';
import { play, type Step } from '../../../src/domain/v20/creation/testing/play';
import { createBuildStore } from '../../../src/storage/buildStore';
import type { StoragePort } from '../../../src/storage/storagePort';
import { ABILITY_GROUPS, ATTRIBUTE_GROUPS } from '../../../src/domain/v20/traits';
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

/** Saves the builds, then opens the first in the builder. */
export async function openSavedBuild(page: Page, build: V20Build): Promise<void> {
  await saveBuilds(page, [build]);
  await page.goto(builderAddress(build.id));
  await expect(page.getByRole('heading', { name: 'Build a character' })).toBeVisible();
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

/** A trait's rating control on the shown step, opening the trait's own step if it is not there. */
export async function traitRating(page: Page, name: string): Promise<Locator> {
  const label = traitName(name);
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
  const build = play(buildWith(), ...steps);
  await openSavedBuild(page, build);
  return build;
}
