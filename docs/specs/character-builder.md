# Spec: Character Builder

<!-- spec-version: 12.5.0 -->

## Intent Description

Players can build a Vampire: The Masquerade 20th Anniversary Edition (V20) character
step by step with the creation rules applied for them, instead of filling a blank
sheet and doing the point arithmetic by hand. The builder follows the sourcebook's
five creation steps (concept, Attributes, Abilities, Advantages, finishing touches),
shows how many dots or freebie points remain at every moment, and refuses to
overspend.

Storytellers often start characters stronger than the book's default. The builder
therefore opens with two **creation settings** chosen before anything else — the
**base generation** (13th by default, any of 4th–13th) and a number of **extra freebie
points** added to the standard 15 (for example "11th generation, 75 extra freebies").
Every budget and trait maximum the builder enforces is derived from those settings.

A finished build becomes an ordinary V20 character that opens in the existing sheet.
The sheet itself is unchanged: it stays a free-form record that enforces nothing, and
the existing "New character" blank-sheet flow stays as it is.

Out of scope: Merits and Flaws (flaw points are represented by extra freebie points),
Paths of Enlightenment (Humanity only), bloodlines and thin-blooded 14th–15th
generation, the optional "four Disciplines in lieu of Backgrounds" rule, write-in
Abilities, experience-point spending, pages 2–4 of the sheet, re-opening a finished
character in the builder, and other game lines (Mage).

## Architecture Specification

**Stack.** Unchanged: Astro static output + vanilla TypeScript, no UI framework, no new
runtime dependency. Vitest for unit tests, playwright-bdd for end-to-end behavior.

**Terms.** A **build** is an in-progress builder record. **Creation settings** are its
base generation and extra freebie points. **Creation dots** are the fixed allotments
(7/5/3, 13/9/5, 3, 5, 7); **freebie points** are the 15 + extra spent afterwards.
**Effective generation** is the base generation improved by one step per dot of the
Generation background.

**Components.**

| Component | Responsibility | Constraint |
| --- | --- | --- |
| Creation rules (`src/domain/v20/`) | Rules data (clans and their three Disciplines, generation table, freebie costs, creation allotments, Discipline and Background catalogues, Archetype names) and the build model: the build type, pure update functions, remaining-budget and trait-maximum calculations, "can this build be finished" check, and conversion of a build to a `V20Character` | Pure TypeScript: no DOM, no storage, no Astro imports. Updates return a new build; an update that would break a rule returns the build unchanged with a reason. All rule decisions live here, none in page scripts |
| Build store (`src/storage/`) | Persist, load, list, and delete builds in `localStorage` | Builds are stored under their own key prefix, separate from characters, so existing character records and `characterStore` behavior are untouched. Depends on the model, never the reverse |
| Builder page (`src/pages/`, `src/scripts/`, `src/components/`) | The step-by-step UI; wires controls → build update → build store save | Reuses the existing rating controls. Holds no rules logic |
| Roster (`src/pages/index.astro`, `src/scripts/roster.ts`) | Gains a "Build a character" action and lists in-progress builds | Existing "New character" behavior and character list are unchanged |

Dependency direction is unchanged: pages → controls / stores → model.

**Routes.** `/build/?id=<build-id>` is the builder for one build. The exact path may be
refined in `/plan` provided a build URL is bookmarkable.

**Output.** Finishing writes a `V20Character` in the existing shape (`schemaVersion` 1,
no schema change) through the existing character store, then removes the build.

**Rules content.** Only game-mechanical names and numbers are encoded (trait, clan,
Discipline, Background and Archetype names; allotments; costs; the generation table).
No sourcebook prose, descriptions, or artwork is copied. The sourcebook PDFs stay
untracked.

**Quality bars.** WCAG 2.1 AA and 375 px-wide usability, as for the existing pages.

## Acceptance Criteria

### Entry and build lifecycle

- **AC-1** The roster has a "Build a character" action next to "New character". It
  creates a new build with default creation settings and opens it in the builder.
  "New character" still creates a blank character and opens the sheet, unchanged.
- **AC-2** Every change in the builder is saved automatically. Reloading the builder
  URL restores every setting, choice, and allocation exactly as last entered.
