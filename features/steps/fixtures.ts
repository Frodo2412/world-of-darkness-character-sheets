import type { Locator } from '@playwright/test';
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
  /** Every record in storage as a scenario left it, to check later that nothing changed it. */
  stored?: Record<string, string>;
  /** The roster entry the scenario is talking about, for steps that say "it". */
  entry?: Locator;
  /** Accessibility rule ids the page broke, with the elements that broke them. */
  violations?: string[];
  /** Ratings as a scenario arranged them, by trait name, to check later. */
  ratings: Map<string, number>;
  /** The build a scenario arranged, for later steps to change or find again. */
  build?: V20Build;
  /** Each place keyboard focus stopped, and whether a focus indicator was drawn there. */
  focusStops: { control: string; visible: boolean; thickness?: number }[];
  /** What each Tab press in a scenario reached, by the control's name. */
  tabbedControls: string[];
  /** The text each opened sheet showed, in the order they were opened. */
  visited: string[];
  /** The rows keyboard focus reached while something held in view covered them, by name. */
  coveredRows: string[];
  /** The state a scenario asked the roster to be checked in, applied once the roster is open. */
  libraryState?: string;
  /** Whether "No characters match." was seen on the way. */
  noMatchSeen?: boolean;
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
      coveredRows: [],
    });
  },
});
export const { Given, When, Then } = createBdd(test);
