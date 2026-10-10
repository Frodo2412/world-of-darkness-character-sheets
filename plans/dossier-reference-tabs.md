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

Known items to settle while building (from PR A's review): Awe's cost and duration in the data differ from Step 4.2 and the Slice 6 scenario below (data: 1 blood point, remainder of the scene) and Slice 6's scenarios expect Celerity powers that the catalogue does not have (Celerity, Fortitude and Potence list none); use Presence's Majesty for the "no roll" case. `validBackgrounds` requires at least six rows, so Slice 7's removal must blank a base row rather than splice below six (or the validator is relaxed first). The shell contract also offers `ctx.poolSelection()` and `ctx.togglePool(row)`.

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
    And Auspex shows "2 levels unlocked" and Celerity "1 level unlocked"

  Scenario: Powers are Known up to the rating and Locked above it, in level order
    Given a character with Presence 3
    When Presence is selected on the Disciplines tab
    Then the powers are listed Awe, Dread Gaze, Entrancement, Summon, Majesty
    And Awe, Dread Gaze and Entrancement are Known
    And Summon is Locked with "Requires Presence 4"
    And Majesty is Locked with "Requires Presence 5"

  Scenario: An expanded power shows its rules and the character's pool
    Given a character with Charisma 3, Performance 3 and a Hurt wound
    When the Awe power is expanded on the Disciplines tab
    Then it shows activation cost "None", duration "One scene", prerequisite "Presence 1" and difficulty "7"
    And it shows its dice pool "Charisma + Performance" and its V20 page
    And it shows "Your pool: 5 dice" with "Charisma 3 + Performance 3 − wound 1"

  Scenario: A heavy wound floors the pool at zero
    Given a character with Charisma 1, Performance 0 and a Crippled wound
    When the Awe power is expanded on the Disciplines tab
    Then it shows "Your pool: 0 dice"

  Scenario: An incapacitated character has no pool
    Given a character who is Incapacitated with Presence 1
    When the Awe power is expanded on the Disciplines tab
    Then it shows "Your pool: 0 dice" and says the character is incapacitated

  Scenario: A Locked power shows its rules but no pool
    Given a character with Presence 3
    When the Summon power is expanded on the Disciplines tab
    Then it shows "Locked — requires Presence 4"
    And it has no pool and no "Build pool" button

  Scenario: A power that uses no roll says what it uses instead
    Given a character with Celerity 1
    When the Celerity power is expanded on the Disciplines tab
    Then what it uses instead of a roll is stated
    And it has no "Build pool" button

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
    Then an empty-state message is shown

  Scenario: Owned and All disciplines switch the list
    Given a character with Presence 3, Auspex 2 and Celerity 1
    Then the "Owned" control reads "Owned · 3"
    When the player chooses "All disciplines"
    Then all seventeen catalogued Disciplines are listed
    And a Discipline the character lacks shows every power Locked
    When the player chooses "Owned" again
    Then the three Disciplines are listed

  Scenario: Build pool selects the power's traits on the Character sheet
    Given a character viewing the Awe power on the Disciplines tab
    When the player presses "Build pool"
    Then the Character sheet tab is shown
    And its Selected pool holds Charisma and Performance
    And "Pool set to Charisma + Performance" is announced

  Scenario: A Discipline rated 0 or unknown shows no powers
    Given a character with a Discipline named "Homebrewed" rated 2 and Dominate rated 0
    When the Disciplines tab is opened
    Then "Homebrewed" shows its name and rating and no powers
    And Dominate shows its name and rating and no powers

  Scenario: A character with no Disciplines sees an empty state
    Given a character with no named Disciplines
    When the Disciplines tab is opened
    Then a message says the character has none and offers "All disciplines"

  Scenario: The Disciplines tab has nothing to edit
    Given a character in edit mode
    When the Disciplines tab is opened
    Then nothing on the tab can be edited
    And the tab says to edit Discipline ratings on the Character sheet

  Scenario: The Disciplines tab is accessible and fits a phone
    Given a character with Presence 3
    When the Disciplines tab is scanned for accessibility problems
    Then no problems are reported
    When the Disciplines tab is opened at 320 pixels wide with crowded content
    Then the page does not scroll sideways
```

"See rulebook (V20 p. N)" for an undefined field is verified by unit tests in Step 6.1 (the catalogue's undefined fields change with Slice 4's data, so no browser scenario depends on one).

**Steps:**

#### Step 6.1: The Discipline view model

**Complexity**: standard
**IMPLEMENT**: Pure `disciplineView(character, mode)` returning the Owned and All lists: per Discipline its rating, "N level(s) unlocked", and powers in level order with Known or Locked and "Requires <Discipline> N"; rated 0 or unknown shows no powers in Owned (in All a catalogued Discipline appears like any unowned one); `fieldText(power, field)` giving the value or "See rulebook (V20 p. N)"
**TEST**: Unit tests: rating 0; rating above the catalogue's powers; Locked text; singular and plural; level order; undefined field text with its page
**REFACTOR**: Build on `disciplineReadings`; no second catalogue walk
**Files**: `src/domain/v20/disciplineView.ts`, `src/domain/v20/disciplineView.test.ts`
**Commit**: `feat(disciplines): discipline view model`

#### Step 6.2: The tab, list and empty state

**Complexity**: standard
**IMPLEMENT**: Descriptor (shows resources), panel, mount and draw modules: left list (selectable items), selected heading with "Your rating", power rows, empty state, read-only hint line "Edit Discipline ratings on the Character sheet" with a link that opens that tab
**TEST**: Scenarios "lists the Disciplines", "Known up to the rating", "no Disciplines", "nothing to edit", "rated 0 or unknown"
**REFACTOR**: Presentational pieces use Slice 3's parts
**Files**: `src/tabs/disciplines/descriptor.ts`, `src/tabs/disciplines/Panel.astro`, `src/tabs/disciplines/mount.ts`, `src/tabs/disciplines/drawList.ts`, `src/tabs/disciplines/disciplines.css`, `features/steps/disciplines.steps.ts`, `features/steps/support/disciplines.ts`
**Commit**: `feat(disciplines): Disciplines tab and list`

#### Step 6.3: Power panels

**Complexity**: standard
**IMPLEMENT**: Each power is a native `<details>`; the panel shows cost, duration, prerequisite, pool, difficulty / resistance, summary and book reference; a Known rolling power shows "Your pool: N dice" with the formula from `poolText`; a Locked power shows its rules and "Locked — requires …" with no pool or Build pool; non-rolling powers state what they use
**TEST**: Scenarios "expanded power", "heavy wound", "incapacitated", "Locked power", "uses no roll", "keyboard"
**REFACTOR**: Pool text from the shared helper only
**Files**: `src/tabs/disciplines/drawPower.ts`, `src/tabs/disciplines/mount.ts`, `features/steps/disciplines.steps.ts`
**Commit**: `feat(disciplines): expanded power with the character's pool`

#### Step 6.4: Search and Owned / All

**Complexity**: standard
**IMPLEMENT**: Search over Discipline and power names and summaries with a result count and empty state; Owned · N and All disciplines via the segmented control; the selected Discipline stays selected when it survives the filter, otherwise the first match is selected
**TEST**: Scenarios "Search matches", "Owned and All"
**REFACTOR**: Uses Slice 3's `filterBy`
**Files**: `src/tabs/disciplines/drawSearch.ts`, `src/tabs/disciplines/mount.ts`, `features/steps/disciplines.steps.ts`
**Commit**: `feat(disciplines): search and all-disciplines view`

#### Step 6.5: Build pool

**Complexity**: standard
**IMPLEMENT**: "Build pool" on a Known rolling power calls `ctx.selectPool` and `ctx.openTab('sheet')`, then focuses the Selected pool heading and announces "Pool set to <formula>"
**TEST**: Scenario "Build pool selects the power's traits"
**REFACTOR**: None
**Files**: `src/tabs/disciplines/mount.ts`, `features/steps/disciplines.steps.ts`
**Commit**: `feat(disciplines): build pool from a power`

#### Step 6.6: Accessibility and narrow screens

**Complexity**: trivial
**IMPLEMENT**: Fix whatever the shared scans report on this tab in its richest state (expanded power, All view, search with no match); tables or lists scroll inside their own containers
**TEST**: Scenario "accessible and fits a phone"
**REFACTOR**: None
**Files**: `src/tabs/disciplines/disciplines.css`, `features/steps/disciplines.steps.ts`
**Commit**: `test(disciplines): accessibility and 320px`

### Slice 7: Backgrounds tab

**Depends-on:** 1, 2, 3
**Files:** `src/tabs/backgrounds/**`, `src/domain/v20/backgrounds/**`, `features/dossier-tabs/slice-7-*.feature`, `features/steps/backgrounds.steps.ts`, `features/steps/support/backgrounds.ts`

**Behavior:**

```gherkin
Feature: Backgrounds tab

  Scenario: Backgrounds show their name, dots, summary, note and people
    Given a character with Allies 2 summarised "Camille Arnaud · museum curator" and two named allies
    When the Backgrounds tab is opened
    Then Allies shows 2 of 5 dots, its summary, its note and both people with their roles

  Scenario: Unnamed background rows are hidden in play
    Given a character with two named backgrounds and four blank rows
    When the Backgrounds tab is opened
    Then two background cards are shown

  Scenario: Edit mode shows every row and offers to add more
    Given a character in edit mode with two named backgrounds and four blank rows
    When the Backgrounds tab is opened
    Then six background rows are shown, four of them empty
    And an "Add background" control is shown

  Scenario: A row with details but no name is flagged in edit mode
    Given a character in edit mode with a background row holding a note but no name
    When the Backgrounds tab is opened
    Then that row says "Name needed to show in play mode"

  Scenario: Merits and Flaws show points and totals
    Given a character with merits of 1 and 2 points and a flaw of 1 point
    When the Backgrounds tab is opened
    Then the Merits heading reads "2 entries · 3 points" and the Flaws heading "1 entry · 1 point"
    And the merits show "1 pt" and "2 pts" and each entry shows its category

  Scenario: Havens, other traits and the notes card are shown
    Given a character with a Primary haven and a Secondary haven and an unrated trait "Languages" noted "French · native"
    When the Backgrounds tab is opened
    Then each haven shows its kind, name, description, location, access and security
    And "Languages" shows its kind and note without dots
    And the note "Character notes, not rule effects" is shown

  Scenario: Play mode is read-only
    Given a character in play mode with backgrounds
    When the Backgrounds tab is opened
    Then nothing on the tab can be edited
    And the read-only hint is shown

  Scenario: Edit mode adds a merit and the counts follow
    Given a character in edit mode with one merit of 1 point
    When the player adds the merit "Eidetic Memory" of 2 points on the Backgrounds tab
    Then the Merits heading reads "2 entries · 3 points"
    And the section index reads "Merits · 2"
    And it is the same after a reload

  Scenario: Removing an entry can be undone
    Given a character in edit mode with one flaw of 1 point
    When the player removes the flaw on the Backgrounds tab
    Then the Flaws section shows its empty state
    And "Removed" with the flaw's name and "Undo" is announced
    When the player presses Undo
    Then the flaw is back with its 1 point and focus is on it

  Scenario: A seventh background can be added
    Given a character in edit mode with six named backgrounds
    When the player adds the background "Domain" on the Backgrounds tab
    Then seven background rows are shown and it survives a reload

  Scenario: A negative point value is corrected with a message
    Given a character in edit mode on the Backgrounds tab with a merit
    When the player enters -3 points
    Then the points show 0 and "Points kept at 0 or more." is shown

  Scenario: Empty sections say they are empty
    Given a character with no backgrounds, havens, merits, flaws or other traits
    When the Backgrounds tab is opened
    Then each section shows an empty-state message

  Scenario: Section counts match the lists
    Given a character with five backgrounds, two havens, two merits, one flaw and three other traits
    When the Backgrounds tab is opened
    Then the section index reads "Expanded backgrounds · 5", "Havens · 2", "Merits · 2", "Flaws · 1" and "Other Traits · 3"

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
**IMPLEMENT**: Pure `backgroundCards(character, mode)`: named rows with rating, summary, note and people; unnamed rows excluded in play and included in edit as add slots; a flag for "details but no name"
**TEST**: Unit tests: named only in play; details-without-name flagged; people order preserved; dots clamp to 5 while the stored number stays as text
**REFACTOR**: Reuse `namedRows`
**Files**: `src/domain/v20/backgrounds/cards.ts`, `src/domain/v20/backgrounds/cards.test.ts`
**Commit**: `feat(backgrounds): background cards view model`

#### Step 7.2: The tab and background cards

**Complexity**: standard
**IMPLEMENT**: Descriptor, panel, mount, section heading with count, background cards with read-only dots and the read-only hint; empty state
**TEST**: Scenarios "show name, dots, summary, note and people", "Unnamed rows hidden", "Play mode is read-only", "Empty sections" (backgrounds part)
**REFACTOR**: Dots use the existing read-only rating presentation
**Files**: `src/tabs/backgrounds/descriptor.ts`, `src/tabs/backgrounds/Panel.astro`, `src/tabs/backgrounds/mount.ts`, `src/tabs/backgrounds/drawBackgrounds.ts`, `src/tabs/backgrounds/backgrounds.css`, `features/steps/backgrounds.steps.ts`, `features/steps/support/backgrounds.ts`
**Commit**: `feat(backgrounds): Backgrounds tab with background cards`

#### Step 7.3: Havens

**Complexity**: standard
**IMPLEMENT**: Havens: kind chip, name, description, location, access, security; empty state
**TEST**: Scenario "Havens, other traits and the notes card" (havens part); empty state
**REFACTOR**: Fields drawn from one label list
**Files**: `src/tabs/backgrounds/drawHavens.ts`, `src/tabs/backgrounds/mount.ts`, `features/steps/backgrounds.steps.ts`
**Commit**: `feat(backgrounds): havens`

#### Step 7.4: Merits and Flaws with totals

**Complexity**: standard
**IMPLEMENT**: Pure `pointTotal(entries)`; the two sections with category, row points ("1 pt") and header totals ("3 points") from Slice 3's labels
**TEST**: Unit tests for totals (empty, one, many, zero points); scenario "Merits and Flaws show points and totals"
**REFACTOR**: One entry component for both sections
**Files**: `src/domain/v20/backgrounds/points.ts`, `src/domain/v20/backgrounds/points.test.ts`, `src/tabs/backgrounds/drawMeritsFlaws.ts`, `src/tabs/backgrounds/mount.ts`, `features/steps/backgrounds.steps.ts`
**Commit**: `feat(backgrounds): merits and flaws with point totals`

#### Step 7.5: Other traits, notes card and section index

**Complexity**: standard
**IMPLEMENT**: Other traits (name, optional dots, kind, note), the "Character notes, not rule effects" card, and the section index with counts for all five sections
**TEST**: Scenarios "Havens, other traits and the notes card" (rest), "Section counts match the lists"
**REFACTOR**: Counts from Slice 3's `countLabel`
**Files**: `src/tabs/backgrounds/drawOther.ts`, `src/tabs/backgrounds/drawIndex.ts`, `src/tabs/backgrounds/mount.ts`, `features/steps/backgrounds.steps.ts`
**Commit**: `feat(backgrounds): other traits, notes card and section index`

#### Step 7.6: Editing, adding, removing and undo

**Complexity**: complex
**IMPLEMENT**: Pure setters (`setBackgroundDetail`, `addBackground`, `removeEntry`, `restoreEntry`, `addMerit`, `addFlaw`, `addHaven`, `addOtherTrait` and field updates; points floored at 0 with the stated message); in edit mode every field is an input with min/max hints, entries get Add and Remove controls, backgrounds grow past six, removal shows Slice 3's undo notice and moves focus per Conventions; all changes go through `apply`
**TEST**: Unit tests for each setter (add, edit, remove, restore, remove last, index out of range ignored, points floored); scenarios "Edit mode shows every row", "flagged", "adds a merit and the counts follow", "Removing can be undone", "seventh background", "negative point value"
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

**Behavior:**

```gherkin
Feature: Combat tab

  Scenario: Manoeuvres show the character's pool
    Given a character with Dexterity 3 and Brawl 1 and a Hurt wound
    When the Combat tab is opened
    Then Strike shows "3 dice" with "Dexterity 3 + Brawl 1 − wound 1"
    And its accuracy, difficulty and base damage are those of the rulebook

  Scenario: Melee weapons list the rulebook entries with the character's pool
    Given a character with Dexterity 3 and Melee 0
    When the Combat tab is opened on Melee
    Then the Sap shows damage "Str +1", type "Bashing", concealment "P" and "3 dice"
    And the Knife, Club, Sword, Axe and Stake are listed with their rulebook damage and concealment

  Scenario: Ranged manoeuvres and weapons list the rulebook entries
    Given a character with Dexterity 3 and Firearms 2
    When the Combat tab is opened on Ranged
    Then a ranged manoeuvre shows its pool, accuracy, difficulty and damage as printed in the rulebook
    And the light revolver shows its damage, range, rate, clip and concealment as printed in the rulebook

  Scenario: Selecting a weapon and manoeuvre builds the attack pool
    Given a character with Dexterity 3 and Melee 0
    When the player selects the Sap and "Weapon strike" on the Combat tab
    Then the attack pool reads "3 dice" with "Dexterity 3 + Melee 0"
    And accuracy and difficulty are shown

  Scenario: Modifiers, Target and Range change the pool and are forgotten on leaving
    Given the Weapon roll panel on the Combat tab showing an attack pool of 3 dice and difficulty 6
    When the player adds one die and raises the difficulty by one
    Then the pool reads 4 dice and the difficulty 7
    When the player chooses a called-shot Target
    Then the difficulty and the damage change as the rulebook's called-shot table says
    When the player leaves the Combat tab and returns after a reload
    Then the modifiers are back to zero and the stored record is unchanged

  Scenario: The damage pool adds the weapon and the extra successes
    Given a character with Strength 3
    When the player selects a weapon of Strength + 1 damage and enters 2 extra successes on the Combat tab
    Then the damage pool reads 6 dice

  Scenario: Flat damage and a negative entry
    Given the Weapon roll panel on the Combat tab with a weapon of flat damage 4
    When the player enters -2 extra successes
    Then the damage pool reads 2 dice and the entry is corrected with a message

  Scenario: A manoeuvre the character cannot use says why
    Given a character with no Discipline power that grants claws
    When the Combat tab is opened
    Then Claw is marked "Unavailable" and states what it requires
    And Weapon strike is marked "Weapon required"

  Scenario: A manoeuvre becomes usable when the requirement is met
    Given a character with Protean 2 and its claws power
    When the Combat tab is opened
    Then Claw is not marked unavailable
    When the player selects the Sap
    Then Weapon strike no longer says "Weapon required" and uses the Sap

  Scenario: Search and the section control narrow the tables
    Given the Combat tab
    When the player searches "stake"
    Then the Stake remains in the weapons table and the manoeuvres that mention it remain
    And everything else is hidden
    When the player searches "zzzz"
    Then "No manoeuvres or weapons match." is shown
    When the player chooses "Ranged combat"
    Then only the Ranged section is shown and the Ranged sub-tab is selected

  Scenario: An incapacitated character has no pools
    Given a character who is Incapacitated
    When the Combat tab is opened
    Then every attack and damage pool reads 0 and the panel says the character is incapacitated

  Scenario: One level below incapacitated still floors the pool
    Given a character with Dexterity 3, Brawl 1 and a Crippled wound
    When the Combat tab is opened
    Then Strike reads "0 dice" because the pool is floored at 0

  Scenario: Nothing is rolled
    Given the Weapon roll panel on the Combat tab
    Then it has no control whose name contains "Roll"
    And it says "Pools only — roll your own dice."
    And repeated redraws show no random result

  Scenario: The reminders and disclaimers are shown
    When the Combat tab is opened
    Then the reminders card lists range and cover, called shots, staking and grappling with page references
    And "Base pools shown without Celerity, blood boosts, armor or situational modifiers" is shown

  Scenario: The Combat tab is accessible and fits a phone
    Given a character with a weapon selected and modifiers entered
    When the Combat tab is scanned for accessibility problems
    Then no problems are reported
    When the Combat tab is opened at 320 pixels wide with crowded content
    Then the page does not scroll sideways
    And the reference tables scroll inside their own containers
```

**Steps:**

#### Step 8.1: Pools

**Complexity**: standard
**IMPLEMENT**: Pure `manoeuvrePool(character, manoeuvre, weapon?)` using `dicePool` and the wound penalty, floored at 0, 0 when Incapacitated, with the formula text from `poolText`
**TEST**: Unit tests: Strike with Dexterity 3, Brawl 1, Hurt = 3 dice; Melee 0 uses the attribute plus 0; Crippled floors at 0; Incapacitated 0 with its reason; every manoeuvre gets a pool
**REFACTOR**: No second formatter
**Files**: `src/domain/v20/combat/pools.ts`, `src/domain/v20/combat/pools.test.ts`
**Commit**: `feat(combat): manoeuvre pools`

#### Step 8.2: The tab and the melee manoeuvre table

**Complexity**: standard
**IMPLEMENT**: Descriptor, panel, mount, draw modules; Melee / Ranged sub-tabs as the segmented control; the melee manoeuvre table with the character's pool, accuracy, difficulty and base damage; live resources shown
**TEST**: Scenario "Manoeuvres show the character's pool"
**REFACTOR**: Rows from data, no per-row markup
**Files**: `src/tabs/combat/descriptor.ts`, `src/tabs/combat/Panel.astro`, `src/tabs/combat/mount.ts`, `src/tabs/combat/drawManoeuvres.ts`, `src/tabs/combat/combat.css`, `features/steps/combat.steps.ts`, `features/steps/support/combat.ts`
**Commit**: `feat(combat): Combat tab with the melee manoeuvre table`

#### Step 8.3: Melee weapons

**Complexity**: standard
**IMPLEMENT**: The melee weapons table (damage, type, concealment, the character's pool for each) with a "Use in roll" row action that fills the Weapon roll panel
**TEST**: Scenario "Melee weapons list the rulebook entries with the character's pool"
**REFACTOR**: None
**Files**: `src/tabs/combat/drawWeapons.ts`, `src/tabs/combat/mount.ts`, `features/steps/combat.steps.ts`
**Commit**: `feat(combat): melee weapons table`

#### Step 8.4: Ranged manoeuvres and weapons

**Complexity**: standard
**IMPLEMENT**: The Ranged sub-tab's manoeuvre and weapon tables (damage, range, rate, clip, conceal)
**TEST**: Scenario "Ranged manoeuvres and weapons list the rulebook entries" with the literal values Slice 5 pinned
**REFACTOR**: Same table drawer as 8.3
**Files**: `src/tabs/combat/drawRanged.ts`, `src/tabs/combat/mount.ts`, `features/steps/combat.steps.ts`
**Commit**: `feat(combat): ranged tables`

#### Step 8.5: Search and the section control

**Complexity**: standard
**IMPLEMENT**: One `section` state ("all", "melee", "ranged") shared by the sub-tabs and the All / Close combat / Ranged combat filter; search narrows both tables; empty state "No manoeuvres or weapons match."
**TEST**: Unit test of the section/filter state; scenario "Search and the section control narrow the tables"
**REFACTOR**: Uses Slice 3's `filterBy`
**Files**: `src/tabs/combat/section.ts`, `src/tabs/combat/section.test.ts`, `src/tabs/combat/mount.ts`, `features/steps/combat.steps.ts`
**Commit**: `feat(combat): search and section control`

#### Step 8.6: Attack pool, Target and Range

**Complexity**: standard
**IMPLEMENT**: Pure `attackPool` combining manoeuvre pool, weapon, ± dice modifier, ± difficulty modifier, Target (called-shot difficulty and damage) and Range (ranged base difficulty) from Slice 5's tables; the Weapon roll panel with pickers, result card and the line "Pools only — roll your own dice."; modifiers are page state cleared by `leave`; "Use in roll" scrolls to and focuses the result card on narrow screens
**TEST**: Unit tests for `attackPool` (modifiers, floor at 0, accuracy, every called-shot and range row); scenarios "Selecting a weapon and manoeuvre", "Modifiers, Target and Range", "Nothing is rolled"
**REFACTOR**: Picker options built from the data modules
**Files**: `src/domain/v20/combat/attack.ts`, `src/domain/v20/combat/attack.test.ts`, `src/tabs/combat/drawRoll.ts`, `src/tabs/combat/mount.ts`, `features/steps/combat.steps.ts`
**Commit**: `feat(combat): Weapon roll panel with attack pool`

#### Step 8.7: Damage pool

**Complexity**: standard
**IMPLEMENT**: Pure `damagePool(character, weapon, extraSuccesses, target)`: weapon damage (Strength-based uses the character's Strength) plus extra successes, never below 0, with its damage type and difficulty; a negative entry is corrected with a message
**TEST**: Unit tests: Strength + 1 with Strength 3 and 2 extra = 6; flat damage; negative extra clamps; target damage bonus; scenarios "damage pool", "Flat damage and a negative entry"
**REFACTOR**: None
**Files**: `src/domain/v20/combat/damage.ts`, `src/domain/v20/combat/damage.test.ts`, `src/tabs/combat/drawRoll.ts`, `features/steps/combat.steps.ts`
**Commit**: `feat(combat): damage pool`

#### Step 8.8: Unavailable manoeuvres and incapacitation

**Complexity**: standard
**IMPLEMENT**: Requirement checks (Claw needs a named Discipline power; "Weapon required"; "Prerequisite") with a stated reason and the positive case; Incapacitated zeroes attack and damage pools with the reason; state in text, not color
**TEST**: Unit tests for requirement readings (met, unmet, weapon selected); scenarios "cannot use says why", "becomes usable", "incapacitated", "one level below"
**REFACTOR**: Requirement kinds as the union from Slice 5
**Files**: `src/domain/v20/combat/requirements.ts`, `src/domain/v20/combat/requirements.test.ts`, `src/tabs/combat/mount.ts`, `features/steps/combat.steps.ts`
**Commit**: `feat(combat): unavailable manoeuvres and incapacitation`

#### Step 8.9: Reminders and disclaimers

**Complexity**: trivial
**IMPLEMENT**: The reminders card (range and cover, called shots, staking and grappling) and the two disclaimers ("Rulebook reference — not owned equipment"; "Base pools shown without Celerity, blood boosts, armor or situational modifiers") with page references, typed from the book
**TEST**: Scenario "The reminders and disclaimers are shown"
**REFACTOR**: None
**Files**: `src/tabs/combat/Reminders.astro`, `src/tabs/combat/Panel.astro`, `features/steps/combat.steps.ts`
**Commit**: `feat(combat): reminders and disclaimers`

#### Step 8.10: Accessibility and narrow screens

**Complexity**: trivial
**IMPLEMENT**: Fix whatever the shared scans report with a weapon selected and modifiers entered; the segmented control and filter states are scanned
**TEST**: Scenario "accessible and fits a phone"
**REFACTOR**: None
**Files**: `src/tabs/combat/combat.css`, `features/steps/combat.steps.ts`
**Commit**: `test(combat): accessibility and 320px`

## Build Progress

This section is the machine-parseable recovery handle.

### Slices (grouped by wave)

#### Wave 2
- [ ] Slice 6: Disciplines tab
  - [ ] Step 6.1: The Discipline view model
  - [ ] Step 6.2: The tab, list and empty state
  - [ ] Step 6.3: Power panels
  - [ ] Step 6.4: Search and Owned / All
  - [ ] Step 6.5: Build pool
  - [ ] Step 6.6: Accessibility and narrow screens
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
