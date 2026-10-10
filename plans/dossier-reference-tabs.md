# Plan: Dossier reference tabs (PR B of Dossier Tabs)

**Created**: 2026-10-10
**Split from**: `plans/dossier-tabs.md` (the parent keeps Slices 9-14, PR C); PR A is `plans/dossier-foundation.md`
**Branch**: `feat/dossier-reference-tabs` (stacked on `feat/dossier-foundation`)
**Status**: approved
**Gherkin persistence**: features
**Spec**: `docs/specs/dossier-tabs.md`
**Design**: Figma `TAvjmr6RE0rHV8kz56Ffs0`, frames `5:3452` (Disciplines), `37:2042` (Backgrounds), `91:3380` and `97:196` (Combat)

## Goal

PR B of the three stacked PRs: the Disciplines tab (Slice 6), the Backgrounds tab (Slice 7) and the Combat tab (Slice 8), built in parallel on disjoint folders under `src/tabs/<key>/` on top of PR A's tab host, shared dossier parts and rulebook data. The approach stance, plan decisions, acceptance criteria (D1-D6, B1-B5, C1-C6 and the host criteria they touch) and the conventions for tab slices are in `plans/dossier-tabs.md` and are not repeated here. Integration: auto-merge off, the owner reviews and merges; `.claude/CLAUDE.md` and `.claude/worktrees/` stay out of every commit.

Every literal value in the scenarios below was copied from the built data (`src/domain/v20/disciplineData/`, `src/domain/v20/combat/data/`) and the two review checklists (`docs/specs/dossier-tabs-discipline-review.md`, `docs/specs/dossier-tabs-combat-review.md`). A scenario that quotes a value is correct only while the data says the same thing. The data files and their unit tests win over this plan.

## Settled before building

PR A's review found gaps between the first draft of this plan and the built data. The owner settled them like this:

- **Awe** costs "1 blood point", lasts "Remainder of the scene or until the character chooses to drop it", needs "Presence 1", has difficulty "7" and sits on V20 p. 193. Step 4.2 of `plans/dossier-foundation.md` is corrected to match.
- **Celerity, Fortitude and Potence list no powers.** No scenario expands one of their powers. The "no roll" case uses Protean's Eyes of the Beast.
- **"N levels unlocked" counts the Discipline's rating (dots), capped at 5**, whether or not the catalogue lists powers. Presence 3 shows "3 / 5" and "3 levels unlocked". Celerity 1 shows "1 level unlocked" although it lists no powers.
- **"Owned" lists and counts Disciplines rated 1 or more.** A Discipline rated 0 appears under "All" only, with its name and rating and no powers.
- **Incapacitated** reads "Incapacitated: every pool is 0 dice." (a shared message, in the Conventions of `plans/dossier-tabs.md`). The arrangement is the health track fully marked Incapacitated.
- **Wounds** use the V20 wound table in `src/domain/v20/resources.ts`: Bruised 0, Hurt 1, Injured 1, Wounded 2, Mauled 2, Crippled 5 dice off every pool; Incapacitated has no number. The worst level holding any damage sets the penalty.
- **Backgrounds**: `validBackgrounds` requires at least six rows. The six base rows are never removed from the list. Removing a background blanks its row, so six rows always remain (see Slice 7).
- **Combat**: extra successes are clamped at 0 with the shared message "Extra successes kept at 0 or more.".
- The shell contract also offers `ctx.poolSelection()` and `ctx.togglePool(row)`.

## Slices

### Slice 6: Disciplines tab

**Depends-on:** 1, 3, 4
**Files:** `src/tabs/disciplines/**`, `src/domain/v20/disciplineView.ts`, `src/domain/v20/disciplineView.test.ts`, `features/dossier-tabs/slice-6-*.feature`, `features/steps/disciplines.steps.ts`, `features/steps/support/disciplines.ts`

**Behavior:**

