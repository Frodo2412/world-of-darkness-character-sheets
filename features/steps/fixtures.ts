import { test as base, createBdd } from 'playwright-bdd';
import type { V20Character } from '../../src/domain/v20/character';
import type { V20Build } from '../../src/domain/v20/creation/build';

/** What earlier steps of a scenario did, for later steps to check against. */
interface ScenarioMemory {
  /** Text typed into the sheet, by field label. */
  entered: Map<string, string>;
  /** Characters arranged as already saved, in roster order. */
  saved: V20Character[];
  /** The rating the scenario is working with. */
  rating: string;
  /** The health box the scenario is working with. */
  healthLevel: string;
  /** A stored record the scenario damaged, with the exact text it was left holding. */
  damaged?: { id: string; key: string; text: string };
  /** Accessibility rule ids the page broke, with the elements that broke them. */
  violations?: string[];
  /** Ratings as a scenario arranged them, by trait name, to check later. */
  ratings: Map<string, number>;
  /** The build a scenario arranged, for later steps to change or find again. */
  build?: V20Build;
  /** The question a confirmation asked, kept after it closed. */
  asked?: string;
  /** Each place keyboard focus stopped, and whether a focus indicator was drawn there. */
  focusStops: { control: string; visible: boolean }[];
  /** What each Tab press in a scenario reached, by the control's name. */
  tabbedControls: string[];
  /** The text each opened sheet showed, in the order they were opened. */
  visited: string[];
}

// Every step file imports Given/When/Then from here so scenarios share one
// set of fixtures.
export const test = base.extend<{ memory: ScenarioMemory }>({
  // Playwright requires the first fixture argument to be a destructuring pattern.
  // oxlint-disable-next-line no-empty-pattern
  memory: async ({}, use) => {
    await use({
      entered: new Map(),
      ratings: new Map(),
      saved: [],
      rating: '',
      healthLevel: '',
      focusStops: [],
      tabbedControls: [],
      visited: [],
    });
  },
});
export const { Given, When, Then } = createBdd(test);
