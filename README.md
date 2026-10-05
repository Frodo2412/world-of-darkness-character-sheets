# World of Darkness Character Sheets

Interactive character sheets for World of Darkness games, kept in your browser.

The first sheet is **Vampire: The Masquerade 20th Anniversary Edition (V20)**. You get a
roster of characters and, for each one, an interactive version of **page 1** of the
official sheet: the header, attributes, abilities, disciplines, backgrounds, virtues,
Humanity/Path, Willpower, Blood Pool, health, weakness, experience and notes. A
step-by-step **builder** creates a new character by the V20 creation rules.

## What it does and does not do

- **The sheet is a record, not a rules engine.** It accepts anything the printed sheet
  can hold and does not check creation points, clan disciplines, generation limits or
  wound penalties. The rules are applied only while building a character (below).
- **Saved automatically, in this browser only.** Every change is written to the
  browser's `localStorage`. There is no account, no server and no sync: characters do
  not follow you to another browser or device, and clearing site data removes them.
- **Page 1 only.** Pages 2–4 of the V20 sheet, export/import and printing are not built.

## Building a character

"Build a character" on the roster opens the builder: Settings, Concept, Attributes,
Abilities, Advantages and Finishing touches, visited in any order. Every change is saved
as you go, and builds in progress are listed on the roster to continue or delete.

- **Two creation settings** come first, for the Storyteller's house rules: the base
  generation (4th–13th, default 13th) and extra freebie points (0–999, default 0, added
  to the standard 15). Either can be changed later unless the change would leave a trait
  above its new maximum or the freebie points already spent above the new budget; the
  builder then says what to lower first.
- **What it enforces:** Attributes ranked 7/5/3 with one free dot each; Abilities ranked
  13/9/5, none above 3 before freebie points; 3 Discipline dots on the clan's three
  Disciplines (any for Caitiff, including write-ins); 5 Background dots; 7 Virtue dots
  over one free dot each; at most six Disciplines and six Backgrounds. Generation dots
  improve the effective generation (never past 4th), which sets the maximum trait
  rating, the blood pool maximum and blood per turn. Humanity and Willpower come from
  the Virtues. Freebie points cost 5/2/7/1/2/2/1 per Attribute, Ability, Discipline,
  Background, Virtue, Humanity and Willpower dot. A Nosferatu's Appearance is fixed at 0.
  Anything that would break a rule is refused, with the reason shown beside it.
- **Finishing** is blocked until a clan is chosen and every creation dot is placed;
  unspent freebie points only ask for confirmation. The finished build becomes an
  ordinary character on the sheet, freely editable from then on, and the build is removed.
- **Not covered:** Merits and Flaws, Paths of Enlightenment, bloodlines and thin-blooded
  generations, write-in Abilities, experience points, and re-opening a finished
  character in the builder. The starting blood pool is entered by the player; no dice
  are rolled.

## Using the sheet

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
| `npm test`          | Unit tests (Vitest) for the character and creation models and the stores |
| `npm run test:e2e`  | Feature files run in a browser (Playwright + `playwright-bdd`)  |
| `npm run typecheck` | `astro check`                                                   |
| `npm run lint`      | `oxlint`                                                        |

The end-to-end suite is written as Gherkin. Each `.feature` file under
`features/v20-character-sheet/` and `features/character-builder/` is exported from the
matching plan in `plans/`; the step definitions that drive the browser are in
`features/steps/`. `npm run test:e2e` builds the site, serves it on port 4322 and runs
every scenario, including an automated WCAG 2.1 AA check of each page state. A scenario
with an undefined step fails the run. The first run needs a browser:
`npx playwright install chromium`.

## How the code is laid out

| Path                        | Role                                                                    |
| :-------------------------- | :---------------------------------------------------------------------- |
| `src/domain/v20/`           | The trait catalogue and the character model: pure functions, no browser |
| `src/domain/v20/creation/`  | The creation rules and the build model behind the builder               |
| `src/storage/`              | The only code that reads or writes `localStorage`                       |
| `src/components/controls/`  | Custom elements: dot rating, box tracker, health track                  |
| `src/components/sheet/`     | Astro components for the sheet's sections                               |
| `src/components/builder/`   | Astro components for the builder's steps                                |
| `src/scripts/`              | Page wiring: a control changes, the model updates, the store saves      |
| `src/pages/`                | The roster (`/`), the sheet (`/sheet/?id=…`) and the builder (`/build/?id=…`) |
| `docs/specs/`, `plans/`     | The spec and the plan this was built from                               |

This is an unofficial fan project. Vampire: The Masquerade and World of Darkness are
trademarks of their owners; no official artwork, logos or text are included.