```gherkin
Feature: Disciplines tab

  Scenario: The tab lists the character's Disciplines with what they unlock
    Given a character with Presence 3, Auspex 2 and Celerity 1
    When the Disciplines tab is opened
    Then Presence shows "3 / 5" and "3 levels unlocked"
    And Auspex shows "2 levels unlocked"
    And Celerity shows "1 level unlocked" although the catalogue lists no Celerity powers
    And the character's name, the mode toggle, the save status and the resources row are shown

  Scenario: Powers are Known up to the rating and Locked above it, in level order
    Given a character with Presence 3
    When Presence is selected on the Disciplines tab
    Then the powers are listed Awe, Dread Gaze, Entrancement, Summon, Majesty
    And Awe, Dread Gaze and Entrancement are Known
    And Summon is Locked with "Requires Presence 4"
    And Majesty is Locked with "Requires Presence 5"

  Scenario: An expanded power shows its rules and the character's pool
    Given a character with Presence 1, Charisma 3, Performance 3 and a Hurt wound (1 die off every pool)
    When the Awe power is expanded on the Disciplines tab
    Then it shows activation cost "1 blood point"
    And it shows duration "Remainder of the scene or until the character chooses to drop it"
    And it shows prerequisite "Presence 1" and difficulty "7"
    And it shows its dice pool "Charisma + Performance" and its book reference "V20 p. 193"
    And it shows "Your pool: 5 dice" with "Charisma 3 + Performance 3 − wound 1"

  Scenario: A heavy wound floors the pool at zero
    Given a character with Presence 1, Charisma 1, Performance 0 and a Crippled wound (5 dice off every pool)
    When the Awe power is expanded on the Disciplines tab
    Then it shows "Your pool: 0 dice" with "Charisma 1 + Performance 0 − wound 5"
    And "Incapacitated: every pool is 0 dice." is not shown

  Scenario: An incapacitated character has no pool
    Given a character with Presence 1, Charisma 3, Performance 3 and the health track fully marked Incapacitated
    When the Awe power is expanded on the Disciplines tab
    Then it shows "Your pool: 0 dice"
    And it shows "Incapacitated: every pool is 0 dice."

  Scenario: A Locked power shows its rules but no pool
    Given a character with Presence 3
    When the Summon power is expanded on the Disciplines tab
    Then it shows "Locked — requires Presence 4"
    And it shows activation cost "1 blood point", duration "Until dawn" and its book reference "V20 p. 195"
    And it shows difficulty "5 base; 7 if met only briefly; 4 after an earlier success; 8 after an earlier failure"
    And it has no pool and no "Build pool" button

  Scenario: A power that uses no roll says what it uses instead
    Given a character with Protean 1
    When the Eyes of the Beast power is expanded on the Disciplines tab
    Then what it uses instead of a roll is shown as "No roll"
    And it has no "Your pool" line and no "Build pool" button
    And it shows activation cost "None" and prerequisite "Protean 1"
    And its duration reads "See rulebook (V20 p. 199)"
    And its difficulty reads "See rulebook (V20 p. 199)"

  Scenario: A power opens and closes from the keyboard
    Given a character with Presence 3
    When the player focuses the Awe heading on the Disciplines tab and presses Enter, then Space
    Then its panel is shown and its state is "expanded", then hidden and "collapsed"

  Scenario: Search matches a power's name or its summary
    Given a character with Presence 3 and Auspex 2
    When the player searches "dread" on the Disciplines tab
    Then Dread Gaze remains under Presence
    When the player searches "receptive"
    Then Awe remains and Dread Gaze does not
    When the player searches "zzzz"
    Then "No Disciplines or powers match." is shown

  Scenario: Owned and All disciplines switch the list
    Given a character with Presence 3, Auspex 2 and Celerity 1
    Then the "Owned" control reads "Owned · 3"
    When the player chooses "All disciplines"
    Then exactly seventeen Disciplines are listed
    And Animalism, which the character lacks, shows its five powers all Locked, the first as "Requires Animalism 1"
    When the player chooses "Owned" again
    Then only Presence, Auspex and Celerity are listed

  Scenario: Build pool selects the power's traits on the Character sheet
    Given a character with Presence 1, Charisma 3 and Performance 3 viewing the Awe power on the Disciplines tab
    When the player presses "Build pool"
    Then the Character sheet tab is shown
    And its Selected pool holds Charisma and Performance
    And "Pool set to Charisma + Performance" is announced
    And focus is on the Selected pool heading

  Scenario: A Discipline rated 0 or unknown shows no powers
    Given a character with a Discipline named "Homebrewed" rated 2 and Dominate rated 0
    When the Disciplines tab is opened
    Then the "Owned" control reads "Owned · 1"
    And "Homebrewed" shows its name and "2 / 5" and no powers
    And Dominate is not listed
    When the player chooses "All disciplines"
    Then Dominate shows its name and "0 / 5" and no powers

  Scenario: A character with no Disciplines sees an empty state
    Given a character with no named Disciplines
    When the Disciplines tab is opened
    Then "This character has no Disciplines." is shown with an "All disciplines" button
    And the "Owned" control reads "Owned · 0"

  Scenario: The Disciplines tab has nothing to edit
    Given a character in edit mode
    When the Disciplines tab is opened
    Then nothing on the tab can be edited
    And the tab says "Edit Discipline ratings on the Character sheet"
    And its link opens the Character sheet tab

  Scenario: The Disciplines tab is accessible and fits a phone
    Given a character with Presence 3 with the Awe power expanded and the "All disciplines" view chosen on the Disciplines tab
    When the Disciplines tab is scanned for accessibility problems
    Then no problems are reported
    When the player searches "zzzz" on the Disciplines tab
    And the Disciplines tab is scanned for accessibility problems
    Then no problems are reported
    When the Disciplines tab is opened at 320 pixels wide with crowded content
    Then the page does not scroll sideways
```

The unit tests of Step 6.1 also pin the cases the browser does not need: a rating above 5 reads "5 levels unlocked", and a Discipline whose catalogue entry lists fewer powers than its rating shows the powers it has. The "See rulebook (V20 p. N)" text is checked both by unit test (Step 6.1) and in the browser by Eyes of the Beast, whose duration and difficulty the data leaves undefined.

**Steps:**

#### Step 6.1: The Discipline view model

**Complexity**: standard
**IMPLEMENT**: Pure `disciplineView(character, mode)` returning the Owned and All lists. Rules: (1) the rating shows as "N / 5"; (2) "N level(s) unlocked" is the rating capped at 5, counted in dots whether or not the catalogue lists powers, so Celerity 1 reads "1 level unlocked" and Presence 3 reads "3 levels unlocked"; (3) Owned is the named Disciplines rated 1 or more and its "Owned · N" count is that list's length; (4) All is the seventeen catalogued Disciplines plus any named Discipline the catalogue does not know; (5) powers are in level order, Known when the level is at most the rating and otherwise Locked with "Requires <prerequisite>" read from the power's own `prerequisite` text (for example "Requires Presence 4"); a catalogued Discipline with no row on the sheet shows every power Locked; (6) a named row rated 0, or a name the catalogue does not know, shows its name and rating and no powers (rated 0 only under All; unknown and rated 1 or more also under Owned); (7) `fieldText(power, field)` giving the value or "See rulebook (V20 p. N)" with the power's page
**TEST**: Unit tests: rating 0 (name and rating, no powers, not in Owned); unknown name rated 2 (in Owned, no powers); rating above the catalogue's powers (Celerity 3 reads "3 levels unlocked" with no powers); rating 7 reads "5 levels unlocked"; singular "1 level unlocked" and plural; Owned count excludes rating 0; All lists seventeen with no rows; Locked text "Requires Presence 4"; level order; `fieldText` returns Awe's duration as the data states it and Eyes of the Beast's duration as "See rulebook (V20 p. 199)"
**REFACTOR**: Build on `disciplineReadings`; no second catalogue walk
**Files**: `src/domain/v20/disciplineView.ts`, `src/domain/v20/disciplineView.test.ts`
**Commit**: `feat(disciplines): discipline view model`

#### Step 6.2: The tab, list and empty state

**Complexity**: standard
**IMPLEMENT**: Descriptor (shows resources), panel, mount and draw modules: left list (selectable items), selected heading with "Your rating", power rows, empty state "This character has no Disciplines." with an "All disciplines" button, read-only hint line "Edit Discipline ratings on the Character sheet" with a link that opens the Character sheet tab
**TEST**: Scenarios "lists the Disciplines" (including the F6 line), "Known up to the rating", "rated 0 or unknown", "no Disciplines", "nothing to edit"
**REFACTOR**: Presentational pieces use Slice 3's parts
**Files**: `src/tabs/disciplines/descriptor.ts`, `src/tabs/disciplines/Panel.astro`, `src/tabs/disciplines/mount.ts`, `src/tabs/disciplines/drawList.ts`, `src/tabs/disciplines/disciplines.css`, `features/steps/disciplines.steps.ts`, `features/steps/support/disciplines.ts`
**Commit**: `feat(disciplines): Disciplines tab and list`

#### Step 6.3: Power panels

