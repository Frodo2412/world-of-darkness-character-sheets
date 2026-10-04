# World of Darkness Character Sheets

Interactive character sheets for World of Darkness games, kept in your browser.

The first sheet is **Vampire: The Masquerade 20th Anniversary Edition (V20)**. You get a
roster of characters and, for each one, an interactive version of **page 1** of the
official sheet: the header, attributes, abilities, disciplines, backgrounds, virtues,
Humanity/Path, Willpower, Blood Pool, health, weakness, experience and notes.

## What it does and does not do

- **A record, not a rules engine.** The sheet accepts anything the printed sheet can
  hold. It does not check creation points, clan disciplines, generation limits or wound
  penalties.
- **Saved automatically, in this browser only.** Every change is written to the
  browser's `localStorage`. There is no account, no server and no sync: characters do
  not follow you to another browser or device, and clearing site data removes them.
- **Page 1 only.** Pages 2–4 of the V20 sheet, export/import and printing are not built.

Dots and boxes: activate a dot to set the rating to it; activate the current dot again
to lower the rating by one. From the keyboard, focus a rating and use the arrow keys,
Page Up/Down, Home and End. Health boxes step through bashing (`/`), lethal (`X`),
aggravated (`*`) and empty.

## Running it

Requires Node 22.12 or later.

| Command           | Action                                      |
| :---------------- | :------------------------------------------ |
| `npm install`     | Install dependencies                        |
| `npm run dev`     | Start the dev server at `localhost:4321`    |
| `npm run build`   | Build the static site into `dist/`          |
| `npm run preview` | Serve the built site locally                |

## Tests and checks

| Command             | Action                                                          |
| :------------------ | :-------------------------------------------------------------- |
| `npm test`          | Unit tests (Vitest) for the character model and the store       |
| `npm run test:e2e`  | Feature files run in a browser (Playwright + `playwright-bdd`)  |
| `npm run typecheck` | `astro check`                                                   |
| `npm run lint`      | `oxlint`                                                        |

The end-to-end suite is written as Gherkin. Each `.feature` file under
`features/v20-character-sheet/` is exported from the plan in
`plans/v20-character-sheet.md`; the step definitions that drive the browser are in
`features/steps/`. `npm run test:e2e` builds the site, serves it on port 4322 and runs
every scenario, including an automated WCAG 2.1 AA check of each page state. A scenario
with an undefined step fails the run. The first run needs a browser:
`npx playwright install chromium`.

## How the code is laid out

| Path                        | Role                                                                    |
| :-------------------------- | :---------------------------------------------------------------------- |
| `src/domain/v20/`           | The trait catalogue and the character model: pure functions, no browser |
| `src/storage/`              | The only code that reads or writes `localStorage`                       |
| `src/components/controls/`  | Custom elements: dot rating, box tracker, health track                  |
| `src/components/sheet/`     | Astro components for the sheet's sections                               |
| `src/scripts/`              | Page wiring: a control changes, the model updates, the store saves      |
| `src/pages/`                | The roster (`/`) and the sheet (`/sheet/?id=…`)                         |
| `docs/specs/`, `plans/`     | The spec and the plan this was built from                               |

This is an unofficial fan project. Vampire: The Masquerade and World of Darkness are
trademarks of their owners; no official artwork, logos or text are included.
