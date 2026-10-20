// Ranked groups and rating rows: the controls the Attributes, Abilities and Advantages screens share
// (a group's rank, its dots, its readout and notice), found wherever the trait's own screen is.

import { expect, type Locator, type Page } from '@playwright/test';
import { RANKED_ALLOTMENTS } from '../../../src/domain/v20/creation/rules';
import { ABILITY_GROUPS, ATTRIBUTE_GROUPS } from '../../../src/domain/v20/traits';
import { memoryFor, type ScenarioMemory } from '../fixtures';
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

/** What a group of a ranked screen says it has left to place, as its pool reads it: "7 remaining", "Overspent by 4". */
export const groupPoolRemaining = async (page: Page, label: string): Promise<Locator> =>
  (await groupBox(page, label)).locator('[data-pool-remaining]');

/** The group's pool beside its meter: "4 / 7 spent · Allocation needed". */
export const groupPoolSpent = async (page: Page, label: string): Promise<Locator> =>
  (await groupBox(page, label)).locator('[data-pool-spent]');

/** The dots a ranked group says it has left, as its pool reads them: "7 remaining". */
export async function remainingCount(page: Page, label: string): Promise<number> {
  const text = (await (await groupPoolRemaining(page, label)).textContent()) ?? '';
  return Number(/^(\d+) remaining$/.exec(text)?.[1]);
}

export async function expectRemaining(page: Page, label: string, count: number): Promise<void> {
  await expect(await groupPoolRemaining(page, label)).toHaveText(`${count} remaining`);
}

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

// The Attributes and Abilities screens

/** A rank as the redesigned screens spell it. */
export const TITLE_RANK = '(Primary|Secondary|Tertiary)';
export const GROUP = `(${RANKED_ALLOTMENTS.flatMap((allotment) => allotment.groups.map((group) => group.label)).join('|')})`;
export const SCREEN = '(Attributes|Abilities)';
/** The same screens where a step does not need which one. */
export const ANY_SCREEN = '(?:Attributes|Abilities)';
/** A trait's name as a step gives it. */
export const TRAIT = '([A-Z][A-Za-z ]*?)';

export const lower = (word: string): string => word.toLowerCase();

const allotmentOf = (label: string) => RANKED_ALLOTMENTS.find((entry) => entry.groups.some((group) => group.label === label))!;

/** What earlier steps of a scenario did, for later steps to check against. */
interface RankedMemory {
  /** How many messages had been announced when the last rank was chosen. */
  mark: number;
  /** The groups the last "I rank …" step ranked, Primary first. */
  ranked: string[];
  /** The trait (or group) the last step pressed or opened. */
  trait: string;
  /** The sum of each group's ratings when a step last looked. */
  totals: Map<string, number>;
  /** The freebie points remaining when a group was arranged. */
  freebies: string;
}
export const ranked = (world: { memory: ScenarioMemory }): RankedMemory =>
  memoryFor(world, 'ranked', (): RankedMemory => ({ mark: 0, ranked: [], trait: '', totals: new Map(), freebies: '' }));

/** The ranked screen being shown. */
export const shownRanked = (page: Page): Locator => shownStep(page).locator('[data-ranked-screen]');

/** The callouts a group has raised and not hidden. */
export const shownCallouts = (page: Page): Locator => shownRanked(page).locator('[data-callout]:not([hidden])');

/** The group's status region: what its last press said. */
export const poolStatus = async (page: Page, label: string): Promise<Locator> => (await groupBox(page, label)).locator('[data-pool-status]');

/** The sum of a group's ratings. */
export async function totalOf(page: Page, label: string): Promise<number> {
  const values = await Promise.all((await ratingsIn(await groupBox(page, label)).all()).map(ratingOf));
  return values.reduce((sum, value) => sum + value, 0);
}

/**
 * Ranks a group and puts `placed` creation dots in it. More dots than the rank grants are placed under Primary
 * first and the group is then re-ranked, which is how a player comes to hold them.
 */
export async function arrange(page: Page, label: string, rank: string, placed: number): Promise<void> {
  const allotment = allotmentOf(label);
  // The most an Attribute reaches at 13th generation; Abilities stop at 3 before freebie points.
  const cap = allotment.freeDots > 0 ? 5 : 3;
  if (placed <= allotment.rankDots[lower(rank) as 'primary']) {
    await rankGroup(page, label, lower(rank));
    await placeDots(page, label, placed, cap);
    return;
  }
  await rankGroup(page, label, 'primary');
  await placeDots(page, label, placed, cap);
  await rankGroup(page, label, lower(rank));
}

/** The expected number of dots a rank grants a group. */
export const dotsOfRank = (label: string, rank: string): number => allotmentOf(label).rankDots[lower(rank) as 'primary'];

/** Presses the first Increase in a group that can place a dot. */
export async function placeOne(page: Page, label: string): Promise<void> {
  for (const row of await ratingsIn(await groupBox(page, label)).all()) {
    const plus = stepButton(row, 'Increase');
    if ((await plus.getAttribute('aria-disabled')) === 'true') continue;
    await plus.click();
    return;
  }
  throw new Error(`No ${label} row can take a dot`);
}

/** Presses the first Decrease in a group that can take a dot off. */
export async function lowerOne(page: Page, label: string): Promise<void> {
  for (const row of await ratingsIn(await groupBox(page, label)).all()) {
    const minus = stepButton(row, 'Decrease');
    if ((await minus.getAttribute('aria-disabled')) === 'true') continue;
    await minus.click();
    return;
  }
  throw new Error(`No ${label} row can give a dot back`);
}