**Complexity**: standard
**IMPLEMENT**: Each power is a native `<details>`; the panel shows cost, duration, prerequisite, pool, difficulty / resistance, summary and book reference ("V20 p. N"); a Known rolling power shows "Your pool: N dice" with the formula from `poolText`; a Locked power shows its rules and "Locked — requires …" with no pool or Build pool; a non-rolling power shows its `note` ("No roll") where the pool would be, with no "Your pool" line; when the health track is fully marked Incapacitated the pool reads 0 and "Incapacitated: every pool is 0 dice." is shown (the shared message)
**TEST**: Scenarios "expanded power", "heavy wound", "incapacitated", "Locked power", "uses no roll", "keyboard"
**REFACTOR**: Pool text from the shared helper only
**Files**: `src/tabs/disciplines/drawPower.ts`, `src/tabs/disciplines/mount.ts`, `features/steps/disciplines.steps.ts`
**Commit**: `feat(disciplines): expanded power with the character's pool`

#### Step 6.4: Search and Owned / All

**Complexity**: standard
**IMPLEMENT**: Search over Discipline and power names and summaries with a result count and the empty state "No Disciplines or powers match."; "Owned · N" and "All disciplines" via the segmented control; the selected Discipline stays selected when it survives the filter, otherwise the first match is selected
**TEST**: Scenarios "Search matches", "Owned and All"
**REFACTOR**: Uses Slice 3's `filterBy`
**Files**: `src/tabs/disciplines/drawSearch.ts`, `src/tabs/disciplines/mount.ts`, `features/steps/disciplines.steps.ts`
**Commit**: `feat(disciplines): search and all-disciplines view`

#### Step 6.5: Build pool

**Complexity**: standard
**IMPLEMENT**: "Build pool" on a Known rolling power calls `ctx.selectPool` and `ctx.openTab('sheet')`, then focuses the Selected pool heading and announces "Pool set to <traits>", where <traits> is the power's two trait labels joined by " + " (for Awe, "Charisma + Performance")
**TEST**: Scenario "Build pool selects the power's traits" (selection, announcement and focus)
**REFACTOR**: None
**Files**: `src/tabs/disciplines/mount.ts`, `features/steps/disciplines.steps.ts`
**Commit**: `feat(disciplines): build pool from a power`

#### Step 6.6: Accessibility and narrow screens

**Complexity**: trivial
**IMPLEMENT**: Fix whatever the shared scans report on this tab in its richest state (expanded power, All view, then a search with no match); tables or lists scroll inside their own containers
**TEST**: Scenario "accessible and fits a phone"
**REFACTOR**: None
**Files**: `src/tabs/disciplines/disciplines.css`, `features/steps/disciplines.steps.ts`
**Commit**: `test(disciplines): accessibility and 320px`

### Slice 7: Backgrounds tab

**Depends-on:** 1, 2, 3
**Files:** `src/tabs/backgrounds/**`, `src/domain/v20/backgrounds/**`, `features/dossier-tabs/slice-7-*.feature`, `features/steps/backgrounds.steps.ts`, `features/steps/support/backgrounds.ts`

**Rules this slice pins** (the scenarios below test them):

- **Index counts.** In play mode a row with no name is hidden and not counted, so every count is of **named rows**. In edit mode every row is shown and counted, so every count is of **all rows**, blank ones included. The same rows set the section heading's "N entries" and the points total.
- **The six base background rows are never removed from the list.** Removing a background blanks its row in place: name, rating, summary, note and people are cleared. Six rows always remain, so `validBackgrounds` still holds. A row past the sixth is removed outright.
- **Empty-state messages** (shown in play mode when a section has no named rows, and in edit mode for the four list sections when they have no rows): Backgrounds "No backgrounds yet.", Havens "No havens yet.", Merits "No merits yet.", Flaws "No flaws yet.", Other traits "No other traits yet.". In edit mode Backgrounds shows its six empty rows instead.

**Behavior:**

