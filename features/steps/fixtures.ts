import { test as base, createBdd } from 'playwright-bdd';
import type { V20Character } from '../../src/domain/v20/character';

/** What earlier steps of a scenario did, for later steps to check against. */
interface ScenarioMemory {
  /** Text typed into the sheet, by field label. */
  entered: Map<string, string>;
  /** Characters arranged as already saved, in roster order. */
  saved: V20Character[];
  /** The rating the scenario is working with. */
  rating: string;
}

// Every step file imports Given/When/Then from here so scenarios share one
// set of fixtures.
export const test = base.extend<{ memory: ScenarioMemory }>({
  // Playwright requires the first fixture argument to be a destructuring pattern.
  // oxlint-disable-next-line no-empty-pattern
  memory: async ({}, use) => {
    await use({ entered: new Map(), saved: [], rating: '' });
  },
});
export const { Given, When, Then } = createBdd(test);
