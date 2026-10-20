// Ranked groups and rating rows: the controls the Attributes, Abilities and Advantages screens share
// (a group's rank, its dots, its readout and notice), found wherever the trait's own screen is.

import { expect, type Locator, type Page } from '@playwright/test';
import { ABILITY_GROUPS, ATTRIBUTE_GROUPS } from '../../../src/domain/v20/traits';
import { openStep, shownStep } from './builder';

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

/** "the Generation background" and "Generation" name the same row. */
export const traitName = (name: string): string =>
  name.replace(/^the (?:Attribute |Ability |Discipline |Background |Virtue )?/, '').replace(/ background$/, '');

/** Opens every collapsed freebie section on the shown step, so their rows can be found. */
export async function openFreebieSections(page: Page): Promise<void> {
  await shownStep(page).evaluate((step) => {
    for (const details of step.querySelectorAll('details')) details.open = true;
  });
}

/** A trait's rating row, found by its named Increase button: unique on a screen, and what a player reaches. */
export const ratingRow = (scope: Locator, label: string): Locator =>
  scope.locator('.rating-stepper').filter({ has: scope.page().getByRole('button', { name: `Increase ${label}`, exact: true }) });

/** A trait's rating row on the shown step, opening the trait's own step if it is not there. */
export async function traitRating(page: Page, name: string): Promise<Locator> {
  const label = traitName(name);
  await openFreebieSections(page);
  const here = ratingRow(shownStep(page), label);
  if ((await here.count()) > 0) return here;
  await openStep(page, homeStepOf(label));
  return ratingRow(shownStep(page), label);
}

/** The rating a row shows. */
export const ratingOf = async (control: Locator): Promise<number> => Number(await control.getAttribute('data-value'));

/** A row's Increase or Decrease button. */
export const stepButton = (control: Locator, direction: 'Increase' | 'Decrease'): Locator =>
  control.getByRole('button', { name: new RegExp(`^${direction} `) });

/** The rating rows of a group, in page order. */
export const ratingsIn = (group: Locator): Locator => group.locator('.rating-stepper');

/** The name a row shows. */
export const ratingNameOf = (control: Locator): Promise<string> =>
  control.evaluate((row) => document.getElementById(row.getAttribute('data-label-id')!)!.textContent ?? '');

/** Asks a rating for `target` the way a player would, by pressing Increase or Decrease; stops when a press changes nothing. */
export async function requestRating(control: Locator, target: number): Promise<void> {
  for (let current = await ratingOf(control); current !== target; ) {
    // A button at its bound is aria-disabled, which Playwright will not click unforced; it still asks, and is refused.
    await stepButton(control, target > current ? 'Increase' : 'Decrease').click({ force: true });
    // A row that is gone (a freebie Discipline lowered to 0) has nothing more to press.
    if ((await control.count()) === 0) return;
    const next = await ratingOf(control);
    if (next === current) return;
    current = next;
  }
}

export async function expectRated(control: Locator, value: number): Promise<void> {
  await expect(control).toHaveAttribute('data-value', String(value));
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
  let left = count;
  for (const row of await ratingsIn(group).all()) {
    if (left === 0) break;
    const current = await ratingOf(row);
    const target = Math.min(cap, current + left);
    left -= target - current;
    await requestRating(row, target);
    await expectRated(row, target);
  }
}