```gherkin
Feature: Backgrounds tab

  Scenario: Backgrounds show their name, dots, summary, note and people
    Given a character with Allies 2 summarised "Camille Arnaud · museum curator", noted "Owes a favour", with the people "Camille Arnaud" (museum curator) and "Lucien Voss" (dockside fixer)
    When the Backgrounds tab is opened
    Then Allies shows 2 of 5 dots, the summary "Camille Arnaud · museum curator" and the note "Owes a favour"
    And Allies shows both people with their roles
    And the character's name, the mode toggle, the save status and the resources row are shown

  Scenario: Unnamed background rows are hidden in play
    Given a character with two named backgrounds and four blank rows
    When the Backgrounds tab is opened
    Then two background cards are shown
    And the section index reads "Expanded backgrounds · 2"

  Scenario: Edit mode shows every row and offers to add more
    Given a character in edit mode with two named backgrounds and four blank rows
    When the Backgrounds tab is opened
    Then six background rows are shown, four of them empty
    And an "Add background" control is shown
    And the section index reads "Expanded backgrounds · 6"

  Scenario: A row with details but no name is flagged in edit mode
    Given a character in edit mode with a background row holding a note but no name
    When the Backgrounds tab is opened
    Then that row says "Name needed to show in play mode"
    When the player switches to play mode
    Then that row is not shown

  Scenario: Merits and Flaws show points and totals
    Given a merit "Acute Sense" (Physical, 1 point), a merit "Eidetic Memory" (Mental, 2 points) and a flaw "Hunted" (Social, 1 point)
    When the Backgrounds tab is opened
    Then the Merits heading reads "2 entries · 3 points" and the Flaws heading "1 entry · 1 point"
    And the merits show "1 pt" and "2 pts" and each entry shows its category

  Scenario: Havens, other traits and the notes card are shown
    Given a Primary haven "The Orangery" described "A glassed-in greenhouse", located "Quai de la Tournelle", access "Back stair only", security "Two ghouls"
    And a Secondary haven "Rue Mouffetard flat"
    And an unrated other trait "Languages" of kind "Skill" noted "French · native"
    When the Backgrounds tab is opened
    Then "The Orangery" shows its kind "Primary", description, location, access and security
    And "Rue Mouffetard flat" shows its kind "Secondary"
    And "Languages" shows its kind "Skill" and its note "French · native" without dots
    And the note "Character notes, not rule effects" is shown

  Scenario: Play mode is read-only
    Given a character in play mode with backgrounds
    When the Backgrounds tab is opened
    Then nothing on the tab can be edited
    And the read-only hint is shown

  Scenario: Edit mode adds a merit and the counts follow
    Given a character in edit mode with one merit "Acute Sense" of 1 point
    When the player adds the merit "Eidetic Memory" of 2 points on the Backgrounds tab
    Then the Merits heading reads "2 entries · 3 points"
    And the section index reads "Merits · 2"
    And the Merits heading and the section index are the same after a reload

  Scenario Outline: Edit mode adds an entry to each other section and the counts follow
    Given a character in edit mode with one named entry in "<section>"
    When the player adds the entry "<name>" to "<section>" on the Backgrounds tab
    Then "<section>" lists two entries
    And the section index reads "<index>"
    And "<section>" lists the same two entries and the index reads "<index>" after a reload
    Examples:
      | section      | name         | index           |
      | Havens       | The Orangery | Havens · 2      |
      | Flaws        | Hunted       | Flaws · 2       |
      | Other traits | Languages    | Other Traits · 2 |

  Scenario: A seventh background can be added
    Given a character in edit mode with six named backgrounds
    When the player adds the background "Domain" on the Backgrounds tab
    Then seven background rows are shown
    And the section index reads "Expanded backgrounds · 7"
    And seven rows, "Domain" among them, and the index are the same after a reload

  Scenario: Removing a flaw can be undone
    Given a character in edit mode with one flaw "Hunted" of 1 point
    When the player removes the flaw on the Backgrounds tab
    Then the Flaws section shows "No flaws yet."
    And the section index reads "Flaws · 0"
    And "Removed Hunted. Undo" is announced and focus is on the Undo button
    When the player presses Undo
    Then the flaw "Hunted" is back with its category, 1 point and note, and focus is on it
    And the section index reads "Flaws · 1" and it is the same after a reload

  Scenario Outline: Removing an entry from each other section can be undone
    Given a character in edit mode with one <family> "<name>" with every field filled
    When the player removes it on the Backgrounds tab
    Then the section shows "<empty>"
    And "Removed <name>. Undo" is announced and focus is on the Undo button
    When the player presses Undo
    Then the entry is back with every field and focus is on it
    And the section index reads "<index>" and it is the same after a reload
    Examples:
      | family      | name           | empty                 | index            |
      | haven       | The Orangery   | No havens yet.        | Havens · 1       |
      | merit       | Eidetic Memory | No merits yet.        | Merits · 1       |
      | other trait | Languages      | No other traits yet.  | Other Traits · 1 |

  Scenario: Removing a background blanks its row and Undo restores every field
    Given a character in edit mode with six named backgrounds, the second being "Contacts" 3 summarised "Port authority", noted "Knows the night shift" with one person "Odile" (clerk)
    When the player removes "Contacts" on the Backgrounds tab
    Then the second row is blank: no name, rating 0, no summary, no note and no people
    And six background rows are still shown
    And "Removed Contacts. Undo" is announced and focus is on the Undo button
    When the player switches to play mode
    Then five background cards are shown and none of them is "Contacts"
    When the player switches back to edit mode and presses Undo
    Then the second row holds "Contacts", rating 3, the summary, the note and the person "Odile" (clerk) again
    And focus is on that row
    And six rows are stored before and after a reload

  Scenario: A background past the sixth is removed outright
    Given a character in edit mode with seven named backgrounds
    When the player removes the seventh on the Backgrounds tab
    Then six background rows are shown and the section index reads "Expanded backgrounds · 6"
    When the player presses Undo
    Then seven rows are shown again with the seventh as it was

  Scenario Outline: A negative point value is corrected with a message
    Given a character in edit mode on the Backgrounds tab with a <family> of 2 points
    When the player enters -3 points
    Then the points show 0 and "Points kept at 0 or more." is shown
    And the points are still 0 after a reload
    Examples:
      | family |
      | merit  |
      | flaw   |

  Scenario: An edited field survives a reload
    Given a character in edit mode with the background Allies 2
    When the player sets Allies to 4 and its summary to "Camille's circle" on the Backgrounds tab
    And the sheet is reloaded (a reload returns to play mode)
    Then Allies shows 4 of 5 dots and the summary "Camille's circle"

  Scenario: Empty sections say they are empty
    Given a character with no backgrounds, havens, merits, flaws or other traits
    When the Backgrounds tab is opened in play mode
    Then the Backgrounds section shows "No backgrounds yet."
    And the Havens section shows "No havens yet."
    And the Merits section shows "No merits yet." and the Flaws section "No flaws yet."
    And the Other traits section shows "No other traits yet."
    And every count in the section index reads 0
    When the player switches to edit mode
    Then the Havens, Merits, Flaws and Other traits sections show the same messages with an Add control
    And the Backgrounds section shows six empty rows

  Scenario: Section counts match the lists in play mode
    Given a character with five named backgrounds, two havens, two merits, one flaw and three other traits
    When the Backgrounds tab is opened in play mode
    Then the section index reads "Expanded backgrounds · 5", "Havens · 2", "Merits · 2", "Flaws · 1" and "Other Traits · 3"

  Scenario: Section counts in edit mode include blank rows
    Given a character in edit mode with five named backgrounds and a haven with no name
    When the Backgrounds tab is opened
    Then the section index reads "Expanded backgrounds · 6" and "Havens · 1"
    When the player switches to play mode
    Then the section index reads "Expanded backgrounds · 5" and "Havens · 0"

  Scenario: The Backgrounds tab is accessible and fits a phone
    Given a character in edit mode with eight backgrounds
    When the Backgrounds tab is scanned for accessibility problems
    Then no problems are reported
    When the Backgrounds tab is opened at 320 pixels wide with crowded content
    Then the page does not scroll sideways
```

**Steps:**

#### Step 7.1: Background view model

**Complexity**: standard
**IMPLEMENT**: Pure `backgroundCards(character, mode)`: named rows with rating, summary, note and people; unnamed rows excluded in play and included in edit as add slots; a flag for "details but no name"; the named-row (play) and all-row (edit) count the section index uses
**TEST**: Unit tests: named only in play; all rows in edit; details-without-name flagged; people order preserved; dots clamp to 5 while the stored number stays as text; the count is named rows in play and all rows in edit
**REFACTOR**: Reuse `namedRows`
**Files**: `src/domain/v20/backgrounds/cards.ts`, `src/domain/v20/backgrounds/cards.test.ts`
**Commit**: `feat(backgrounds): background cards view model`

#### Step 7.2: The tab and background cards