- **AC-3** The roster lists in-progress builds separately from characters, each
  marked as in progress with its name (or a placeholder) and clan, a link to continue
  it, and a delete action that asks for confirmation. Builds never appear as
  characters, and characters are unaffected by build operations.
- **AC-4** A builder URL whose id matches no build shows a "build not found" message
  with a link to the roster and creates nothing. An unreadable build record does not
  crash the roster or hide other entries, and is not auto-deleted. A refused write
  shows a visible "changes not saved" message and leaves the builder usable.

### Creation settings

- **AC-5** The builder starts with a settings step offering base generation (4th–13th,
  default 13th) and extra freebie points (whole number 0–999, default 0). Other input
  is rejected.
- **AC-6** The freebie budget is 15 + extra freebie points.
- **AC-7** Effective generation = base generation improved by one generation per dot
  of the Generation background, never better than 4th. Generation background dots
  that would pass 4th cannot be added (base 6th allows at most 2 dots; base 4th, none).
- **AC-8** The effective generation fixes the maximum trait rating, blood pool
  maximum, and blood points per turn:

  | Generation | Max trait | Blood pool max | Blood/turn |
  | --- | --- | --- | --- |
  | 13th | 5 | 10 | 1 |
  | 12th | 5 | 11 | 1 |
  | 11th | 5 | 12 | 1 |
  | 10th | 5 | 13 | 1 |
  | 9th | 5 | 14 | 2 |
  | 8th | 5 | 15 | 3 |
  | 7th | 6 | 20 | 4 |
  | 6th | 7 | 30 | 6 |
  | 5th | 8 | 40 | 8 |
  | 4th | 9 | 50 | 10 |

  The maximum trait rating limits Attributes, Abilities, Disciplines, and Backgrounds
  other than Generation. The Generation background is limited to 5 and by AC-7.
  Virtues are limited to 5; Humanity and Willpower to 10.
- **AC-9** Creation settings can be changed at any time during the build. A change
  (to settings, or removing Generation dots) that would leave a trait above its new
  maximum, or freebie spending above the new budget, is refused with a message naming
  what must be lowered first.

### Step one — concept

- **AC-10** Free-text fields Name, Player, Chronicle, Concept, and Sire. Nature and
  Demeanor are free text with the sourcebook's Archetype names offered as suggestions.
- **AC-11** Clan is chosen from: Assamite, Brujah, Follower of Set, Gangrel, Giovanni,
  Lasombra, Malkavian, Nosferatu, Ravnos, Toreador, Tremere, Tzimisce, Ventrue, Caitiff.

### Step two — Attributes

- **AC-12** The player ranks Physical, Social, and Mental as primary, secondary, and
  tertiary (each rank used once), giving 7, 5, and 3 dots. Every Attribute starts with
  one free dot. Changing the ranking keeps allocations that still fit and otherwise
  reports the group as overspent until the player lowers it.
- **AC-13** A group's creation dots cannot exceed its allotment, and no Attribute can
  exceed the maximum trait rating.
- **AC-14** For a Nosferatu, Appearance is fixed at 0 and accepts neither creation
  dots nor freebie points; the Social allotment is spent on Charisma and Manipulation.

### Step three — Abilities

- **AC-15** The player ranks Talents, Skills, and Knowledges for 13, 9, and 5 dots over
  the thirty named Abilities, which start at 0. No Ability can be raised above 3 with
  creation dots.

### Step four — Advantages

- **AC-16** Disciplines: 3 creation dots, spendable only on the chosen clan's three
  Disciplines; a Caitiff may spend them on any Discipline:

  | Clan | Disciplines |
  | --- | --- |
  | Assamite | Celerity, Obfuscate, Quietus |
  | Brujah | Celerity, Potence, Presence |
  | Follower of Set | Obfuscate, Presence, Serpentis |
  | Gangrel | Animalism, Fortitude, Protean |
  | Giovanni | Dominate, Necromancy, Potence |
  | Lasombra | Dominate, Obtenebration, Potence |
  | Malkavian | Auspex, Dementation, Obfuscate |
  | Nosferatu | Animalism, Obfuscate, Potence |
  | Ravnos | Animalism, Chimerstry, Fortitude |
  | Toreador | Auspex, Celerity, Presence |
  | Tremere | Auspex, Dominate, Thaumaturgy |
  | Tzimisce | Animalism, Auspex, Vicissitude |
  | Ventrue | Dominate, Fortitude, Presence |

  Disciplines cannot be allocated until a clan is chosen. Changing clan removes
  creation dots on Disciplines the new clan lacks and tells the player it did so.
