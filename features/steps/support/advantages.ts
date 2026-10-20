// The Advantages screen: the Discipline rows (the clan's own, then any written in), the Background chips, the rows chosen with them and the search.

import { expect, type Locator, type Page } from '@playwright/test';
import { openStep, shownStep } from './builder';
import { groupBox, placeDots, ratingsIn } from './ranked';

/** The names of the Disciplines shown, in order. */
export async function disciplineNames(page: Page): Promise<string[]> {
  const group = await groupBox(page, 'Disciplines');
  return ratingsIn(group).evaluateAll((rows) =>
    rows.map((row) => document.getElementById(row.getAttribute('data-label-id')!)!.textContent ?? ''),
  );
}

/** Writes a Discipline in by name on the Advantages screen. */
export async function addDiscipline(page: Page, name: string): Promise<void> {
  await openStep(page, 'Advantages');
  const group = await groupBox(page, 'Disciplines');
  await group.getByLabel('Discipline to add', { exact: true }).fill(name);
  await group.getByRole('button', { name: 'Add Discipline' }).click();
}

// The Background chips, the rows chosen with them, and the Backgrounds search

/** The fourteen Background chips on the shown screen, listed or not. */
export const backgroundChips = (page: Page): Locator => shownStep(page).locator('[data-bg-chip]');

/** The chips the search lists. */
export const listedBackgroundChips = (page: Page): Locator => shownStep(page).locator('[data-bg-chip]:not([hidden])');

/** The chip for a Background, by the name the build stores. */
export const backgroundChip = (page: Page, name: string): Locator => shownStep(page).locator(`[data-bg-chip="${name}"]`);

/** The rows of the Backgrounds chosen, and one of them. */
export const backgroundRows = (page: Page): Locator => shownStep(page).locator('[data-bg-rows] > [data-row]');
export const backgroundRow = (page: Page, name: string): Locator => shownStep(page).locator(`[data-bg-rows] > [data-row="${name}"]`);

/** The group of chips, whose description names the keys. */
export const backgroundChipGroup = (page: Page): Locator => shownStep(page).getByRole('group', { name: 'Background choices', exact: true });

export const backgroundSearch = (page: Page): Locator =>
  page.locator('#builder').getByRole('searchbox', { name: 'Search Backgrounds', exact: true });
export const backgroundResults = (page: Page): Locator => page.locator('[data-bg-results]');
export const backgroundSearchHint = (page: Page): Locator => page.locator('[data-bg-search-hint]');
export const backgroundHeading = (page: Page): Locator => page.locator('[data-bg-heading]');

/** The line that says why the other chips cannot be chosen. */
export const backgroundLimit = (page: Page): Locator => page.locator('[data-bg-limit]');

/** Opens the Advantages screen. */
export const openAdvantages = (page: Page): Promise<void> => openStep(page, 'Advantages');

/** Presses a Background's chip, opening the screen first. Forced: an unavailable chip is aria-disabled, and still asks. */
export async function pressBackgroundChip(page: Page, name: string): Promise<void> {
  await openAdvantages(page);
  await backgroundChip(page, name).click({ force: true });
}

/** Whether the chip is chosen: pressed, and saying "Selected" in text. */
export async function expectChipChosen(page: Page, name: string, chosen: boolean): Promise<void> {
  const chip = backgroundChip(page, name);
  await expect(chip).toHaveAttribute('aria-pressed', String(chosen));
  if (chosen) await expect(chip.locator('[data-bg-chip-state]')).toContainText('Selected');
  else await expect(chip.locator('[data-bg-chip-state]')).toBeHidden();
}

/** The pool a card shows beside its meter. */
export async function cardPool(page: Page, card: 'Disciplines' | 'Backgrounds' | 'Virtues'): Promise<Locator> {
  return (await groupBox(page, card)).locator('[data-pool]');
}

/** Places `count` Background dots as a player does: chooses a chip, then raises its row. */
export async function placeBackgroundDots(page: Page, count: number): Promise<void> {
  await pressBackgroundChip(page, 'Allies');
  await placeDots(page, 'Backgrounds', count, 5);
}
