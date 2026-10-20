// The Nature & Demeanor screen: the two role cards, the role switch, the player's own archetype, the search
// and the archetype buttons. This file is the one place that knows their markup.

import { expect, type Locator, type Page } from '@playwright/test';
import { openStep } from './builder';

export type Role = 'Nature' | 'Demeanor';

export async function openNatureScreen(page: Page): Promise<void> {
  await openStep(page, 'Nature & Demeanor');
}

/** The role card for Nature or Demeanor, and the text it holds. */
export const roleCard = (page: Page, role: Role): Locator => page.locator(`[data-nd-card="${role.toLowerCase()}"]`);
export const roleCardValue = (page: Page, role: Role): Locator => roleCard(page, role).locator('[data-nd-value]');

/** The switch that says which role a press assigns to, and its two options. */
export const roleSwitch = (page: Page): Locator => page.locator('#builder').getByRole('radiogroup', { name: 'Role to assign', exact: true });
export const roleOption = (page: Page, role: Role): Locator => roleSwitch(page).getByRole('radio', { name: `Assign as ${role}`, exact: true });

/** The field for the player's own archetype. */
export const ownArchetype = (page: Page): Locator => page.locator('#builder').getByRole('textbox', { name: 'Write your own archetype', exact: true });

export const archetypeSearch = (page: Page): Locator => page.locator('#builder').getByRole('searchbox', { name: 'Search archetypes', exact: true });
export const archetypeResults = (page: Page): Locator => page.locator('[data-nd-results]');
export const archetypeHeading = (page: Page): Locator => page.locator('[data-nd-heading]');

/** The "Visionary assigned as Nature." status. */
export const assignmentNotice = (page: Page): Locator => page.locator('[data-nd-assigned]');

export const archetypeList = (page: Page): Locator => page.locator('#builder').getByRole('group', { name: 'Archetypes', exact: true });
export const listedArchetypes = (page: Page): Locator => archetypeList(page).getByRole('button');
export const archetypeButton = (page: Page, name: string): Locator => archetypeList(page).getByRole('button', { name, exact: true });
export const archetypeMarks = (page: Page, name: string): Locator => archetypeButton(page, name).locator('[data-archetype-marks]');
const archetypeState = (page: Page, name: string): Locator => archetypeButton(page, name).locator('[data-archetype-state]');

/** Makes `role` the one a press assigns to, opening the screen first. */
export async function chooseRole(page: Page, role: Role): Promise<void> {
  await openNatureScreen(page);
  await roleOption(page, role).check();
}

/** Presses an archetype for the role that is active now. */
export async function pressArchetype(page: Page, name: string): Promise<void> {
  await openNatureScreen(page);
  await archetypeButton(page, name).click();
}

/** Assigns `name` to `role`: switches to the role, then presses the name. */
export async function assignArchetype(page: Page, name: string, role: Role): Promise<void> {
  await chooseRole(page, role);
  await pressArchetype(page, name);
}

/** What each card holds now: [Nature, Demeanor]. */
export async function cardValues(page: Page): Promise<string[]> {
  await openNatureScreen(page);
  return [(await roleCardValue(page, 'Nature').textContent())!.trim(), (await roleCardValue(page, 'Demeanor').textContent())!.trim()];
}

/** The archetype reads Selected in text and to assistive technology (pressed). */
export async function expectArchetypeSelected(page: Page, name: string): Promise<void> {
  await expect(archetypeState(page, name)).toBeVisible();
  await expect(archetypeState(page, name)).toContainText('Selected');
  await expect(archetypeButton(page, name)).toHaveAttribute('aria-pressed', 'true');
}

/** The archetype shows no state word and is not pressed. */
export async function expectArchetypeNotSelected(page: Page, name: string): Promise<void> {
  await expect(archetypeState(page, name)).toBeHidden();
  await expect(archetypeButton(page, name)).toHaveAttribute('aria-pressed', 'false');
}

/** The names of the archetypes the search lists. */
export const listedNames = (page: Page): Promise<string[]> =>
  listedArchetypes(page).evaluateAll((buttons) => buttons.map((button) => button.getAttribute('data-archetype') ?? ''));