**Complexity**: standard
**IMPLEMENT**: Descriptor, panel, mount, section heading with count, background cards with read-only dots and the read-only hint; empty state "No backgrounds yet."
**TEST**: Scenarios "show name, dots, summary, note and people" (including the F6 line), "Unnamed rows hidden", "Play mode is read-only", "Empty sections" (Backgrounds part)
**REFACTOR**: Dots use the existing read-only rating presentation
**Files**: `src/tabs/backgrounds/descriptor.ts`, `src/tabs/backgrounds/Panel.astro`, `src/tabs/backgrounds/mount.ts`, `src/tabs/backgrounds/drawBackgrounds.ts`, `src/tabs/backgrounds/backgrounds.css`, `features/steps/backgrounds.steps.ts`, `features/steps/support/backgrounds.ts`
**Commit**: `feat(backgrounds): Backgrounds tab with background cards`

#### Step 7.3: Havens

**Complexity**: standard
**IMPLEMENT**: Havens: kind chip, name, description, location, access, security; empty state "No havens yet."
**TEST**: Scenario "Havens, other traits and the notes card" (havens part); "Empty sections" (Havens part)
**REFACTOR**: Fields drawn from one label list
**Files**: `src/tabs/backgrounds/drawHavens.ts`, `src/tabs/backgrounds/mount.ts`, `features/steps/backgrounds.steps.ts`
**Commit**: `feat(backgrounds): havens`

#### Step 7.4: Merits and Flaws with totals

**Complexity**: standard
**IMPLEMENT**: Pure `pointTotal(entries)`; the two sections with category, row points ("1 pt") and header totals ("3 points") from Slice 3's labels; empty states "No merits yet." and "No flaws yet."; the total covers the same rows the count does
**TEST**: Unit tests for totals (empty, one, many, zero points); scenario "Merits and Flaws show points and totals"; "Empty sections" (Merits and Flaws part)
**REFACTOR**: One entry component for both sections
**Files**: `src/domain/v20/backgrounds/points.ts`, `src/domain/v20/backgrounds/points.test.ts`, `src/tabs/backgrounds/drawMeritsFlaws.ts`, `src/tabs/backgrounds/mount.ts`, `features/steps/backgrounds.steps.ts`
**Commit**: `feat(backgrounds): merits and flaws with point totals`

#### Step 7.5: Other traits, notes card and section index

**Complexity**: standard
**IMPLEMENT**: Other traits (name, optional dots, kind, note; empty state "No other traits yet."), the "Character notes, not rule effects" card, and the section index with counts for all five sections: "Expanded backgrounds · N", "Havens · N", "Merits · N", "Flaws · N", "Other Traits · N", where N is named rows in play and all rows in edit
**TEST**: Scenarios "Havens, other traits and the notes card" (rest), "Empty sections say they are empty" (whole scenario), "Section counts match the lists in play mode", "Section counts in edit mode include blank rows"
**REFACTOR**: Counts from Slice 3's `countLabel`
**Files**: `src/tabs/backgrounds/drawOther.ts`, `src/tabs/backgrounds/drawIndex.ts`, `src/tabs/backgrounds/mount.ts`, `features/steps/backgrounds.steps.ts`
**Commit**: `feat(backgrounds): other traits, notes card and section index`

#### Step 7.6: Editing, adding, removing and undo

**Complexity**: complex
**IMPLEMENT**: Pure setters (`setBackgroundDetail`, `addBackground`, `removeEntry`, `restoreEntry`, `addMerit`, `addFlaw`, `addHaven`, `addOtherTrait` and field updates; points floored at 0 with the message "Points kept at 0 or more."). Removal rule for backgrounds: `removeEntry` on one of the six base rows blanks it in place (name "", rating 0, summary, note and people cleared) and never changes the list length; a row past the sixth is spliced out; `restoreEntry` puts every removed field back at its original index (into the blank base row, or re-inserted for a row past the sixth). Every setter leaves `validBackgrounds` true. In edit mode every field is an input with min/max hints, entries get Add and Remove controls, backgrounds grow past six, removal shows Slice 3's undo notice and moves focus per Conventions; all changes go through `apply`; every family's index count and list are redrawn from the stored record after each change
**TEST**: Unit tests for each setter (add, edit, remove, restore, remove last, index out of range ignored, points floored): removing each of the six base rows keeps the length at six with every field cleared; removing the seventh splices it; `restoreEntry` after either round-trips every field including people; `validBackgrounds` holds after every step. Scenarios "Edit mode shows every row", "flagged", "adds a merit and the counts follow", "adds an entry to each other section", "Removing a flaw can be undone", "Removing an entry from each other section", "Removing a background blanks its row", "A background past the sixth", "seventh background", "negative point value", "An edited field survives a reload"
**REFACTOR**: One generic list updater for the five list families
**Files**: `src/domain/v20/backgrounds/edit.ts`, `src/domain/v20/backgrounds/edit.test.ts`, `src/tabs/backgrounds/drawEdit.ts`, `src/tabs/backgrounds/mount.ts`, `features/steps/backgrounds.steps.ts`
**Commit**: `feat(backgrounds): edit, add, remove and undo`

#### Step 7.7: Accessibility and narrow screens

**Complexity**: trivial
**IMPLEMENT**: Fix whatever the shared scans report in edit mode with eight backgrounds
**TEST**: Scenario "accessible and fits a phone"
**REFACTOR**: None
**Files**: `src/tabs/backgrounds/backgrounds.css`, `features/steps/backgrounds.steps.ts`
**Commit**: `test(backgrounds): accessibility and 320px`

### Slice 8: Combat tab

**Depends-on:** 1, 3, 5
**Files:** `src/tabs/combat/**`, `src/domain/v20/combat/pools.ts`, `src/domain/v20/combat/pools.test.ts`, `src/domain/v20/combat/attack.ts`, `src/domain/v20/combat/attack.test.ts`, `src/domain/v20/combat/damage.ts`, `src/domain/v20/combat/damage.test.ts`, `src/domain/v20/combat/requirements.ts`, `src/domain/v20/combat/requirements.test.ts`, `features/dossier-tabs/slice-8-*.feature`, `features/steps/combat.steps.ts`, `features/steps/support/combat.ts`

**Rules this slice pins:**

- **Base difficulty is 6** (the V20 standard). A chosen Range replaces it with 4, 6 or 8. The manoeuvre's difficulty, the Target's and the player's ± modifier are then added.
- **Accuracy is shown beside the attack pool**, not added into it. "Normal" is 0.
- **The manoeuvre is named "Weapon Strike"** as in the data and the checklist.
- **Search** matches a manoeuvre's name and a weapon's name and note.
- **Modifiers** (the dice and difficulty ± inputs, Target and Range) are page state: switching to another tab and back, with no reload, clears them. Nothing is stored.

**Behavior:**

