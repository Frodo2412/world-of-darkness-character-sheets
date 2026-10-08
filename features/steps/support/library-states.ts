import { expect, type Page } from '@playwright/test';
import { clearFiltersButton, createAction, noMatchState, searchField, statusRegion } from './pages';
import { refuseWrites } from './storage';

/** The states of the roster an accessibility check is made in. */
export const LIBRARY_STATES = ['full', 'no match', 'empty', 'storage unavailable', 'create refused'] as const;
export type LibraryState = (typeof LIBRARY_STATES)[number];

/** A state the feature names that no step knows would otherwise be checked as the full library. */
export function assertLibraryState(state: string): asserts state is LibraryState {
  if (!(LIBRARY_STATES as readonly string[]).includes(state)) {
    throw new Error(`unknown library state "${state}": the states are ${LIBRARY_STATES.join(', ')}`);
  }
}

/** Takes an open roster into `state`; "full", "empty" and "storage unavailable" are made by what was stored, so nothing is left to do. */
export async function putRosterInState(page: Page, state: string | undefined): Promise<void> {
  if (state !== undefined) assertLibraryState(state);
  if (state === 'no match') {
    await searchField(page).fill('zzz');
    await expect(noMatchState(page)).toBeVisible();
    await expect(clearFiltersButton(page)).toBeVisible();
  } else if (state === 'create refused') {
    await refuseWrites(page);
    await createAction(page, 'Start with a blank sheet').click();
    await expect(statusRegion(page)).toBeVisible();
  }
}
