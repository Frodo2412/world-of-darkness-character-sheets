# Roster redesign: debt carried out of the branch

The `/code-review` panel (15 lenses) ran on `feat/roster-redesign` before its PR. The defects it found
were fixed on the branch. What follows was **not** applied: it is structural work too large or too
risky to fold into a feature PR, or a decision that needs the author. Each item names where it lives,
what the fix is, and roughly how large it is, so it can be picked up as its own change. Tick an item
when it lands.

Size: **S** under an hour, **M** a few hours, **L** a day or more.

## Structural refactors

- [ ] **L: Split `src/domain/v20/library.ts` (449 lines, four reasons to change).** Entries and
  repeat numbering; sort orders; the filter model; grouping and `view`. Split into `library/entries.ts`,
  `order.ts`, `filter.ts`, `view.ts`, with `library.ts` re-exporting the public API so no importer
  changes. Pure code motion; the 968 unit tests are the safety net. (structure, complexity)
- [ ] **M: Break up `view()`, `createControls` and `createTabStrip`.** `view()` is 30 lines (extract
  `tabsOf`, a `resolveKey` helper for the tab and clan fallbacks, `stateOf`); `createControls` is 63 lines
  (`fillOptions`, `wireFilters`, `wireClear`, `wireShortcut`); `createTabStrip` is 50 (click and keydown
  handler factories, a `syncTabs`). (complexity, refactor)
- [ ] **M: Make `src/scripts/roster.ts` testable.** It reads 18 module-level elements plus a module-level
  `storage`; `render` uses eight of them directly. Move `SHOWN`/`partsShownFor` to `roster/visibility.ts` as a
  pure `partsShownFor(state, storageAvailable)`, build a `createLibraryScreen(elements, templates,
  storageAvailable)` and move the create flow to `roster/create.ts`. Also fixes the hidden `storage`
  input and the `change` forward reference in `open()`. (structure, js-fp, concurrency)
- [ ] **M: Share route builders.** `sheetUrl`, `editSheetUrl` and `builderUrl` live in
  `roster/entries.ts`; `sheetUrl` is repeated in `builder/finish.ts`. Move to `src/scripts/routes.ts`.
  (arch, structure)
- [ ] **M: One name for a stored record.** Storage's `RosterEntry` and `BuildEntry` and the domain's
  `CharacterRecord` and `BuildRecord` are the same shapes. Type the stores' `list()` with the domain types
  and delete the storage ones. Needs `src/storage/` in scope, which the spec excluded for this branch.
  (arch, domain)
- [ ] **S: Name the build display name once.** `UNNAMED_BUILD` and the `trim() || 'Unnamed build'` rule
  are written in `library.ts` and `builder.ts`; add `buildDisplayName` beside the character's
  `displayName` in `src/domain/v20/character.ts`. (domain)
