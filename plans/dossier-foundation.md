# Plan: Dossier foundation (PR A of Dossier Tabs)

**Created**: 2026-10-08
**Split from**: `plans/dossier-tabs.md` on 2026-10-10 (the parent keeps Slices 6–14, PRs B and C)
**Branch**: `feat/dossier-foundation`
**Status**: implemented
**Gherkin persistence**: features
**Spec**: `docs/specs/dossier-tabs.md`
**Design**: Figma `TAvjmr6RE0rHV8kz56Ffs0` (see the parent plan)

## Goal

PR A of the three stacked PRs: the tab host and shell contract (Slice 1), the stored data and experience
ledger (Slice 2), the shared dossier parts (Slice 3) and the two rulebook-data slices (Slices 4 and 5).
No tab is visible yet: the Character sheet is the only registered tab, so the page is unchanged. Stored
records written before this work keep loading. The approach stance, plan decisions, acceptance criteria
and conventions for tab slices are in the parent plan and are not repeated here; the acceptance criteria
this PR proves are F1, F2 (fixed order and the folder/descriptor consistency check, by unit tests; a second real tab reaching the bar is proven in Slice 14), F3 (unknown key, address), F5 and J6 (ledger arithmetic), and the host's part of F4 (arrows, Home, End, Enter, Space; axe on the Character sheet), F6 and F7 (identity, mode toggle, save status on the Character sheet). The rest of F3, F4, F6 and F7 is proven with the other tabs in Slice 14.

## Slices

### Slice 1: Tab host and shell

**Depends-on:** none
**Files:** `src/pages/sheet.astro`, `src/scripts/sheet.ts`, `src/scripts/sheet/pool.ts`, `src/scripts/sheet/poolCard.ts`, `src/scripts/sheet/observers/**`, `src/domain/v20/poolText.ts`, `src/domain/v20/poolText.test.ts`, `src/scripts/tabs/**`, `src/components/tabs/**`, `src/components/AppBar.astro`, `src/styles/tabs.css`, `features/dossier-tabs/slice-1-*.feature`, `features/steps/fixtures.ts`, `features/steps/shared.steps.ts`, `features/steps/tab-host.steps.ts`, `features/steps/support/tabs.ts`, `features/steps/support/accessibility.ts`

**Ownership of today's `sheet.ts`** (the Character sheet is the first consumer of the contract):

| Stays in the shell (outside any tab panel) | Moves to the Character sheet tab (`sheetTab`) |
| --- | --- |
| Loading, not-found and unreadable states; the `storage` and `pageshow` handlers; mode and the mode toggle and its announcer; `apply` and saving; Identity and its text inputs; the save status; the resources row (Blood Pool, Willpower, Health, Humanity) with its steppers, health track and wound announcement; the app-bar slot; observers; the pool state | Attribute, Ability, Virtue, Discipline and Selected-pool cards; trait selection (`.trait-select`); specialty and write-in inputs; the pool card and `announcePool`, re-spoken through the `changed(before, after)` hook when a wound changes |

**Behavior:**

```gherkin
Feature: The sheet's tab host

  Scenario: The sheet opens on the Character sheet
    Given a saved character
    When the Character sheet tab is opened
    Then the character's name, the mode toggle, the save status and the resources row are shown
    And the Attributes and Abilities cards are shown

  Scenario: An unknown tab name falls back to the Character sheet
    Given a saved character
    When its sheet is opened with the tab name "nonsense"
    Then the Character sheet is shown
    And no error is shown

  Scenario: The Character sheet still works as before
    Given a character in edit mode
    When the player raises Strength to 4 and returns to play mode
    Then the sheet shows Strength 4 and it is still 4 after a reload

  Scenario: A wound re-announces the selected pool
    Given a character in play mode with Strength and Brawl selected
    When the player marks a Hurt wound
    Then the Selected pool is announced with the wound subtracted

  Scenario: A missing character is still reported
    Given no character is saved with the address's id
    When the sheet is opened with the tab name "combat"
    Then "Character not found" is shown
```

Behaviors that need a second tab (bar order, Space, Back) are covered by unit and Astro-container
tests here and end to end in Slice 14.

**Steps:**

#### Step 1.1: The tab registry

**Complexity**: standard
**IMPLEMENT**: A pure function from descriptors (key, label, order, showsResources) to the visible tab list: the Character sheet first, then the rest by `order`; `showBar` only when two or more tabs exist
**TEST**: Unit tests: none registered → Character sheet only and `showBar` false; out-of-order input comes back ordered; a duplicate key and a duplicate order are both rejected
**REFACTOR**: One `TabDescriptor` type in `src/scripts/tabs/descriptor.ts`; nothing restates its fields
**Files**: `src/scripts/tabs/registry.ts`, `src/scripts/tabs/registry.test.ts`, `src/scripts/tabs/descriptor.ts`
**Commit**: `feat(tabs): tab registry with fixed order`

