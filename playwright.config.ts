import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

// Separate from the dev server's 4321 so both can run at once.
const PORT = 4322;
const baseURL = `http://localhost:${PORT}`;

// Feature files are the executable specification; step definitions bind them
// to the browser. A scenario with a step nobody has defined fails the run.
const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: 'features/steps/**/*.ts',
  // Builder slices not yet built have no steps; their scenarios are skipped
  // until the last slice restores 'fail-on-gen'.
  missingSteps: 'skip-scenario',
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