```gherkin
Feature: Combat tab

  Scenario: Manoeuvres show the character's pool
    Given a character with Dexterity 3, Brawl 1 and a Hurt wound (1 die off every pool)
    When the Combat tab is opened
    Then Strike shows "3 dice" with "Dexterity 3 + Brawl 1 − wound 1"
    And these manoeuvres show "3 dice" and the rulebook's values (V20 pp. 276 and 279):
      | Manoeuvre | Accuracy | Difficulty | Base damage |
      | Strike    | Normal   | Normal     | Str         |
      | Kick      | Normal   | +1         | Str +1      |
      | Claw      | Normal   | Normal     | Str +1      |
    And the character's name, the mode toggle, the save status and the resources row are shown

  Scenario: Melee weapons list the rulebook entries with the character's pool
    Given a character with Dexterity 3 and Melee 0
    When the Combat tab is opened on Melee
    Then every melee weapon shows "3 dice" and its V20 page "p. 280"
    And the melee weapons show the rulebook's damage, type and concealment:
      | Weapon | Damage | Type    | Concealment |
      | Sap    | Str +1 | Bashing | P           |
      | Club   | Str +2 | Bashing | T           |
      | Knife  | Str +1 | Lethal  | J           |
      | Sword  | Str +2 | Lethal  | T           |
      | Axe    | Str +3 | Lethal  | N           |
      | Stake  | Str +1 | Lethal  | T           |

  Scenario: Ranged manoeuvres and weapons list the rulebook entries
    Given a character with Dexterity 3 and Firearms 2
    When the Combat tab is opened on Ranged
    Then "Three-Round Burst" shows "5 dice", accuracy "+2", difficulty "+1" and damage "Weapon" (V20 pp. 278 and 279)
    And "Automatic Fire" shows accuracy "+10", difficulty "+2" and damage "Special"
    And "Revolver, Lt." shows damage 4, range 12, rate 3, clip 6, concealment "P" and "p. 281"
    And "Revolver, Lt." shows "5 dice"

  Scenario: Selecting a weapon and manoeuvre builds the attack pool
    Given a character with Dexterity 3 and Melee 0
    When the player selects the Sap and "Weapon Strike" on the Combat tab
    Then the attack pool reads "3 dice" with "Dexterity 3 + Melee 0"
    And accuracy reads "Normal" and difficulty reads 6

  Scenario: Modifiers and Target change the pool and are forgotten on leaving
    Given a character with Dexterity 3, Melee 0 and Strength 2 with the Sap and "Weapon Strike" selected on the Combat tab
    And the Weapon roll panel shows an attack pool of 3 dice, accuracy "Normal", difficulty 6 and a damage pool of 3 dice
    When the player adds one die and raises the difficulty by one
    Then the pool reads 4 dice and the difficulty 7
    When the player chooses the Target "Small (hand, head, cellphone)"
    Then the difficulty reads 9 and the damage pool reads 4 dice
    And the Targeting table entry it follows reads difficulty "+2" and damage "+1" (V20 p. 274)
    When the player opens the Character sheet tab and then the Combat tab again, without reloading
    Then the dice modifier and the difficulty modifier read 0
    And Target and Range are back at their defaults
    And the stored record is identical to the record before the visit

  Scenario: A dice modifier larger than the pool floors the attack pool at zero
    Given a character with Dexterity 3 and Melee 0 with the Sap and "Weapon Strike" selected on the Combat tab
    When the player sets the dice modifier to -5
    Then the attack pool reads "0 dice"

  Scenario Outline: Range sets the base difficulty
    Given a character with Dexterity 3 and Firearms 2 with "Revolver, Lt." and "Multiple Shots" selected on the Combat tab
    When the player chooses the Range "<range>"
    Then the difficulty reads <difficulty> (V20 p. 278)
    Examples:
      | range       | difficulty |
      | Point blank | 4          |
      | Short range | 6          |
      | Long range  | 8          |

  Scenario: The damage pool adds the weapon and the extra successes
    Given a character with Strength 3
    When the player selects the Sap (damage "Str +1") and enters 2 extra successes on the Combat tab
    Then the damage pool reads 6 dice

  Scenario: Flat damage and a negative entry
    Given a character with Strength 3 with "Revolver, Lt." (flat damage 4) and "Multiple Shots" selected on the Combat tab
    Then the damage pool reads 4 dice
    When the player enters -2 extra successes
    Then the entry shows 0 and "Extra successes kept at 0 or more." is shown
    And the damage pool still reads 4 dice

  Scenario: A manoeuvre the character cannot use says why
    Given a character with Protean 1 and no weapon selected
    When the Combat tab is opened
    Then Claw is marked "Unavailable" and "Prerequisite"
    And Claw states its requirement "One of: Protean: Feral Claws; Vicissitude: Bonecraft"
    And Weapon Strike is marked "Weapon required" and states "A melee weapon"

  Scenario: A manoeuvre becomes usable when the requirement is met
    Given a character with Protean 2, which unlocks Feral Claws
    When the Combat tab is opened
    Then Claw is not marked "Unavailable" or "Prerequisite"
    When the player selects the Sap
    Then Weapon Strike no longer says "Weapon required" and uses the Sap

  Scenario Outline: A Prerequisite manoeuvre is marked until its power is known
    Given a character with <discipline> <rating>
    When the Combat tab is opened
    Then Claw is <marking>
    Examples:
      | discipline  | rating | marking                                                          |
      | Protean     | 1      | marked "Prerequisite" with "One of: Protean: Feral Claws; Vicissitude: Bonecraft" |
      | Protean     | 2      | not marked                                                       |
      | Vicissitude | 2      | marked "Prerequisite" with "One of: Protean: Feral Claws; Vicissitude: Bonecraft" |
      | Vicissitude | 3      | not marked                                                       |

  Scenario: The section control and search narrow the tables
    Given the Combat tab is opened
    Then "All" is chosen and thirteen close combat manoeuvres, five ranged manoeuvres, six melee weapons and eleven ranged weapons are listed
    When the player chooses "Close combat"
    Then only the thirteen close combat manoeuvres and the six melee weapons are listed and the Melee sub-tab is selected
    When the player chooses "Ranged combat"
    Then only the five ranged manoeuvres and the eleven ranged weapons are listed and the Ranged sub-tab is selected
    When the player chooses the Melee sub-tab
    Then "Close combat" is chosen
    When the player chooses "All"
    And the player searches "stake"
    Then the Stake is the only row listed in the weapons tables and no manoeuvre row is listed
    When the player searches "revolver"
    Then the ranged weapons table lists exactly "Revolver, Lt." and "Revolver, Hvy."
    And no melee row and no manoeuvre row is listed
    When the player chooses "Close combat"
    Then "No manoeuvres or weapons match." is shown
    When the player searches "zzzz"
    Then "No manoeuvres or weapons match." is shown

  Scenario: An incapacitated character has no pools
    Given a character with Dexterity 3, Strength 3 and the health track fully marked Incapacitated, with the Sap and "Weapon Strike" selected on the Combat tab
    When the Combat tab is opened
    Then every manoeuvre and weapon pool reads "0 dice"
    And the attack pool reads "0 dice" and the damage pool reads "0 dice"
    And the panel shows "Incapacitated: every pool is 0 dice."

  Scenario: A Crippled wound floors a pool at zero
    Given a character with Dexterity 3, Brawl 1 and a Crippled wound (5 dice off every pool)
    When the Combat tab is opened
    Then Strike reads "0 dice" with "Dexterity 3 + Brawl 1 − wound 5" because the pool is floored at 0
    And "Incapacitated: every pool is 0 dice." is not shown

  Scenario: Nothing is rolled
    Given the Sap and "Weapon Strike" selected on the Combat tab
    Then the Weapon roll panel has no control whose name contains "Roll"
    And it says "Pools only — roll your own dice."
    And repeated redraws show no random result

  Scenario: The reminders and disclaimers are shown
    When the Combat tab is opened
    Then the reminders card lists "Range and cover" (V20 p. 278), "Called shots" (V20 p. 274), "Staking" (V20 p. 280) and "Grappling" (V20 p. 276)
    And "Rulebook reference — not owned equipment" is shown
    And "Base pools shown without Celerity, blood boosts, armor or situational modifiers" is shown

  Scenario: The Combat tab is accessible and fits a phone
    Given a character with a weapon selected, modifiers entered, a Target and a Range chosen, and a search entered on the Combat tab
    When the Combat tab is scanned for accessibility problems
    Then no problems are reported
    When the Combat tab is opened at 320 pixels wide with crowded content
    Then the page does not scroll sideways
    And the reference tables scroll inside their own containers
```