#### Step 1.2: Tab addresses

**Complexity**: standard
**IMPLEMENT**: Pure `tabFromUrl(url, keys)` (absent or unknown → Character sheet) and `hrefFor(url, key)` keeping `id`, setting or clearing `tab`, never carrying `#edit`; `titleFor(tab, character)` giving "<Tab> · <Character>"
**TEST**: Unit tests: absent, known, unknown and empty values; built address keeps `id`; the title for a blank name is "Unnamed character"
**REFACTOR**: Key type shared with Step 1.1
**Files**: `src/scripts/tabs/address.ts`, `src/scripts/tabs/address.test.ts`
**Commit**: `feat(tabs): read and build tab addresses`

#### Step 1.3: The shell split and the tab contract

**Complexity**: complex
**IMPLEMENT**: Refactor `sheet.ts` along the ownership table above. Define the contract in `src/scripts/tabs/context.ts` (see Conventions): `mount(ctx)` returns `{ render, enter?, leave?, changed? }`; the shell calls `render` on the active tab on every apply and mode change, `enter` and `leave` on switches, and `changed(before, after)` on every apply. Identity and the resources row move out of the panel wrapper (the shell hides the row when the active descriptor has `showsResources: false`). The Character sheet becomes the first tab (`sheetTab.ts`), its queries scoped to its own panel
**TEST**: All existing sheet scenarios stay green (pool, modes, resources, play layout); a contract test with a fake tab asserts render is called on the active tab only, once per apply and per mode change, `leave` is called before the next `enter`, and a focused input is not rewritten during render; the "wound re-announces the pool" scenario passes
**REFACTOR**: `sheet.ts` names no tab; every `querySelectorAll` takes a root
**Files**: `src/scripts/sheet.ts`, `src/scripts/tabs/context.ts`, `src/scripts/tabs/sheetTab.ts`, `src/scripts/tabs/shell.test.ts`, `src/pages/sheet.astro`, `features/steps/tab-host.steps.ts`
**Commit**: `refactor(sheet): shell with per-tab mount and context`

#### Step 1.4: Panels and descriptors from one glob

**Complexity**: complex
**IMPLEMENT**: Spike first: confirm `import.meta.glob('../tabs/*/descriptor.ts', { eager: true })` can drive both the server panel list (`Panel.astro` per folder, rendered in `sheet.astro`) and the client registry, and that `mount` loads lazily. Add a build-time check that every descriptor has a sibling `Panel.astro` and vice versa. Each panel is a `role="tabpanel"` wrapper labelled by its tab; only the active one is visible. If the spike fails, fall back to a `prebuild` script writing `src/tabs/index.ts` with the same shape, decided in this step
**TEST**: Build passes with zero extra tabs; unit test of the folder/descriptor consistency check; the "opens on the Character sheet" and "unknown tab name" scenarios pass
**REFACTOR**: `sheet.astro` names no tab; no per-panel conditionals
**Files**: `src/pages/sheet.astro`, `src/scripts/tabs/discover.ts`, `src/scripts/tabs/discover.test.ts`
**Commit**: `feat(tabs): discover tabs from one descriptor glob`

#### Step 1.5: The tab bar

**Complexity**: standard
**IMPLEMENT**: Rendered only when `showBar`: links whose `href`s are filled in at runtime from `hrefFor` (the id is not known at build time), `role="tablist"` / `role="tab"`, `aria-selected`, `aria-controls`, roving focus; arrows, Home and End move focus; Enter and Space activate (Space prevents the page scroll); ctrl/cmd/shift/middle clicks are left to the browser; a plain click switches with `pushState`, and `popstate` restores the tab; on a switch focus goes to the panel heading, scroll resets to the panel, and `document.title` updates; the bar scrolls sideways inside itself and keeps the active tab in view; the active tab has an underline and bold weight in addition to `aria-selected`
**TEST**: Unit tests for the key mapping (including Space and wrap) and for `popstate` handling with a fake history; Astro-container render test of `TabBar.astro` with two fixture tabs asserting roles, `aria-selected`, `aria-controls` and a text/shape marker, and that one tab renders no bar
**REFACTOR**: Key mapping and history handling stay pure and separate from the element
**Files**: `src/components/tabs/TabBar.astro`, `src/scripts/tabs/tabBar.ts`, `src/scripts/tabs/tabBar.test.ts`, `src/scripts/tabs/history.ts`, `src/scripts/tabs/history.test.ts`, `src/styles/tabs.css`, `src/pages/sheet.astro`
**Commit**: `feat(tabs): accessible tab bar with history`

#### Step 1.6: Observers, the application-bar slot and context services

