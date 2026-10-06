import { expect, type Locator, type Page } from '@playwright/test';
import type { V20Character } from '../../../src/domain/v20/character';
import { keyFor } from '../../../src/storage/characterStore';
import { watchAnnouncements } from './builder';
import { sheetAddress } from './pages';
import { saveCharacters } from './seed';
import { escaped } from './text';

export const sheetRoot = (page: Page): Locator => page.locator('#sheet');

export const editButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Edit character', exact: true });

export const doneButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Done editing', exact: true });

/** Waits for the sheet to be drawn: it shows one of the two mode buttons. */
async function sheetShown(page: Page): Promise<void> {
  await expect(editButton(page).or(doneButton(page))).toBeVisible();
}

export async function isEditing(page: Page): Promise<boolean> {
  await sheetShown(page);
  return doneButton(page).isVisible();
}

/** Saves `character`, opens its sheet by address and waits for it. */
export async function openSavedSheet(page: Page, character: V20Character): Promise<void> {
  await saveCharacters(page, [character]);
  await page.goto(sheetAddress(character.id));
  await sheetShown(page);
  await watchAnnouncements(page);
}

export async function enterEditMode(page: Page): Promise<void> {
  await editButton(page).click();
  await expect(doneButton(page)).toBeVisible();
}

/** For steps that set or read an editable value: a reload or a saved sheet opens in play mode. */
export async function ensureEditing(page: Page): Promise<void> {
  if (!(await isEditing(page))) await enterEditMode(page);
}

/** The read-only dots drawn for a name, whether or not they are exposed to assistive technology. */
export const visibleDots = (scope: Page | Locator, name: RegExp): Locator =>
  scope.getByRole('img', { name, includeHidden: true }).filter({ visible: true });

/**
 * A rating by its label, in either mode: a slider while editing, an image named
 * "<label> <value> of <max>" in play mode (hidden from assistive technology on a row
 * whose button reads out the same, so found whether or not it is exposed).
 */
export const ratingLabelled = (page: Page, label: string): Locator =>
  page
    .getByRole('slider', { name: label, exact: true })
    // While a row's button is live it carries the name and value, and its dots are hidden from assistive technology.
    .or(visibleDots(page, new RegExp(`^${escaped(label)} \\d+ of \\d+$`)));

/** Checks the dots drawn and, for a slider, the value it reports. */
export async function expectRatingValue(control: Locator, value: number): Promise<void> {
  await expect(control).toHaveAttribute('value', String(value));
  await expect(control.locator('.rating-mark.is-filled')).toHaveCount(value);
  if ((await control.getAttribute('role')) === 'slider') {
    await expect(control).toHaveAttribute('aria-valuenow', String(value));
  }
}

/** The identity card and, while editing, its fields: the region every identity check is made within. */
export const identityRegion = (page: Page): Locator =>
  page.getByRole('region', { name: 'Character', exact: true });

export const identityName = (page: Page): Locator => page.locator('[data-show="identity.name"]');
export const identitySummary = (page: Page): Locator => page.locator('[data-show="identity.summary"]');
export const identityMonogram = (page: Page): Locator => page.locator('[data-show="identity.monogram"]');
export const identityTemperament = (page: Page): Locator =>
  page.locator('[data-show="identity.temperament"]');

/** The record the app has stored for a character, as the browser holds it. */
export async function savedCharacter(page: Page, id: string): Promise<V20Character> {
  const text = await page.evaluate((key) => window.localStorage.getItem(key), keyFor(id));
  return JSON.parse(text!) as V20Character;
}

/** The id of the character whose sheet is open. */
export const openCharacterId = (page: Page): string =>
  new URL(page.url()).searchParams.get('id') ?? '';

/** A card by its heading. */
const card = (page: Page, name: string): Locator => page.getByRole('region', { name, exact: true });

export const bloodPoolCard = (page: Page): Locator => card(page, 'Blood Pool');
export const willpowerCard = (page: Page): Locator => card(page, 'Willpower');

/** A stepper's reading, "<current> / <bound>". */
export const bloodTotal = (page: Page): Locator => bloodPoolCard(page).locator('[data-show="blood.total"]');
export const willpowerTotal = (page: Page): Locator => willpowerCard(page).locator('[data-show="willpower.total"]');
export const healthCard = (page: Page): Locator => card(page, 'Health');
export const humanityCard = (page: Page): Locator => card(page, 'Humanity');
export const selectedPoolCard = (page: Page): Locator => card(page, 'Selected pool');

/** The button that chooses an attribute or ability for the dice pool, by the trait's name. */
export const traitButton = (page: Page, name: string): Locator =>
  page.getByRole('button', { name, exact: true });

/**
 * What assistive technology reads for a trait's row in play mode: its button is named for the
 * trait and described by the value, and the dots are hidden so the value is not said twice.
 * `reads` is the two together, "<name> <value> of <max>".
 */
export async function expectReadAs(row: Locator, name: string, reads: string): Promise<void> {
  const button = row.getByRole('button');
  await expect(button).toHaveAccessibleName(name);
  await expect(button).toHaveAccessibleDescription(reads.slice(name.length + 1));
  expect(reads.startsWith(`${name} `)).toBe(true);
  await expect(row.locator('dot-rating')).toHaveAttribute('aria-hidden', 'true');
}

/** The row a trait's button is in. */
export const traitRow = (page: Page, name: string): Locator =>
  traitButton(page, name).locator('xpath=ancestor::*[@data-trait-key][1]');

const DAMAGE_ORDER = ['empty', 'bashing', 'lethal', 'aggravated'];

/** A health box, found by the name it reports: "<level>, <damage>". */
export const healthBox = (page: Page, level: string): Locator =>
  page.getByRole('button', { name: new RegExp(`^${level}, `) });

/** The box reports the damage in its name and carries it as the mark drawn for it. */
export async function expectDamage(page: Page, level: string, damage: string): Promise<void> {
  await expect(page.getByRole('button', { name: `${level}, ${damage}`, exact: true })).toBeVisible();
  await expect(healthBox(page, level)).toHaveAttribute('data-damage', damage);
}

/** Activates a health box, as a player does, until it holds `damage`. */
export async function markDamage(page: Page, level: string, damage: string): Promise<void> {
  for (let step = 0; step < DAMAGE_ORDER.length; step += 1) {
    if ((await healthBox(page, level).getAttribute('data-damage')) === damage) break;
    await healthBox(page, level).click();
  }
  await expectDamage(page, level, damage);
}