The page for Grappling is the Clinch and Hold entries the checklist cites (p. 276). Step 8.9 checks all four reminder pages against the book before typing them.

**Steps:**

#### Step 8.1: Pools

**Complexity**: standard
**IMPLEMENT**: Pure `manoeuvrePool(character, manoeuvre, weapon?)` using `dicePool` and the wound penalty from the V20 wound table (`woundState`), floored at 0, 0 when Incapacitated with the shared reason "Incapacitated: every pool is 0 dice.", with the formula text from `poolText`
**TEST**: Unit tests: Strike with Dexterity 3, Brawl 1, Hurt = 3 dice ("Dexterity 3 + Brawl 1 − wound 1"); Melee 0 uses the attribute plus 0; Crippled floors at 0 (3 + 1 − 5 = −1 gives 0, "Dexterity 3 + Brawl 1 − wound 5"); Incapacitated gives 0 with the reason; every manoeuvre gets a pool
**REFACTOR**: No second formatter
**Files**: `src/domain/v20/combat/pools.ts`, `src/domain/v20/combat/pools.test.ts`
**Commit**: `feat(combat): manoeuvre pools`

#### Step 8.2: The tab and the melee manoeuvre table

**Complexity**: standard
**IMPLEMENT**: Descriptor, panel, mount, draw modules; Melee / Ranged sub-tabs as the segmented control; the melee manoeuvre table with the character's pool, accuracy, difficulty and base damage printed as in the checklist ("Normal", "+1", "Str +1"); live resources shown
**TEST**: Scenario "Manoeuvres show the character's pool" (including the F6 line)
**REFACTOR**: Rows from data, no per-row markup
**Files**: `src/tabs/combat/descriptor.ts`, `src/tabs/combat/Panel.astro`, `src/tabs/combat/mount.ts`, `src/tabs/combat/drawManoeuvres.ts`, `src/tabs/combat/combat.css`, `features/steps/combat.steps.ts`, `features/steps/support/combat.ts`
**Commit**: `feat(combat): Combat tab with the melee manoeuvre table`

#### Step 8.3: Melee weapons

**Complexity**: standard
**IMPLEMENT**: The melee weapons table (damage as "Str +N", type, concealment letter, page, and the character's pool for each, which is Dexterity + Melee) with a "Use in roll" row action that fills the Weapon roll panel
**TEST**: Scenario "Melee weapons list the rulebook entries with the character's pool" (all six rows of the table)
**REFACTOR**: None
**Files**: `src/tabs/combat/drawWeapons.ts`, `src/tabs/combat/mount.ts`, `features/steps/combat.steps.ts`
**Commit**: `feat(combat): melee weapons table`

#### Step 8.4: Ranged manoeuvres and weapons

**Complexity**: standard
**IMPLEMENT**: The Ranged sub-tab's manoeuvre and weapon tables (damage, range, rate, clip, conceal, page; the character's pool is Dexterity + Firearms)
**TEST**: Scenario "Ranged manoeuvres and weapons list the rulebook entries" with the pinned line "Revolver, Lt. | damage 4 | range 12 | rate 3 | clip 6 | conceal P | p. 281" from `docs/specs/dossier-tabs-combat-review.md`
**REFACTOR**: Same table drawer as 8.3
**Files**: `src/tabs/combat/drawRanged.ts`, `src/tabs/combat/mount.ts`, `features/steps/combat.steps.ts`
**Commit**: `feat(combat): ranged tables`

#### Step 8.5: Search and the section control

**Complexity**: standard
**IMPLEMENT**: One `section` state ("all", "melee", "ranged") shared by the sub-tabs and the All / Close combat / Ranged combat filter; search over a manoeuvre's name and a weapon's name and note narrows both tables; empty state "No manoeuvres or weapons match."
**TEST**: Unit test of the section/filter state (each of the three values, sub-tab and filter in step both ways, and the counts 13, 5, 6 and 11 under "all"); scenario "The section control and search narrow the tables"
**REFACTOR**: Uses Slice 3's `filterBy`
**Files**: `src/tabs/combat/section.ts`, `src/tabs/combat/section.test.ts`, `src/tabs/combat/mount.ts`, `features/steps/combat.steps.ts`
**Commit**: `feat(combat): search and section control`

#### Step 8.6: Attack pool, Target and Range

