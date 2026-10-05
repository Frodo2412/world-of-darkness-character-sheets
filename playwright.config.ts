import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

// Separate from the dev server's 4321 so both can run at once.
const PORT = 4322;
const baseURL = `http://localhost:${PORT}`;

// Feature files are the executable specification; step definitions bind them
// to the browser. A scenario with a step nobody has defined fails the run.
const testDir = defineBddConfig({
  // The play-view redesign lands slice by slice: a feature file joins the run
  // when its slice is built. Collapse back to 'features/**/*.feature' once all seven are in.
  features: [
    'features/v20-character-sheet/**/*.feature',
    'features/character-builder/**/*.feature',
    'features/sheet-play-view-redesign/slice-1-*.feature',
    'features/sheet-play-view-redesign/slice-2-*.feature',
  ],
  steps: 'features/steps/**/*.ts',
  missingSteps: 'fail-on-gen',
  // A Given and a Then may share wording ("Brawl is rated 3" sets it up or
  // checks it), so steps are matched by keyword as well as text.
  matchKeywords: true,
});

export default defineConfig({
  testDir,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // --ignore-lock keeps `astro preview` in the foreground: Astro otherwise
    // backgrounds itself when run by a coding agent, and Playwright needs the
    // process to stay attached.
    command: `npm run build && npm run preview -- --port ${PORT} --ignore-lock`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