- [ ] **S: One "readable entry".** Readability is tested three ways (`'chronicleKey' in entry`,
  `'name' in entry`, `entries.ts`'s own `Readable`). Export `ReadableEntry` and `isReadable`, base them
  on `kind`, and use them in `numberRepeats` and `entries.ts`. Add `unreadableOf(entry)` so `asUnreadable`
  stops re-deriving the mapping. (domain, naming, refactor)
- [ ] **M: Single source for the status filter and the "Name · count" markup.** The status set is in
  four places (domain type, `STATUSES`, two hand-copied labels in `LibraryTools.astro`); the dot-and-comma
  markup is in `LibraryTools.astro` and `tabs.ts`, and the test helper `shownText` depends on both. Move the
  existing `STATUSES` from `controls.ts` into the domain beside `ORDERS` (with labels), render the segments from it, share one counted-label builder.
  (structure, refactor)
- [ ] **S: Deduplicate `EntryTemplates.astro`.** The character and build templates repeat the identity
  block and the metadata shell; extract `EntryIdentity.astro` and `EntryMeta.astro`. (structure, refactor)
- [ ] **S: Move `shownText`'s reliance on `font-size: 0`** to a `data-slot="sr-only"` marker, so a
  restyled screen-reader comma cannot change every tab and status assertion. (test-smell)

## Test suite structure

- [ ] **L: Split the catch-all step and support files.** `library.steps.ts` (503 lines, lowest health in
  the repo), `library-filters.steps.ts` (535) and `support/pages.ts` (256 lines, ~54 exports) each mix
  unrelated areas. Split by feature area (entries, create, storage; tabs, controls, announcements,
  shortcut) and pages by region (`support/roster/{entries,controls,tabs,creator,live-region}.ts`) behind
  a barrel. Move `expectStoredEntriesListed` out of `pages.ts` so it has no `src/storage` dependency.
- [ ] **M: Split `library.test.ts` (1249 lines)** per feature (entries, tabs, search, filters, sort) with
  shared builders; extract the `withHeader` fixture (two copies in `identity.test.ts`, a third as `character()` in `library.test.ts`) and a `tabKey(entries, label)`
  helper (about nine inline copies). Rename the local `INITIAL_FILTER` alias, which is not the shipped
  filter, and split the four-way `test.each` at line 561.
- [ ] **M: One seeding mechanism.** `saveCharacters`, `saveBuilds` and the Given in
  `builder-finish.steps.ts` are the same recorder-then-write routine. Extract `seedStorage(page,
  makeStore, records)` in `support/storage.ts`. Also: `damageRecord` for the three copies of the
  damaged-record return shape in `seed.ts`, one `orderedId(position)`, and `BUILD_KEY_PREFIX` derived from
  `buildKeyFor('')`. (refactor)
- [ ] **S: Named constants and helpers for repeated literals.** The create-action names, "No characters
  yet", "In progress", the 1512×900 viewport, the focus-outline minimum, the " · " separator and its
  offset of 3 (`split + 3` in `pages.ts`; a proposed `splitCounted` helper), and the "Showing N of M characters" pattern. Add `statusSegment`,
  `selectedStatusOption` and `pageTitle` to `pages.ts` for the selectors that bypass it.
- [ ] **M: Replace `describeFocus`** (a nested ternary re-deriving role and name in the page) with
  Playwright's own role resolution, and assert the focus order against one expected sequence instead of
  indexed positions. (complexity, test-smell, test)
- [ ] **M: Put timing edge cases at the unit level.** The 400 ms announcement rules are pinned with a
  fake clock in `announce.test.ts` and again with real 600 ms waits in four slices' scenarios; keep one
  scenario per control and use `page.clock` where time is still needed. Likewise, case, accent and
  spelling-merge variants are covered exhaustively in `library.test.ts` and repeated end to end.
  (test-smell)
- [ ] **M: Move the colour and typeface rule in `roster.css.test.ts` to stylelint** (`color-named: never`,
  `color-no-hex`, and so on) over `src/**/*.css`. The hand-rolled scanner knows 17 of about 148 named
  colours and covers one stylesheet. (test, test-smell)
- [ ] **S: Unit-test the defensive branches** in `controls.ts` (shortcut ignored with focus already in
  the field or with no tools) and `tabs.ts` (modified arrow keys left to the browser) by extracting
  `shouldFocusSearch` and `ignoresModifiedKey`. Decide whether an empty `userAgentData.platform` should
  fall back to `navigator.platform`. (test)
- [ ] **S: Split the four-When keyboard journey** ("The library is worked without a pointer") into one
  scenario per operation, and split the type-and-activate When so the checks sit in a Then. (test)

## Features the plan named and the branch did not build

- [ ] **S: Ellipsis on long tab labels, and an edge fade on the tab strip** (Step 8.1). The strip scrolls
  and every tab keeps its full accessible name, so nothing is lost; this is polish.
- [ ] **S: Explicit contrast check for the search placeholder** (Step 8.2). Only axe covers it, and it
  is not confirmed that axe evaluates `::placeholder`.
- [ ] **S: Overflow and target-size checks at 320px for the empty and storage-unavailable states.**
  Today only the full library is measured.

- [ ] **S: The create-button latch is a timer.** After a successful create, `roster.ts` ignores further
  presses for 3 seconds so a double-click cannot leave a blank record behind, and so a cancelled
  navigation does not leave the buttons dead. Replace the timer with `pagehide`/`pageshow` handling if a
  cleaner signal is wanted.

## Decisions that need the author

- **"Order" or "sort"?** `LibraryOrder`/`ORDERS` against `sortSelect`/`sortAnnouncementOf`/`sortControl`.
- **"Library" or "roster"?** and **"damaged", "unreadable" or "broken"?** across the model and the steps.
- **Does "characters" mean every entry?** The counts line and the All tab count builds and unreadable
  records as "characters"; the frame may fix that wording.
- **Should the roster follow other tabs?** The sheet and the builder reload on a `storage` event; the
  roster reads once, on purpose. It does not show a record created in another tab until reloaded.
- **Should chronicle and clan keys collapse runs of spaces,** as repeated names do? Today
  "The Glass City" and "The  Glass City" are two tabs. Move the rule into `text.ts` either way.
- **Is an ADR wanted** for the pure model / drawing script split and the load-once, render-often rule?
  They are recorded only in the plan.
- **Creation order is read from the id's encoding.** Documented in the spec; revisit if stored
  timestamps are ever added.

## Performance, kept as is

At tens of records none of this is measurable, so it was left. Revisit if libraries reach hundreds:
`view()` recomputes tabs, clans and counts on every keystroke (index them once); `folded()` is applied
to every name, clan and concept per keystroke (store folded fields on the entry); every filter change
replaces the whole list (skip when the shown ids are unchanged); superseded announcement timers run as
no-ops (cancel them).

## Style the panel raised that was left

Local mutation in `groupByKey`, `numberRepeats` and `labelled`; closure state in `roster.ts`,
`controls.ts` and `announce.ts`; DOM writes in the fill helpers; the three-way `switch (entry.kind)`
(fold into one table if a fifth kind appears); a long list of naming suggestions (`open` shadows
`window.open`, `shown` means three things, `others`-style misleading locals, `keys` and `clan` in
`controls.ts`, `folded` against `caseFolded`, noun-named functions). All are in the 15 review reports;
none is a defect.
