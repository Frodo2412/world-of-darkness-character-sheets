# Spec: Roster Redesign

<!-- spec-version: 12.5.0 -->

Design source: Figma file `TAvjmr6RE0rHV8kz56Ffs0`, page `29:2` "Character List", frame
`31:813` "Character list"
(<https://www.figma.com/design/TAvjmr6RE0rHV8kz56Ffs0/Vampire-the-Masquerade-20th-Anniversary-Edition-Character-Sheet?node-id=31-813>).

## Intent Description

The roster stops being a plain list with two buttons and becomes the **character
library** of the Figma frame: a page introduction, chronicle tabs, browsing tools (search,
clan filter, status filter, sort), one bordered list of entries, and a **Character
creator** card beside it that starts a build or a blank sheet.

Everything the player has stored appears in that one list. A finished character is
**ready to play** and offers "Open sheet" and "Edit character". A build in progress is an
entry in the same list, marked "In progress", and offers "Continue". A record that cannot
be read stays visible with an explanation.

The player can narrow the list by chronicle, by clan, by status and by a text search, and
can choose its order. All of this runs in the browser over what is already stored; no
stored record changes shape.

So that every character can be given a chronicle, the sheet's edit mode gains a
**Chronicle** field. That is the only change outside the roster page.

**Deleting is removed.** The roster no longer offers Delete for characters, builds or
unreadable records, and no other page offers it, so after this change nothing can be
deleted from inside the app. Stored data is left untouched.

Out of scope, although drawn in the frame: "Updated … ago", the "Last opened" marker, the
"Recently updated" sort order and the "Pick up where you left off" card (all need stored
timestamps, which are not added); the sect in the summary line; the session number; the
settings icon; the save status in the application bar on this page; the "Assign a
chronicle now, or leave it for later." note. Also out of scope: the Player name on
entries, any change to the builder, and any change to the character or build stores.

## Architecture Specification

**Stack.** Unchanged: Astro static output, vanilla TypeScript, plain CSS. No UI framework
and no new dependency.

**Components.**

| Component | Change | Constraint |
| --- | --- | --- |
| Library model (new, `src/domain/v20/`) | Pure functions that turn stored characters and builds into library entries and answer: which chronicles exist and how many entries each has, which clans exist, which entries match a tab + clan + status + search text, in what order, and the counts the page displays | Pure TypeScript, no DOM, no storage access. Reuses `monogram`, `identitySummary`, `temperament` and `displayName`. Unit-tested directly |
| Character store, build store (`src/storage/`) | None | Records are read exactly as today. `delete` stays on both stores (the builder's finish step uses it); the roster stops calling it |
| Roster page (`src/pages/index.astro`, `src/scripts/roster.ts`) | Rebuilt to the frame's structure | The page script is the only place that reads the stores and renders entries; it holds the filter state and delegates every filtering, ordering and counting decision to the library model. The delete dialog is removed |
| Roster styles (new `src/styles/roster.css`) | Layout and entry styles for the frame | Colours, typefaces, sizes, radii and spacing come from the existing tokens in `global.css`; the old `.roster` rules there are removed. No colour is defined outside `:root` |
| Icons (`src/assets/icons/`) | `search`, `chevron-down`, `arrow-right` added from the Figma file | Kept as SVG files, not redrawn or rasterised. `diamond` and `pencil` are reused |
| Application bar (`src/components/AppBar.astro`) | None | Its save status stays empty on this page, so it is not drawn |
| Sheet identity (`src/components/sheet/Identity.astro`) | Chronicle becomes an edit-mode text field | Same control, saving and labelling as the existing Concept field. Play mode is unchanged: Chronicle is not shown there |

Dependency direction is unchanged: pages → store → model.

**Page structure**, top to bottom:

1. *Application bar* — as on every page.
2. *Page introduction* — the heading "Characters" and the line "Your Kindred, their
   stories, and the nights still to come."
3. *Chronicle tabs* — "All characters · N", one tab per chronicle "<Chronicle> · N",
   and "Unassigned · N".
4. *Workspace* — the character library and, beside it, the Character creator card.
   - *Browsing tools* — the search field and the clan filter.
   - *List controls* — the status filter ("All · N", "Ready to play · N") and the sort
     control.
   - *Character list* — a heading row ("AVAILABLE CHARACTERS" / "VAMPIRE: THE MASQUERADE ·
     V20"), the entries, and a summary row.
   - *Character creator* — overline, "A new story begins.", description, the three
     creation stages, "Start character creator" and "Start with a blank sheet".

**Entries.** Four kinds, one list:

| Kind | Shows | Actions | Ready to play |
| --- | --- | --- | --- |
| Character | Monogram, name (or "Unnamed character"), summary line Clan · Generation · Concept, Nature / Demeanor, chronicle or "Unassigned" | "Edit character" (sheet in edit mode), "Open sheet" (sheet in play mode) | Yes |
| Build in progress | Monogram, name (or "Unnamed build", repeats numbered as today), summary line Clan · Concept, Nature / Demeanor, chronicle or "Unassigned", an "In progress" marker | "Continue" (the builder) | No |
| Unreadable character | "Unreadable character" and the explanation with its id, as today | None | No |
| Unreadable build | "Unreadable build" and the explanation with its id, as today | None | No |

Any part of an entry whose text is blank is not drawn. Names are shown as plain text.

**Filter state** is page state: tab, clan, status, search text and sort order. It is not
stored and is not in the address; a fresh load starts at All characters, All clans, All,
empty search, Newest first. The four filters combine with AND.

- *Chronicle* of an entry is its Chronicle text, trimmed. Two texts are the same chronicle
  when they match ignoring case and surrounding space; the tab shows the spelling of the
  oldest entry. Blank is Unassigned. Unreadable entries are Unassigned.
- *Clan filter* offers "All clans" plus each distinct non-blank clan among readable
  entries, compared the same way, in alphabetical order.
- *Status* "Ready to play" keeps characters only.
- *Search* matches when the text, ignoring case and accents, appears in the entry's name,
  clan or concept. An empty search matches everything. An unreadable entry matches only an
  empty search and only "All clans".
- *Sort* offers Newest first (default), Oldest first, Name A–Z and Clan A–Z. Creation
  order comes from the record id, which encodes creation time for both stores. Name and
  Clan compare ignoring case and accents; in Clan order a blank clan comes last and ties
  fall back to name; unreadable entries come last in Name and Clan order.

**Counts.**

- A tab's count is every entry in that chronicle, whatever the other filters say.
- The status filter's two counts are for the selected tab, ignoring clan and search.
- The summary row reads "Showing X of Y characters": X entries shown, Y entries stored.
  Its right side describes all stored entries: "N in <Chronicle> · N unassigned" with one
  chronicle, "N in M chronicles · N unassigned" with several, with either half left out
  when its count is zero.

**Controls.** The clan filter and the sort control are native `select` elements styled to
the frame. The search field is a native search input. The Edit character, Open sheet and
Continue actions are links, since they navigate. Tabs and the status filter expose which
option is selected to assistive technology.

**Layout.** The page holds the frame's width on wide screens as the sheet does. From
75rem up, the library and the creator card sit side by side (creator 320px). Below that
the creator card moves above the library and hides its three creation stages. On a phone
an entry's Nature / Demeanor and actions wrap under its name, and the tab strip scrolls
sideways within itself.

## Acceptance Criteria

**Structure and look**

1. At 1512px wide the roster matches frame `31:813` in structure, order, spacing,
   typefaces and colours, apart from the items this spec lists as out of scope and the
   wording of the sort control. Verified by a side-by-side comparison attached to the PR.
2. The page has exactly one `h1`, "Characters", and no colour or typeface value that is
   not a `global.css` token.
3. The three new icons are SVG files taken from the Figma file; no icon on the page is
   loaded from another origin.

**Entries**

4. A stored character named "Éloïse Voss" (Toreador, generation 10, concept Antiquarian,
   nature Visionary, demeanor Bon Vivant, chronicle "The Glass City") is listed with
   monogram "EV", the summary line "Toreador · 10th generation · Antiquarian",
   "Visionary / Bon Vivant" under a "NATURE / DEMEANOR" label, and "The Glass City".
5. A character with no name is listed as "Unnamed character"; one with no chronicle shows
   "Unassigned"; a blank summary line or blank Nature / Demeanor is not drawn.
6. "Open sheet" opens that character's sheet in play mode; "Edit character" opens it in
   edit mode. Each action's accessible name includes the character's name.
7. A build in progress is listed in the same list as characters, shows "In progress",
   and its "Continue" action opens that build in the builder. It offers neither
   "Open sheet" nor "Edit character". Two unnamed builds have distinct names.
8. An unreadable character or build is listed with its explanation and id, offers no
   action, and does not prevent any other entry from being listed.
9. A name containing markup is shown as text and creates no element.
10. The Player name appears nowhere on the page.

**Removal of delete**

11. The page has no Delete control and no delete dialog, for any kind of entry.
12. No interaction on the roster removes a stored character or build.

**Chronicle tabs**

13. With no stored entry having a chronicle, only the "All characters · N" tab is shown.
14. With at least one chronicle, there is one tab per chronicle in alphabetical order
    after "All characters", and an "Unassigned · N" tab last when N is above zero.
15. "The Glass City", " the glass city " and "THE GLASS CITY" are one chronicle, shown
    with the spelling of the oldest entry.
16. Selecting a tab lists only that chronicle's entries; each tab's count stays the same
    whatever is typed in search or chosen in the other filters.
17. If the selected chronicle no longer has entries when the page is shown again, the
    selection returns to All characters.

**Search, filters and sort**

18. Typing in search narrows the list as the player types, matching name, clan or concept
    and ignoring case and accents ("eloise" finds "Éloïse Voss"). Clearing it restores
    the list.
19. The clan filter lists "All clans" and each distinct clan present, alphabetically;
    choosing one lists only entries of that clan.
20. "Ready to play" lists characters only; "All" lists every entry. Both show counts for
    the selected tab.
21. The sort control offers Newest first, Oldest first, Name A–Z and Clan A–Z, starts at
    Newest first, and reorders the list immediately. A character just created is first
    under Newest first.
22. Tab, clan, status and search combine: an entry is listed only when it satisfies all
    four.
23. When filters leave nothing to list, the list shows "No characters match." and a
    "Clear filters" button that resets search, clan and status and keeps the tab.
24. The summary row reads "Showing X of Y characters" with X and Y correct under any
    filter combination, and the chronicle breakdown in the form the Architecture
    Specification gives.
25. Pressing ⌘K on Apple platforms, or Ctrl+K elsewhere, moves focus to the search field.
    The hint beside the field shows the combination for the platform.
26. Reloading the page returns every filter to its starting value.

**Creating**

27. "Start character creator" creates a build and opens it in the builder, as "Build a
    character" does today. "Start with a blank sheet" creates a character and opens its
    sheet in edit mode, as "New V20 character" does today.
28. When a create fails because storage refuses it, the existing message is shown and the
    player stays on the roster.
29. With storage unavailable, the existing unavailable message is shown and both create
    actions are disabled.
30. With nothing stored, the list shows "No characters yet. Create one to get started.",
    the tabs, browsing tools and list controls are not shown, and the Character creator
    card is.
31. A page restored from the back/forward cache lists entries created since it was left.

**Chronicle on the sheet**

32. In the sheet's edit mode a Chronicle field is offered; text typed there is saved with
    the character and determines its tab on the roster. In play mode the sheet is
    unchanged.

**Layout and accessibility**

33. At 1200px and wider the creator card is beside the library; narrower, it is above the
    library with its creation stages hidden and both create actions still visible.
34. At 320px wide the page has no horizontal scroll and every entry's name, summary and
    actions are visible.
35. Every control is reachable and operable by keyboard alone, shows a visible focus
    indicator, and has an accessible name. The selected tab and selected status are
    exposed to assistive technology.
36. Changing any filter announces the resulting count to assistive technology without
    moving focus.
37. The page passes the automated accessibility check already run for the roster, with
    characters, a build, an unreadable record and a chronicle present.

**Regression**

38. Stored characters and builds read after this change are byte-identical to before
    unless the player edits them.
39. Every existing scenario that does not concern deleting, the Player name, or builds
    being listed apart from characters passes, with step definitions updated only where
    the roster's markup changed. The retired and reworded scenarios are listed in the
    plan.
40. `npm run test`, `npm run test:e2e`, `npm run lint`, `npm run typecheck` and
    `npm run build` pass.

## Ambiguity Log

All gap and ambiguity findings from the Ambiguity Resolution Protocol, with their classifications and rationale.

| Decision | Classification | Resolved By | Rationale / Answer |
|----------|---------------|-------------|-------------------|
| Which drawn controls work | `requires-stakeholder-input` | human | All of them: chronicle tabs, search, clan filter, status filter, sort |
| Stored timestamps | `requires-stakeholder-input` | human | Left out; "Updated … ago", "Last opened", recency sort and "Pick up where you left off" are dropped |
| Builds in progress, unreadable records and the empty state, none of them drawn | `requires-stakeholder-input` | human | Kept and merged into the one list; "Ready to play" filters builds out |
| Sect, session number, settings icon, save status, ⌘K hint | `requires-stakeholder-input` | human | Omitted; ⌘K kept only as a working shortcut that focuses search |
| Sort orders and default | `requires-stakeholder-input` | human | Newest first (default), Oldest first, Name A–Z, Clan A–Z |
| Player name on entries | `requires-stakeholder-input` | human | Dropped, following the frame |
| Delete | `requires-stakeholder-input` | human | Removed entirely, confirmed after being told nothing in the app can then be deleted. Supersedes the earlier "delete stays on every row" |
| Narrow layout of the creator card | `requires-stakeholder-input` | human | Above the list, compact: creation stages hidden |
| Chronicle cannot be set on the sheet | `requires-stakeholder-input` | human | Add Chronicle to the sheet's edit mode |
| What "Ready to play" means | `inferable` | inference | The human's answer has it filter builds out; a record in the character store is the only other readable kind |
| Whether blank sheets count as ready | `inferable` | inference | Nothing stored distinguishes a blank sheet from a filled one, and the app has never judged completeness outside the builder |
| How chronicle texts are matched | `inferable` | inference | Chronicle is free text; treating case or stray spaces as different chronicles would split one table's characters across tabs |
| Chronicle and clan of an unreadable record | `inferable` | inference | Nothing can be read from it; it is Unassigned and belongs to no clan, so it stays visible on the unfiltered view where the existing spec requires it to be seen |
| When the Unassigned and chronicle tabs appear | `inferable` | inference | With no chronicle anywhere, "Unassigned" would repeat "All characters"; the play view spec already omits tabs that navigate nowhere |
| Whether filters persist | `inferable` | inference | The sheet's mode is page state and is not stored; no stored preference exists in the app |
| How filters combine | `inferable` | inference | Each control narrows the same list; AND is the only reading under which the summary row's "Showing X of Y" is meaningful |
| What each count measures | `inferable` | inference | The frame shows tab counts summing to the total and status counts equal to the selected tab's total |
| Clan filter options | `inferable` | inference | Clan is free text on the sheet, so a fixed V20 list would miss written-in clans and offer clans with no entries |
| Native `select` for clan and sort | `inferable` | inference | The stack forbids a UI framework and the project's controls are native elements; a native select is keyboard and screen-reader complete |
| Name is text, not a link | `inferable` | inference | The frame gives each entry explicit actions; the existing rule that a build name is plain text extends to all entries |
| Build entry content | `inferable` | inference | Same fields as a character where the build has them; a build has no chosen generation text, so the summary line is Clan · Concept |
| No-match state | `inferable` | inference | An empty list with no explanation reads as lost data; a reset is the conventional remedy |
| Summary row with several chronicles | `inferable` | inference | The frame's wording names one chronicle; listing every chronicle would overflow the row |
| "Assign a chronicle now, or leave it for later." | `inferable` | inference | Neither create action asks for a chronicle, so the sentence would describe a step that does not exist |
| Ctrl+K on non-Apple platforms | `inferable` | inference | ⌘ exists only on Apple keyboards; Ctrl is the platform equivalent |
| Wide and phone layout | `inferable` | inference | The sheet already holds the frame width and switches columns at 75rem; the roster follows the same breakpoints |
| Filter announcement | `inferable` | inference | WCAG 4.1.3: a list that changes without focus moving must report its new state |
| Store `delete` methods | `inferable` | inference | The builder's finish step calls `builds.delete`; the human excluded store changes |
| Two characters with the same display name, most often two unnamed ones | `inferable` | inference | Raised in plan review: their actions would share one accessible name. Repeated names of the same kind are numbered in creation order, as two unnamed builds already are |
| A page restored from the back/forward cache | `inferable` | inference | Raised in plan review: the sheet already reloads itself when restored, and filters are not stored, so the roster does the same rather than keep a second path that re-reads storage |
| The builder's unreadable-build notice says "You can delete it" | `requires-stakeholder-input` | human | Raised in plan review: with delete removed the sentence points at a control that no longer exists. Approved with the plan on 2026-10-06: "delete it or" is dropped from that one sentence, the only builder change |
| Tests asserting exact pixel values per token | `LOW_VALUE` (skipped) | inference | No branching logic; covered by the side-by-side comparison in criterion 1 |

## Consistency Gate
- [x] Intent is unambiguous
- [x] Every behavior/goal maps to an acceptance criterion
- [x] Architecture constrains without over-engineering
- [x] Terminology consistent across artifacts
- [x] No contradictions between artifacts
- [x] Every gap/ambiguity finding is logged — inferable with rationale or resolved by human