- **AC-17** Backgrounds: 5 creation dots over the sourcebook's Background list
  (Allies, Alternate Identity, Black Hand Membership, Contacts, Domain, Fame,
  Generation, Herd, Influence, Mentor, Resources, Retainers, Rituals, Status).
- **AC-18** Virtues: Conscience, Self-Control, and Courage each start with one free
  dot; 7 creation dots are distributed among them.
- **AC-19** A build holds at most six Disciplines and six Backgrounds, matching the
  sheet's rows.

### Step five — finishing touches

- **AC-20** Starting Humanity = Conscience + Self-Control and starting Willpower =
  Courage, taken from the Virtues as rated with creation dots. Both are shown and
  update when those Virtues change; Virtue dots bought with freebie points do not
  change them.
- **AC-21** Freebie points buy additional dots at: Attribute 5, Ability 2,
  Discipline 7, Background 1, Virtue 2, Humanity 2, Willpower 1. Freebie-bought
  Abilities may exceed 3, and freebie-bought Disciplines may be any Discipline from
  the catalogue (every Discipline in AC-16) or a write-in name, regardless of clan.
- **AC-22** A purchase that costs more than the remaining freebie points, or that
  would exceed a maximum in AC-8, is refused. Removing a freebie-bought dot refunds
  its cost. Freebie points cannot remove creation dots or free dots.
- **AC-23** Starting blood pool is a number the player enters, 0 up to the effective
  generation's blood pool maximum, default 0. The builder does not roll dice.

### Budgets and finishing

- **AC-24** Every step shows the dots remaining for each allotment in it, and the
  freebie points remaining are visible on every step after settings. Remaining values
  are announced to assistive technology when they change.
- **AC-25** Steps can be visited in any order and revisited; the player is not forced
  to complete one before opening another.
- **AC-26** Finishing is blocked, with a list of what is outstanding and where, until
  a clan is chosen and every creation dot (7/5/3, 13/9/5, 3, 5, 7) is placed. Unspent
  freebie points do not block: the builder asks for confirmation stating how many are
  unspent.
- **AC-27** Finishing creates a V20 character and opens it in the sheet, with: the
  header fields from step one; Generation as the effective generation (e.g. "9th");
  all Attributes, Abilities, and Virtues at their final ratings; Disciplines and
  Backgrounds as named rows with their ratings (including Generation); path name
  "Humanity" with the final Humanity rating; permanent and temporary Willpower both
  at the final Willpower rating; blood pool at the entered value; and Blood Per Turn
  from AC-8. The build is removed and no longer appears in the roster. If the
  character cannot be saved, the build is kept and a "not saved" message is shown.
- **AC-28** The finished character is an ordinary sheet character: it can be edited
  freely on the sheet with no creation rule applied (existing sheet AC-18 holds).

### Quality thresholds

- **AC-29** Every builder control is reachable and operable by keyboard alone, has a
  unique accessible name, and exposes its value; refusals and outstanding-item
  messages are perceivable without colour; automated accessibility checks report no
  WCAG 2.1 AA violations on the builder and roster; at 375 px width the builder has no
  horizontal page scrolling.
- **AC-30** The creation rules have unit tests covering every allotment, cost,
  maximum, generation row, and refusal path; end-to-end tests cover settings → build
  → finish → sheet, resume after reload, and build deletion. `astro build`, the type
  check, `oxlint`, and both test suites pass.

## Ambiguity Log

All gap and ambiguity findings from the Ambiguity Resolution Protocol, with their classifications and rationale.