**Complexity**: standard
**IMPLEMENT**: A named slot in `AppBar.astro` for the sheet (`data-app-bar-label`, empty elsewhere); the shell runs every module in `src/scripts/sheet/observers/*.ts` (each exports `afterRender(character, root)`) after each render on every tab; `ctx.announce(text)` writing to one polite live region; `ctx.stamp` supplying `newId` (via `generateId`) and `now` (`Date.now`)
**TEST**: Unit test that observers run after every render and on every tab; `announce` writes once per call; the roster and builder app bars render unchanged (existing scenarios)
**REFACTOR**: One live-region element shared with the mode announcement
**Files**: `src/components/AppBar.astro`, `src/scripts/sheet/observers/index.ts`, `src/scripts/tabs/context.ts`, `src/scripts/tabs/services.ts`, `src/scripts/tabs/services.test.ts`
**Commit**: `feat(sheet): observers, app-bar slot and announce service`

#### Step 1.7: One pool wording and `selectPool`

**Complexity**: standard
**IMPLEMENT**: Move `poolFormula` out of `poolCard.ts` into `src/domain/v20/poolText.ts` (full labels, "− wound N") and re-import it in `poolCard.ts`; `pool.select(selection)` sets both rows at once; `ctx.selectPool` uses it
**TEST**: Unit tests for the formula text (with and without wound, Melee 0, Incapacitated) and `pool.select`; the existing selected-pool scenarios pass unchanged
**REFACTOR**: Selected pool card draws from the moved helper only
**Files**: `src/domain/v20/poolText.ts`, `src/domain/v20/poolText.test.ts`, `src/scripts/sheet/poolCard.ts`, `src/scripts/sheet/pool.ts`, `src/scripts/tabs/context.ts`
**Commit**: `refactor(sheet): shared pool wording and selectPool`

#### Step 1.8: Test support for every slice

**Complexity**: standard
**IMPLEMENT**: `memoryFor(world, key, init)` typed accessor replacing an untyped bag in `fixtures.ts`; `support/tabs.ts` with `openSheetTab`, `activeTab`; `shared.steps.ts` defining every shared phrase from Conventions; `support/accessibility.ts` gains `scanTab(page, tab)` running axe over play and edit mode; a fixed-clock helper using Playwright's clock
**TEST**: The shared phrases are used by the Slice 1 scenarios; a self-test lists step definitions and fails on any duplicate text
**REFACTOR**: No edit to `pages.ts`
**Files**: `features/steps/fixtures.ts`, `features/steps/shared.steps.ts`, `features/steps/support/tabs.ts`, `features/steps/support/accessibility.ts`
**Commit**: `test(tabs): typed scenario memory and shared steps`

### Slice 2: Stored data and the experience ledger

**Depends-on:** none
**Files:** `src/domain/v20/character.ts`, `src/domain/v20/character.test.ts`, `src/domain/v20/namedRating.ts`, `src/domain/v20/dossier/types.ts`, `src/domain/v20/dossier/validate.ts`, `src/domain/v20/dossier/validate.test.ts`, `src/domain/v20/journal/types.ts`, `src/domain/v20/journal/validate.ts`, `src/domain/v20/journal/validate.test.ts`, `src/domain/v20/journal/stamp.ts`, `src/domain/v20/journal/sessions.ts`, `src/domain/v20/journal/sessions.test.ts`, `src/domain/v20/experience/ledger.ts`, `src/domain/v20/experience/ledger.test.ts`, `src/domain/v20/experience/costs.ts`, `src/domain/v20/experience/costs.test.ts`, `src/domain/v20/creation/progress.test.ts`, `src/storage/characterStore.ts`, `src/storage/characterStore.test.ts`, `features/dossier-tabs/slice-2-*.feature`, `features/steps/dossier-data.steps.ts`

**Behavior:**

```gherkin
Feature: Stored character data for the dossier tabs

  Scenario: A character saved before the dossier tabs opens unchanged
    Given a character saved before the dossier tabs existed, with text in its notes, experience and weakness fields
    When its sheet is opened and a trait is changed
    Then the sheet shows the character as before
    And the saved notes, experience and weakness text is exactly what it was

  Scenario Outline: A damaged dossier field is reported, not repaired
    Given a saved character whose <field> data is damaged
    And another undamaged saved character
    When the damaged character's sheet is opened
    Then "Character could not be read" is shown
    And the damaged record is not changed
    And the roster still lists the other character
    Examples:
      | field   |
      | journal |
      | merits  |
      | havens  |

  Scenario: A character with more than six backgrounds is readable everywhere
    Given a saved character with eight named backgrounds
    When the roster is opened and then the character's sheet
    Then the character is listed and its sheet opens
    And a build of that character in the builder reports progress without error
```

Session and ledger arithmetic (J4, J6) is verified by unit and property tests on the pure model.

**Steps:**

#### Step 2.1: Additive types, blank defaults and the field list