**Complexity**: standard
**IMPLEMENT**: Pure `attackPool` combining manoeuvre pool, weapon, ± dice modifier, ± difficulty modifier, Target (called-shot difficulty and damage, `CALLED_SHOTS`) and Range (ranged base difficulty, `RANGE_BANDS`) from Slice 5's tables; base difficulty 6, replaced by the Range's 4, 6 or 8, then plus the manoeuvre's, the Target's and the modifier; the Weapon roll panel with pickers, result card and the line "Pools only — roll your own dice."; modifiers, Target and Range are page state cleared by `leave` (so they are zero after switching tabs and back with no reload) and never stored; "Use in roll" scrolls to and focuses the result card on narrow screens
**TEST**: Unit tests for `attackPool` (modifiers, floor at 0 with a −5 dice modifier on a 3 dice pool, accuracy, every called-shot row of the Targeting table and every Range row: Point blank 4, Short range 6, Long range 8); scenarios "Selecting a weapon and manoeuvre", "Modifiers and Target", "A dice modifier larger than the pool", "Range sets the base difficulty", "Nothing is rolled"
**REFACTOR**: Picker options built from the data modules
**Files**: `src/domain/v20/combat/attack.ts`, `src/domain/v20/combat/attack.test.ts`, `src/tabs/combat/drawRoll.ts`, `src/tabs/combat/mount.ts`, `features/steps/combat.steps.ts`
**Commit**: `feat(combat): Weapon roll panel with attack pool`

#### Step 8.7: Damage pool

**Complexity**: standard
**IMPLEMENT**: Pure `damagePool(character, weapon, extraSuccesses, target)`: weapon damage (Strength-based uses the character's Strength) plus extra successes plus the Target's damage bonus, never below 0, with its damage type and difficulty; extra successes are clamped at 0, and a negative entry is corrected to 0 with "Extra successes kept at 0 or more." (the clamp never lowers the weapon's own damage)
**TEST**: Unit tests: Strength + 1 with Strength 3 and 2 extra = 6; flat damage 4 with Strength 3 = 4; flat damage 4 with −2 extra successes clamps to 0 extra and reads 4 with the message; Strength 0 with Str +1 reads 1 and never below 0; Target damage bonus (Small +1 on Strength 2 + 1 = 4); scenarios "damage pool", "Flat damage and a negative entry"
**REFACTOR**: None
**Files**: `src/domain/v20/combat/damage.ts`, `src/domain/v20/combat/damage.test.ts`, `src/tabs/combat/drawRoll.ts`, `features/steps/combat.steps.ts`
**Commit**: `feat(combat): damage pool`

#### Step 8.8: Unavailable manoeuvres and incapacitation

**Complexity**: standard
**IMPLEMENT**: Requirement checks with the stated reason read as the checklist's requirement text: a weapon requirement is tagged "Weapon required" ("A melee weapon", "A ranged weapon", or "A ranged weapon capable of bursts and full auto (asterisked on the chart)"); a power or prior-manoeuvre requirement is tagged "Prerequisite" (Claw: "One of: Protean: Feral Claws; Vicissitude: Bonecraft", met when the character's Protean rating is 2 or more or Vicissitude 3 or more; Bite: "A successful Clinch, Hold, or Tackle first"); an unmet requirement is marked with its reason and a met one is not marked; the positive case is covered; Incapacitated (the health track fully marked) zeroes attack and damage pools and shows the shared sentence "Incapacitated: every pool is 0 dice."; state in text, not color
**TEST**: Unit tests for requirement readings (met, unmet, weapon selected, Claw at Protean 1 and 2 and Vicissitude 2 and 3); scenarios "cannot use says why", "becomes usable", "A Prerequisite manoeuvre is marked", "incapacitated", "A Crippled wound floors a pool"
**REFACTOR**: Requirement kinds as the union from Slice 5
**Files**: `src/domain/v20/combat/requirements.ts`, `src/domain/v20/combat/requirements.test.ts`, `src/tabs/combat/mount.ts`, `features/steps/combat.steps.ts`
**Commit**: `feat(combat): unavailable manoeuvres and incapacitation`

#### Step 8.9: Reminders and disclaimers

**Complexity**: trivial
**IMPLEMENT**: The reminders card (range and cover p. 278, called shots p. 274, staking p. 280, grappling p. 276) and the two disclaimers ("Rulebook reference — not owned equipment"; "Base pools shown without Celerity, blood boosts, armor or situational modifiers") with page references, typed from the book
**TEST**: Scenario "The reminders and disclaimers are shown"
**REFACTOR**: None
**Files**: `src/tabs/combat/Reminders.astro`, `src/tabs/combat/Panel.astro`, `features/steps/combat.steps.ts`
**Commit**: `feat(combat): reminders and disclaimers`

#### Step 8.10: Accessibility and narrow screens

**Complexity**: trivial
**IMPLEMENT**: Fix whatever the shared scans report with a weapon selected, modifiers entered, a Target and a Range chosen and a search entered; the segmented control and filter states are scanned
**TEST**: Scenario "accessible and fits a phone"
**REFACTOR**: None
**Files**: `src/tabs/combat/combat.css`, `features/steps/combat.steps.ts`
**Commit**: `test(combat): accessibility and 320px`

## Build Progress

This section is the machine-parseable recovery handle.

### Slices (grouped by wave)

#### Wave 2
- [ ] Slice 6: Disciplines tab
  - [x] Step 6.1: The Discipline view model
  - [x] Step 6.2: The tab, list and empty state
  - [x] Step 6.3: Power panels
  - [x] Step 6.4: Search and Owned / All
  - [x] Step 6.5: Build pool
  - [x] Step 6.6: Accessibility and narrow screens
- [ ] Slice 7: Backgrounds tab
  - [ ] Step 7.1: Background view model
  - [ ] Step 7.2: The tab and background cards
  - [ ] Step 7.3: Havens
  - [ ] Step 7.4: Merits and Flaws with totals
  - [ ] Step 7.5: Other traits, notes card and section index
  - [ ] Step 7.6: Editing, adding, removing and undo
  - [ ] Step 7.7: Accessibility and narrow screens
- [ ] Slice 8: Combat tab
  - [ ] Step 8.1: Pools
  - [ ] Step 8.2: The tab and the melee manoeuvre table
  - [ ] Step 8.3: Melee weapons
  - [ ] Step 8.4: Ranged manoeuvres and weapons
  - [ ] Step 8.5: Search and the section control
  - [ ] Step 8.6: Attack pool, Target and Range
  - [ ] Step 8.7: Damage pool
  - [ ] Step 8.8: Unavailable manoeuvres and incapacitation
  - [ ] Step 8.9: Reminders and disclaimers
  - [ ] Step 8.10: Accessibility and narrow screens