| Decision | Classification | Resolved By | Rationale / Answer |
|----------|---------------|-------------|-------------------|
| What the generation override allows | `requires-stakeholder-input` | human (approach screen) | 4th–13th; thin-bloods out of scope |
| Builder vs. existing blank create | `requires-stakeholder-input` | human (approach screen) | Added alongside; blank sheet flow unchanged |
| When overrides apply | `requires-stakeholder-input` | human (approach screen) | Set up front as creation settings ("11th generation, 75 extra freebies"); rules enforced within them |
| Rules coverage | `requires-stakeholder-input` | human (approach screen) | Page-1 traits only; no Merits and Flaws catalogue |
| Up-front generation vs. Generation background | `requires-stakeholder-input` | human | The setting is the base; each Generation background dot lowers it further |
| Starting blood pool | `requires-stakeholder-input` | human | The player enters it; no dice in the app |
| Paths of Enlightenment | `requires-stakeholder-input` | human | Humanity only |
| Finishing with points unspent | `requires-stakeholder-input` | human | Creation dots required; unspent freebies allowed after confirmation |
| Floor for effective generation | `inferable` | inference | The confirmed override range ends at 4th, and the sourcebook table gives no usable values for 3rd |
| Generation background maximum | `inferable` | inference | The sourcebook defines only five levels of this Background, so the raised trait maximum of low generations does not extend it |
| Changing settings mid-build | `inferable` | inference | Settings are ordinary build data; refusing a change that invalidates existing allocations is the only option that never silently discards the player's work |
| Humanity and Willpower ignore freebie-bought Virtue dots | `inferable` | inference | The sourcebook records Humanity and Willpower in step five before freebie points are spent, and prices raising them separately |
| Temporary Willpower equals permanent on finish | `inferable` | inference | A new character starts with a full Willpower pool |
| Blood pool may be left at 0 | `inferable` | inference | The value comes from a table-side roll that may not have happened yet; the sheet can record it later |
| Nosferatu Appearance fixed at 0 | `inferable` | inference | Stated outright in the clan's weakness; it is a creation-time rule affecting dot allocation |
| Other clan weaknesses not enforced; Weakness field left blank | `inferable` | inference | No other clan weakness changes creation arithmetic, and filling the field would copy sourcebook prose |
| Clan list | `inferable` | inference | The thirteen clans plus Caitiff are exactly the list in the sourcebook's creation summary; bloodlines are in a separate chapter |
| Nature and Demeanor as free text with suggestions | `inferable` | inference | No creation rule depends on the Archetype, and the sheet stores free text |
| Discipline write-ins allowed, Background write-ins not | `inferable` | inference | The sourcebook lets freebie points and Caitiff take Disciplines outside any fixed list; its Background list is closed |
| Six Disciplines and six Backgrounds at most | `inferable` | inference | The sheet the build is written to has six rows of each |
| Write-in Abilities excluded | `inferable` | inference | Creation rules address the thirty named Abilities; the sheet's write-in row stays available after finishing |
| Builds autosave and are resumable | `inferable` | inference | Everything else in the app autosaves with no save button (sheet AC-21); a builder that loses work on reload would contradict that |
| Builds stored apart from characters | `inferable` | inference | A build holds data a character record has no place for (rankings, dot provenance, settings); a separate prefix leaves existing saves and validation untouched |
| Storage failure handling for builds | `inferable` | inference | Mirrors sheet AC-22 and AC-23 |
| Free step navigation | `inferable` | inference | Budgets interact across steps (Generation dots change maximums, clan changes Disciplines), so a forced linear order would block legitimate edits |
| Clan change clears now-invalid Discipline dots | `inferable` | inference | Leaving them would break the clan-Discipline rule; telling the player keeps it from being silent |
| "Four Disciplines in lieu of Backgrounds" option | `inferable` | inference | An optional Storyteller-discretion rule that was not requested |
| Finished characters cannot return to the builder | `inferable` | inference | A sheet character does not record which dots came from creation or freebies, so a build cannot be reconstructed |
| Extra freebie upper bound of 999 | `inferable` | inference | Any bound comfortably above the user's example of 75 works; three digits keeps the field and the arithmetic sane |
| Tests asserting static rules tables render | `LOW_VALUE` | skipped | No branching; unit tests on the rules data and e2e flows already exercise every row |

## Consistency Gate
- [x] Intent is unambiguous
- [x] Every behavior/goal maps to an acceptance criterion
- [x] Architecture constrains without over-engineering
- [x] Terminology consistent across artifacts
- [x] No contradictions between artifacts
- [x] Every gap/ambiguity finding is logged — inferable with rationale or resolved by human