**Complexity**: complex
**IMPLEMENT**: Declare every new field from the spec's data table in `V20Character` with blank defaults in `blankCharacter`. `BackgroundRow extends NamedRating` with optional `summary`, `note` and `people` (the details live on the row, so reordering or removing a row cannot detach them). `NamedRating` moves to `namedRating.ts` (re-exported from `character.ts`) so dossier and journal types never import `character.ts`. One exported `DOSSIER_FIELDS` constant lists every new top-level field. `schemaVersion` stays 1
**TEST**: Unit tests: `blankCharacter` has every `DOSSIER_FIELDS` entry blank; a character round-trips through JSON unchanged; legacy fields untouched
**REFACTOR**: Each family of types in its own file; `character.ts` re-exports them so later slices never edit it
**Files**: `src/domain/v20/character.ts`, `src/domain/v20/character.test.ts`, `src/domain/v20/namedRating.ts`, `src/domain/v20/dossier/types.ts`, `src/domain/v20/journal/types.ts`
**Commit**: `feat(model): additive dossier fields on the character`

#### Step 2.2: Loading old records

**Complexity**: complex
**IMPLEMENT**: In `characterStore.ts`, `parseRecord` fills every `DOSSIER_FIELDS` entry that is missing (replacing the one-off `withSpecialties`), checks the legacy shape against a template built without the dossier keys and with `backgrounds` checked for "at least six rows, each a row", then validates each dossier field with its own validator next to its types. A damaged dossier field makes the record unreadable and it is never rewritten. `hasShapeOf` and `storagePort.ts` are left untouched
**TEST**: Unit tests: a pre-work record loads; eight backgrounds load; each damaged-field case (wrong type, a note without an id, a session flag that is not a boolean, a merit without points) is unreadable; the builder store's behavior is unchanged
**REFACTOR**: The back-fill list, the legacy template and the validator dispatch are all derived from `DOSSIER_FIELDS`; no second list
**Files**: `src/storage/characterStore.ts`, `src/storage/characterStore.test.ts`, `src/domain/v20/dossier/validate.ts`, `src/domain/v20/dossier/validate.test.ts`, `src/domain/v20/journal/validate.ts`, `src/domain/v20/journal/validate.test.ts`
**Commit**: `feat(store): read records saved before the dossier fields`

#### Step 2.3: Rows keep their details; consumers tolerate more than six

**Complexity**: standard
**IMPLEMENT**: `setNamedRow` spreads the current row so unknown fields survive a name or rating edit. Audit every consumer of `backgrounds` (`toCharacter.ts`, `progress.ts`, `library.ts`, the builder's Advantages and FinishingTouches, the sheet) and fix any that assume exactly six
**TEST**: Unit tests: a row's summary, note and people survive `setNamedRow` for name and rating; builder `progress` and `toCharacter` with eight rows; `library` listing of an eight-background character; each consumer found by the audit has a test or an explicit note in the commit body
**REFACTOR**: Replace any literal `6` in a consumer with the row count of the data
**Files**: `src/domain/v20/character.ts`, `src/domain/v20/character.test.ts`, `src/domain/v20/creation/progress.test.ts`
**Commit**: `fix(model): background rows keep details and may exceed six`

#### Step 2.4: Legacy and damaged-record scenarios

**Complexity**: standard
**IMPLEMENT**: Step definitions and seeded legacy and damaged records for the three scenarios
**TEST**: The three scenarios pass; every legacy free-text field is byte-identical after an edit
**REFACTOR**: Reuse `characterArranged` and `overwriteRecord`; no new seed helper
**Files**: `features/steps/dossier-data.steps.ts`
**Commit**: `test(store): legacy and damaged records open or are reported`

#### Step 2.5: Sessions

**Complexity**: standard
**IMPLEMENT**: A `Stamp` type (`{ newId(): string; now(): number }`) defined once in `journal/stamp.ts`; pure `startSession(journal, title, stamp)` (new session becomes the only current one), `currentSession`, `renameSession`, `makeCurrent`
**TEST**: Unit tests with a deterministic stamp: first session is current; a second makes the first not current; `makeCurrent` swaps; exactly one current after any sequence; blank or whitespace title becomes "Session N"; ids unique
**REFACTOR**: One `withCurrent` helper
**Files**: `src/domain/v20/journal/stamp.ts`, `src/domain/v20/journal/sessions.ts`, `src/domain/v20/journal/sessions.test.ts`
**Commit**: `feat(journal): sessions with one current`

#### Step 2.6: The experience ledger

**Complexity**: standard
**IMPLEMENT**: Pure `awardXp`, `recordSpending` (taking a `Stamp`), `removeSpendings(ids)` (for Undo) and `experienceTotals` giving earned, spent, available and this-session, where available = earned − spent
**TEST**: Unit tests: empty ledger all zero; sums; a negative award subtracts; this-session counts only the current session; available goes negative and stays reported as such; a record for a session that no longer exists still counts; a property test over random ledgers asserts earned − spent = available and that removing exactly the spendings added restores the totals
**REFACTOR**: Totals from one reducer
**Files**: `src/domain/v20/experience/ledger.ts`, `src/domain/v20/experience/ledger.test.ts`
**Commit**: `feat(experience): ledger totals`

#### Step 2.7: The V20 experience cost table

**Complexity**: trivial
**IMPLEMENT**: The cost table as data (new Ability 3; Ability ×2; Attribute ×4; in-clan Discipline ×5; out-of-clan ×7; Caitiff ×6; Virtue ×2; Humanity / Path ×2; permanent Willpower current rating) with the labels both the Journal reference and Level up show
**TEST**: Unit test for each label and multiplier
**REFACTOR**: None; data only
**Files**: `src/domain/v20/experience/costs.ts`, `src/domain/v20/experience/costs.test.ts`
**Commit**: `feat(experience): V20 cost table`

### Slice 3: Shared dossier parts

**Depends-on:** none
**Files:** `src/components/dossier/**`, `src/scripts/dossier/**`, `src/styles/dossier.css`, `src/styles/contrast.test.ts`, `src/domain/v20/search.ts`, `src/domain/v20/search.test.ts`, `src/domain/v20/labels.ts`, `src/domain/v20/labels.test.ts`

This slice has no scenarios of its own: its parts have no page. Pure parts are unit-tested; component
markup is checked by Astro-container render tests; behavior is proven by the scenarios of the
tabs that use them (disclosure in Slice 6, undo in Slice 7, the session prompt in Slices 10–12,
the segmented control in Slices 6 and 8). If Vitest cannot render Astro components in this repository
the first sub-task of Step 3.3 is to say so, and the render tests move to the consuming slices.

**Behavior:** none (see above).

**Steps:**

#### Step 3.1: Text matching

**Complexity**: standard
**IMPLEMENT**: `matchesQuery(query, ...fields)`: every whitespace-separated word occurs in some field, ignoring case, accents and surrounding space; empty query matches all; undefined fields allowed. Uses `folded` from `text.ts`
**TEST**: Unit tests: case ("ELOISE"), accent ("Éloïse" found by "eloise"), words spread across fields, empty, no match, undefined field
**REFACTOR**: Reuse `folded`; no new normaliser
**Files**: `src/domain/v20/search.ts`, `src/domain/v20/search.test.ts`
**Commit**: `feat(dossier): text matching for search`

#### Step 3.2: Count and points labels

**Complexity**: trivial
**IMPLEMENT**: In `labels.ts`: `countLabel(n, singular, plural)` ("1 entry", "3 entries"), `pointsLabel(n)` for a row ("1 pt", "2 pts") and `pointsTotalLabel(n)` for a section header ("1 point", "3 points")
**TEST**: Unit tests: 0, 1, 2 and large numbers for each
**REFACTOR**: None
**Files**: `src/domain/v20/labels.ts`, `src/domain/v20/labels.test.ts`
**Commit**: `feat(dossier): count and points labels`

#### Step 3.3: Heading, hint, chips and empty state

**Complexity**: standard
**IMPLEMENT**: Astro components `SectionHeading` (title + count), `ReadOnlyHint` (shown in play mode through `data-sheet-mode-only`; text "Read-only in play · edit character to change"), `TagChips`, `EmptyState` (message plus an optional next action); styles from existing tokens in `dossier.css`
**TEST**: Astro-container render tests: heading text and count, hint present in markup with the mode attribute, chips as a list, empty state with and without an action
**REFACTOR**: One `dossier-` class prefix
**Files**: `src/components/dossier/SectionHeading.astro`, `src/components/dossier/ReadOnlyHint.astro`, `src/components/dossier/TagChips.astro`, `src/components/dossier/EmptyState.astro`, `src/styles/dossier.css`, `src/components/dossier/dossier.test.ts`
**Commit**: `feat(dossier): heading, hint, chips and empty state`

#### Step 3.4: Reference table

**Complexity**: standard
**IMPLEMENT**: `ReferenceTable`: caption, headings with `scope`, rows from slots, and its own horizontal scroll container (focusable, labelled) so a narrow screen never scrolls the page
**TEST**: Container render test: caption, `scope`, scroll container attributes
**REFACTOR**: Spacing shared with the heading
**Files**: `src/components/dossier/ReferenceTable.astro`, `src/styles/dossier.css`, `src/components/dossier/dossier.test.ts`
**Commit**: `feat(dossier): reference table`

#### Step 3.5: Segmented control, selectable list and disclosure styles

**Complexity**: standard
**IMPLEMENT**: `SegmentedControl` (buttons with `aria-pressed` and a text marker on the pressed one; arrow keys move focus, Enter and Space press); `SelectableList` item pattern (`aria-current="true"` plus a visible text marker); styles for native `<details>`/`<summary>` as the shared disclosure (heading button semantics and Enter/Space for free; no custom element)
**TEST**: Unit test the pure key mapping; container render tests for `aria-pressed`, `aria-current` and the text markers
**REFACTOR**: Key mapping shared with the tab bar's pure function by import
**Files**: `src/components/dossier/SegmentedControl.astro`, `src/components/dossier/SelectableItem.astro`, `src/scripts/dossier/segmented.ts`, `src/scripts/dossier/segmented.test.ts`, `src/styles/dossier.css`
**Commit**: `feat(dossier): segmented control, selectable list, disclosure`

#### Step 3.6: Search field

**Complexity**: standard
**IMPLEMENT**: `SearchField`: labelled input with a clear button and a polite result-count region; pure `filterBy(items, query, fieldsOf)` built on `matchesQuery`
**TEST**: Unit test `filterBy`; container render test for the label, clear button and live region
**REFACTOR**: None
**Files**: `src/components/dossier/SearchField.astro`, `src/scripts/dossier/filterBy.ts`, `src/scripts/dossier/filterBy.test.ts`
**Commit**: `feat(dossier): search field`

#### Step 3.7: Undo notice and session prompt

**Complexity**: standard
**IMPLEMENT**: A pure `undoWindow` (holds one removed entry and its restore function for ten seconds; a second removal replaces the first) with an `UndoNotice` component ("Removed <name>. Undo"); a `SessionPrompt` component with the exact wording from Conventions that emits a `start-session` event carrying the title
**TEST**: Unit tests: the undo window expires with a fake clock, restores once, and is replaced by a later removal; container render tests of both components' text
**REFACTOR**: Shared live-region wiring through `ctx.announce`, not a second region
**Files**: `src/components/dossier/UndoNotice.astro`, `src/components/dossier/SessionPrompt.astro`, `src/scripts/dossier/undoWindow.ts`, `src/scripts/dossier/undoWindow.test.ts`
**Commit**: `feat(dossier): undo notice and session prompt`

#### Step 3.8: Contrast and size guard

**Complexity**: standard
**IMPLEMENT**: A unit test that reads the text and background color tokens used by `dossier.css` and the tab stylesheets' declared pairs and asserts 4.5:1 for text (3:1 for large text and control borders), a 12 px minimum text size and a 24 × 24 px minimum control size from the CSS
**TEST**: The test itself; it fails on a deliberately low-contrast pair in a fixture
**REFACTOR**: Token names read from `global.css`, not copied
**Files**: `src/styles/dossier.css`, `src/styles/contrast.test.ts`
**Commit**: `test(styles): contrast and size guard for dossier tokens`

### Slice 4: Discipline catalogue data

**Depends-on:** none
**Files:** `src/domain/v20/disciplines.ts`, `src/domain/v20/disciplines.test.ts`, `src/domain/v20/disciplineData/**`

Data only; no UI, so no scenarios. Extraction reads the V20 PDF at its absolute path in the main
checkout (`/Users/brunolemus/Projects/Personal/WorldOfDarknessCharacterSheets/docs/references/sourcebooks/Vampire the Masquerade - 20th Anniversary Edition.pdf`) with `pypdf`, because worktrees contain only tracked files. Check `docs/references/sheets/` too. A field the book does not state cleanly stays undefined.

**Behavior:** none (verified by unit tests on shape and by the human data review).

**Steps:**

#### Step 4.1: Split the catalogue from the reading logic

**Complexity**: standard
**IMPLEMENT**: Move the catalogue entries out of `disciplines.ts` into `src/domain/v20/disciplineData/` (one file per group, re-exported as `DISCIPLINE_CATALOGUE`); `disciplines.ts` keeps types, lookup and `disciplineReadings`
**TEST**: Existing `disciplines.test.ts` and the Character sheet's Discipline scenarios pass unchanged
**REFACTOR**: Pure move; no value changes
**Files**: `src/domain/v20/disciplines.ts`, `src/domain/v20/disciplineData/index.ts`, `src/domain/v20/disciplineData/*.ts`
**Commit**: `refactor(disciplines): catalogue data in its own files`

#### Step 4.2: Rule fields and Presence

**Complexity**: complex
**IMPLEMENT**: Extend `Power` with optional `cost`, `duration`, `prerequisite`, `difficulty`, `summary` and required `page`; extract Presence from V20 chapter four and type it in (Awe: cost None, duration One scene, prerequisite Presence 1, pool Charisma + Performance, difficulty 7, summary "Draw nearby people's attention and make them more receptive to you…" as the book states it)
**TEST**: Unit tests: Presence has five powers; Awe's fields as read from the book; every power has a page; unextractable fields are undefined, never empty strings
**REFACTOR**: Existing readings and their consumers unchanged
**Files**: `src/domain/v20/disciplines.ts`, `src/domain/v20/disciplines.test.ts`, `src/domain/v20/disciplineData/presence.ts`
**Commit**: `feat(disciplines): power rule fields, Presence data`

#### Step 4.3: Remaining Disciplines, batch one

**Complexity**: standard
**IMPLEMENT**: Extract and type the rule fields for the first third of the remaining catalogue (alphabetical), with pages
**TEST**: Per Discipline: power count equals the catalogue's, every defined field is non-empty, every power has a page
**REFACTOR**: Shared phrases ("One scene", "None") as constants
**Files**: `src/domain/v20/disciplineData/*.ts`, `src/domain/v20/disciplines.test.ts`
**Commit**: `feat(disciplines): rule fields, batch one`

#### Step 4.4: Remaining Disciplines, batch two

**Complexity**: standard
**IMPLEMENT**: As 4.3 for the second third
**TEST**: As 4.3
**REFACTOR**: As 4.3
**Files**: `src/domain/v20/disciplineData/*.ts`, `src/domain/v20/disciplines.test.ts`
**Commit**: `feat(disciplines): rule fields, batch two`

#### Step 4.5: Remaining Disciplines, batch three

**Complexity**: standard
**IMPLEMENT**: As 4.3 for the rest; Thaumaturgy and Necromancy (learned by path) keep their note and no powers; produce the human review checklist (Discipline, power, field, value, page) for the PR body
**TEST**: As 4.3, plus all seventeen Disciplines present
**REFACTOR**: As 4.3
**Files**: `src/domain/v20/disciplineData/*.ts`, `src/domain/v20/disciplines.test.ts`
**Commit**: `feat(disciplines): rule fields, batch three`

### Slice 5: Combat reference data

**Depends-on:** none
**Files:** `src/domain/v20/combat/data/types.ts`, `src/domain/v20/combat/data/manoeuvres.ts`, `src/domain/v20/combat/data/manoeuvres.test.ts`, `src/domain/v20/combat/data/weapons.ts`, `src/domain/v20/combat/data/weapons.test.ts`, `src/domain/v20/combat/data/ranged.ts`, `src/domain/v20/combat/data/ranged.test.ts`, `src/domain/v20/combat/data/modifiers.ts`, `src/domain/v20/combat/data/modifiers.test.ts`

Data only, extracted as in Slice 4 (V20 chapter nine, pp. 274–281 and the weapons tables). Literal values for the pinned examples in Slice 8's scenarios are fixed into that feature file in Step 5.3 from the PDF.

**Behavior:** none (verified by unit tests on shape and by the human data review).

**Steps:**

#### Step 5.1: Manoeuvres

**Complexity**: standard
**IMPLEMENT**: The melee and ranged manoeuvres with attribute, ability, accuracy, difficulty, damage, requirement, tags ("Weapon required", "Prerequisite") and page
**TEST**: Every manoeuvre has all fields and a page; Strike, Kick and Claw as the book states them
**REFACTOR**: Requirement kinds as a small discriminated union
**Files**: `src/domain/v20/combat/data/manoeuvres.ts`, `src/domain/v20/combat/data/manoeuvres.test.ts`
**Commit**: `feat(combat): manoeuvre data`

#### Step 5.2: Melee weapons

**Complexity**: standard
**IMPLEMENT**: Knife, Sap, Club, Sword, Axe, Stake and the rest, with damage (parsed once into `{ strength?, flat? }`), type, concealment, note and page
**TEST**: Every weapon has damage, type, conceal and a page; Sap is Strength + 1 bashing, conceal P; Stake as the book states it
**REFACTOR**: One `Weapon` type with a `kind` discriminant
**Files**: `src/domain/v20/combat/data/weapons.ts`, `src/domain/v20/combat/data/weapons.test.ts`
**Commit**: `feat(combat): melee weapon data`

#### Step 5.3: Ranged weapons and the range and called-shot tables

**Complexity**: standard
**IMPLEMENT**: Ranged weapons (damage, range, rate, clip, conceal, page) and the range and called-shot modifier tables that drive Target and Range in Slice 8; pin one named ranged weapon's literal values into the Slice 8 feature file
**TEST**: Every ranged weapon has all fields and a page; table entries as the book states them; the feature file's pinned values equal the data
**REFACTOR**: Shared types with 5.2
**Files**: `src/domain/v20/combat/data/ranged.ts`, `src/domain/v20/combat/data/ranged.test.ts`, `src/domain/v20/combat/data/modifiers.ts`, `src/domain/v20/combat/data/modifiers.test.ts`
**Commit**: `feat(combat): ranged weapons and modifier tables`

**Note (pinning):** the pinned ranged example is recorded in `docs/specs/dossier-tabs-combat-review.md` and checked against the data by `ranged.test.ts`. The Slice 8 feature file does not exist yet; Slice 8 copies the pinned literals into it when it is built.


## Pre-PR Quality Gate

- [x] `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:e2e`
- [x] `/code-review --since main`: see `.dev-team-reports/code-review.md`
- [ ] Rulebook-data review checklist (`docs/specs/dossier-tabs-discipline-review.md`, `docs/specs/dossier-tabs-combat-review.md`) checked by the owner
- [ ] Tried against real browser profiles (the loader change) before merging

## Risks & Open Questions

- **Loader and rollback.** Today a stored record must have exactly six backgrounds and the same array lengths as the blank. Step 2.2 replaces that check for the new fields only and leaves `hasShapeOf` untouched, but it is the one change that could strand real data, so PR A is tried against real profiles first. Reverting a PR after the owner has saved new data (eight backgrounds, notes, XP) leaves a build from before this work reporting that character unreadable: revert is safe only before new data is entered, and the owner should export `localStorage` first. A damaged dossier field makes the whole character unreadable by design (never rewritten); a per-section fallback was considered and not adopted because it would need partial-write rules the store does not have.
- **Astro glob rendering (resolved: the glob works, no prebuild fallback).** Step 1.4 started with a spike on `import.meta.glob`; if Astro cannot render globbed components, the fallback is a `prebuild`-generated `src/tabs/index.ts` of the same shape, decided in Slice 1.
- **Astro container tests (resolved: Vitest renders the components, tests are in Slice 3).** Slice 3's component tests assume Vitest can render Astro components here. If not, they move into the consuming slices' scenarios (stated in Slice 3).
- **Sourcebook extraction.** About 85 Discipline powers and the combat tables come from the V20 PDF through `pypdf`; tables in this PDF may extract out of order, and worktrees cannot see the gitignored PDF, so extraction reads it by absolute path in the main checkout. Tests guard shape only: a plausible but wrong value passes them, so the human review checklist in PR A is the real gate. Unextractable fields stay undefined and show "See rulebook (V20 p. N)".
- **Pinned combat values.** Slice 8's ranged scenario uses "as printed in the rulebook" until Step 5.3 pins literal values into the feature file; if the export has already run when that happens the feature file is edited by that step and re-checked.
- **Parallel edits to shared files.** Slices in a wave own disjoint folders; `features/steps/shared.steps.ts`, `fixtures.ts`, `pages.ts`-adjacent support and every shared step phrase are owned by Slice 1 only. Step text uniqueness is enforced by the self-test in Step 1.8. `bddgen` aborts on duplicate step text, so a violation breaks the whole suite at merge.

## Build Progress

This section is the machine-parseable recovery handle.

### Slices (grouped by wave)

#### Wave 1
- [x] Slice 1: Tab host and shell
  - [x] Step 1.1: The tab registry
  - [x] Step 1.2: Tab addresses
  - [x] Step 1.3: The shell split and the tab contract
  - [x] Step 1.4: Panels and descriptors from one glob
  - [x] Step 1.5: The tab bar
  - [x] Step 1.6: Observers, the application-bar slot and context services
  - [x] Step 1.7: One pool wording and `selectPool`
  - [x] Step 1.8: Test support for every slice
- [x] Slice 2: Stored data and the experience ledger
  - [x] Step 2.1: Additive types, blank defaults and the field list
  - [x] Step 2.2: Loading old records
  - [x] Step 2.3: Rows keep their details; consumers tolerate more than six
  - [x] Step 2.4: Legacy and damaged-record scenarios
  - [x] Step 2.5: Sessions
  - [x] Step 2.6: The experience ledger
  - [x] Step 2.7: The V20 experience cost table
- [x] Slice 3: Shared dossier parts
  - [x] Step 3.1: Text matching
  - [x] Step 3.2: Count and points labels
  - [x] Step 3.3: Heading, hint, chips and empty state
  - [x] Step 3.4: Reference table
  - [x] Step 3.5: Segmented control, selectable list and disclosure styles
  - [x] Step 3.6: Search field
  - [x] Step 3.7: Undo notice and session prompt
  - [x] Step 3.8: Contrast and size guard
- [x] Slice 4: Discipline catalogue data
  - [x] Step 4.1: Split the catalogue from the reading logic
  - [x] Step 4.2: Rule fields and Presence
  - [x] Step 4.3: Remaining Disciplines, batch one
  - [x] Step 4.4: Remaining Disciplines, batch two
  - [x] Step 4.5: Remaining Disciplines, batch three
- [x] Slice 5: Combat reference data
  - [x] Step 5.1: Manoeuvres
  - [x] Step 5.2: Melee weapons
  - [x] Step 5.3: Ranged weapons and the range and called-shot tables

