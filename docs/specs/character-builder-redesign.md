# Spec: Character Builder Redesign

<!-- spec-version: 12.5.0 -->

Design source: Figma file `TAvjmr6RE0rHV8kz56Ffs0`, page `52:117` "Character Builder" — sixteen
frames: Character concept `53:26752`, Clan `53:26935`, Nature & Demeanor `53:27161`,
Attributes `53:27447`, Abilities `53:27753`, Advantages `53:28343`, Finishing touches
`53:28733`, Review & resolve `53:29048`, Finished character sheet `53:29294`, and the
Finishing-touches "Add purchase" states `80:5064`, `80:5425`, `80:5878`, `80:6269`,
`83:7961`, `83:8373`, `83:8786`
(<https://www.figma.com/design/TAvjmr6RE0rHV8kz56Ffs0/Vampire-the-Masquerade-20th-Anniversary-Edition-Character-Sheet?node-id=52-117>).

Builds on `docs/specs/character-builder.md` (the "base spec"). Its `AC-n` numbers are
cited as `base AC-n`; this spec's are `RD-n`. Where this spec amends a base criterion it
says so; every base criterion not named here keeps holding.

## Intent Description

The builder stops being a plain form per step and becomes the guided, story-first flow of
the Figma board: a persistent shell (top bar with autosave status, identity bar, a phase
sidebar with per-screen progress, a live "Your character" summary), one framed screen per
decision — Character concept, Clan, Nature & Demeanor, Attributes, Abilities,
Advantages, Finishing touches — followed by a **Review & resolve** screen that lists
what is still outstanding with a way to fix each item, and a closing **Character sheet**
summary shown when the build is finished. Freebie points are spent through an **Add
purchase** dialog that previews the rating change, cost and remaining points, and are
audited in a ledger with per-row undo.

It is a redesign of the shipped builder plus the screens the frames show that it lacks
(separate Clan and Nature & Demeanor screens, Review & resolve, the Add-purchase dialog,
the closing summary). The V20 creation rules, the creation settings, the build model and
the finished-character conversion are the base spec's and do not change, except in three
places the human decided: Starting Blood Pool becomes a required, explicitly recorded
value; the creation settings move into a dialog opened from the top bar; and the
closing summary is added in front of the existing "open the sheet" step.

Out of scope (unchanged from the base spec, plus what the frames show but this spec
does not build): Merits and Flaws, Paths of Enlightenment, bloodlines, thin-blooded
generations, "four Disciplines in lieu of Backgrounds", write-in Abilities, experience
points, re-opening a finished character in the builder, other game lines; **Export
character sheet**, **Edit character**, and the summary's Merits & Flaws / Inventory /
History tabs; photographs and sourcebook prose.

## Architecture Specification

**Stack.** Unchanged: Astro static + vanilla TypeScript, no UI framework, no new runtime
dependency. Fonts and colour tokens are the ones the sheet and roster redesigns already
load (Cormorant Garamond display, Inter body, `global.css` tokens); new tokens are added
there, not inline. Vitest for unit tests, playwright-bdd for end-to-end behavior.

**Terms.** *Screen* — one framed view in the builder (nine in all, below). *Phase* — the
sidebar grouping of screens (01 Character concept: concept, clan, nature & demeanor;
02 Attributes; 03 Abilities; 04 Advantages; 05 Finishing touches: finishing touches,
review & resolve, character sheet). *Pool* — one allotment of creation dots (a ranked
Attribute or Ability group, Disciplines, Backgrounds, Virtues). *Outstanding item* — a
reason a build cannot be finished yet (RD-24). *Ledger* — the list of freebie purchases,
one row per trait that holds freebie dots, derived from the build's per-trait freebie
dots. *Summary* — the closing screen.

**Screens and routes.** Still one page, `/build/?id=<build-id>`. The visible screen is
part of the URL hash, pushed on each change, so a reload returns to it and the browser
Back button steps back through screens; an unknown or not-yet-available screen (including
Character sheet before finish) falls back to the first. The nine screens are
Character concept, Clan, Nature & Demeanor, Attributes, Abilities, Advantages, Finishing
touches, Review & resolve, Character sheet. The creation settings are a dialog, not a
screen.

**Components.**

| Component | Responsibility | Constraint |
| --- | --- | --- |
| Creation rules (`src/domain/v20/creation/`) | Everything the base spec lists, plus the new pure reads the redesign needs: screen completeness and the Continue-gate reason per screen, the outstanding-item list (with target screen), the ledger rows and the "what would this purchase do" preview (current → after, cost, remaining, or a refusal reason), the Nature/Demeanor and sample-concept name lists, the finished character's Concept text | Pure TypeScript, no DOM/storage/Astro. All rule decisions here; page scripts only render what these return |
| Build model change | `bloodPool` becomes `number \| null` (`null` = not recorded); `concept` gains two free-text values (`conceptKind`, `drive`) | **Additive and non-migrating**: a record without `concept.conceptKind` is a legacy record — only then does a `bloodPool` of 0 read as `null` (a non-zero value is kept) and missing concept values read as empty; new records always write both, so a recorded 0 survives reload; `schemaVersion` stays 1. A new-shape record with a malformed new field is unreadable (never auto-deleted). Builds remain transient |
| Build store (`src/storage/buildStore.ts`) | Validation accepts both shapes above | Key prefix and character records untouched |
| Builder page (`src/pages/build.astro`, `src/components/builder/`, `src/scripts/builder/`, `src/styles/builder.css`) | Shell, nine screens, settings dialog, Add-purchase dialog, finish dialog, summary | Reworked in place. Reuses rating controls. No rules logic |
| Roster, sheet | Unchanged | The roster's "Build a character" and in-progress list keep working against the new shape |

Dependency direction unchanged: pages → controls/stores → model.

**Finish and the summary.** Finishing runs the base flow (create character through the
character store, then remove the build; on a failed save keep the build and show "not
saved"). The Summary is rendered **once, in the same page load, from the build as it was
at the moment of finishing** (so it can show creation provenance such as "includes 1
freebie dot"); it is not stored. Reloading its URL finds no build and shows the base
spec's "Build not found — it may have been finished" message, with a link to the roster.

**Copy.** Only game-mechanical names and numbers are encoded (base spec), plus page
references (e.g. "p. 80") and short **original** descriptive lines written for this
project (≤ 12 words each) where a frame has a description slot for clans, Disciplines,
Backgrounds and sample concepts. No sourcebook prose is copied or closely paraphrased;
the frames' clan blurbs, archetype one-liners and personalised narrative are not used.
No gendered pronouns are generated: summary lines use the character's name or neutral
phrasing.

**Quality bars.** WCAG 2.1 AA, 375 px usability, as for the other pages. Frames are
1512 px desktop only; the narrow layout is specified in RD-27.

## Acceptance Criteria

### Shell and navigation

- **RD-1** Every screen shows: a top bar (product mark, "<Chronicle> / Character builder"
  or "Character builder" when no chronicle is set, an autosave status, a Creation
  settings button); an identity bar (initials avatar, character name or "Unnamed
  character", a subtitle of clan · concept · chronicle for whichever are set, a
  "Nature / Demeanor" readout — "Still to choose" until at least one is chosen — and a
  **Save & exit** button); a phase sidebar; a "N of 9 screens" counter; and a "Your
  character" panel summarising concept, clan, nature/demeanor, Attributes, Abilities,
  Advantages, the freebie points remaining (base AC-24), and, from Finishing touches on,
  Humanity and Willpower dots, as they currently stand, each row showing a plain "Not allocated"/"Not chosen" state until set.
- **RD-2** The sidebar lists the five phases and nine screens. Every screen except
  Character sheet can be opened at any time and in any order (base AC-25). Each screen
  shows its state in text and icon, not colour alone: current, done, or to do, derived
  from the build alone (no "visited" state): Character concept — a name is entered; Clan —
  a clan is chosen; Nature & Demeanor — at least one is chosen, otherwise "Optional";
  Attributes, Abilities, Advantages — every pool placed and none overspent; Finishing
  touches — Blood Pool recorded; Review & resolve — nothing outstanding. Character sheet is not navigable and says it is
  available after Finish.
- **RD-3** Each screen has Back and a Continue button named for the next screen
  ("Continue to Clan"). On the first screen Back reads "All drafts" and goes to the
  roster. While the current screen's gate fails — Clan: no clan chosen; Attributes,
  Abilities, Advantages: a pool not fully placed — Continue is disabled (`aria-disabled`,
  not removed from the tab order) and a visible line, tied to the button with `aria-describedby`, says why ("1 Physical dot
  remains · Allocate it to continue"; several pools aggregate into one line; an unranked
  group, an overspent group and a missing clan on Advantages each have their own wording,
  the last with a "Go to Clan" button). Activating a disabled Continue does nothing except
  announce the reason. The gate never blocks the sidebar. Concept,
  Nature & Demeanor, Finishing touches and Review & resolve are not gated; Nature and
  Demeanor remain optional (base AC-10).
- **RD-4** The autosave status reads "Saved just now" (or the relative time) after each
  successful save and "Changes not saved" with the failure visible when a write is
  refused, with what to do about it; the builder stays usable (base AC-2, AC-4). A successful
  save is not announced to assistive technology; a failure is announced as an alert. **Save & exit** and **All drafts**
  go to the roster; nothing is lost either way.
- **RD-5** The Creation settings button opens a modal dialog with base generation
  (4th–13th, default 13th) and extra freebie points (0–999, default 0), live-showing the
  resulting freebie pool and, with Generation dots, the effective generation. Invalid input
  and refused changes (base AC-5, AC-9) are explained inside the dialog, naming what to
  lower. The dialog closes with Escape, its close button or Done; focus returns to the
  button that opened it.

### Phase 01 — concept, clan, nature & demeanor

- **RD-6** Character concept screen: a hero banner (CSS only, no photograph) with a short
  prompt; Character name; "Concept in your own words"; "What keeps you going?"
  (multi-line); a details card with Player, Chronicle and Sire (base AC-10); and a Sample
  concepts group of toggle chips — Criminal, Drifter, Entertainer, Intellectual,
  Investigator, Kid, Outsider, Politician, Professional, Reporter, Scenester, Socialite,
  Soldier, Worker — one selectable, selection shown with a check and text, with the
  chip's short original description beneath. Chips are prompts, not restrictions;
  deselecting is possible. Every edit autosaves and updates the identity bar and "Your
  character" panel immediately.
- **RD-7** Clan screen: a search box filtering the 14 clans (base AC-11) by name as the
  player types, with "All Clans · 14" and "Selected · 0/1" counts; one row per clan with
  name and a short original line; selecting a row marks it Selected (check + text). A
  detail panel shows the chosen clan's name, its three Disciplines from base AC-16 (or
  "Any Discipline" for Caitiff), and the note that only Nosferatu's Appearance rule
  changes creation arithmetic. A "Not sure yet?" note explains that Caitiff is a clan
  choice distinct from leaving it unchosen. Changing clan applies base AC-16's clearing
  rule and announces which Discipline dots were removed. Ctrl/⌘+K focuses the search.
- **RD-8** Nature & Demeanor screen: two summary cards (Nature, Demeanor) each showing
  the chosen archetype or "Not chosen"; a role toggle ("Assign as Nature" / "Assign as
  Demeanor"); a searchable catalogue of the sourcebook's Archetype names with a count;
  choosing a name assigns it to the active role, shows N/D marks on it, and the same
  name may be assigned to both. A "write your own" field keeps free text possible (base
  AC-10). The shell's Nature / Demeanor readout updates immediately. No archetype
  description text is shown.

### Phases 02 and 03 — Attributes and Abilities

- **RD-9** Attributes screen: an intro card explaining the automatic first dot; three
  group cards (Physical, Social, Mental), each with a Priority select (Primary · 7 /
  Secondary · 5 / Tertiary · 3 additional dots; every rank is always offered, and choosing
  one another group holds **swaps** the two groups' ranks, announced — "Priority order is
  unique" shown while true; placed dots are kept, so a group may become "Overspent by N",
  per base AC-12), a pool meter reading
  "N remaining" and "x / y spent · Complete" or "· Allocation needed", and one row per
  Attribute with minus, dots, numeric value, plus. Dots shown include the automatic dot.
  Rules are base AC-12–14, including the Nosferatu Appearance lock, which is shown on the
  row as fixed with the reason. A group that is not fully placed raises a callout naming
  the group, how many dots remain and which traits can take them. A "What the choices
  say" card states, in neutral factual lines, which category is strongest and which
  tertiary.
- **RD-10** Abilities screen: same pattern for Talents, Skills, Knowledges (13 / 9 / 5),
  thirty named Abilities starting at 0, base AC-15's cap of 3 shown as "All ratings 0–3"
  and as disabled plus controls at 3, an intro card explaining the cap, and the same
  incomplete-group callout.
- **RD-11** In both screens, remaining-dot values and Complete/Allocation-needed changes
  are announced to assistive technology (base AC-24). The meter and the pool count are
  perceivable without colour.

### Phase 04 — Advantages

- **RD-12** Advantages screen has three cards. **Disciplines**: the clan's three
  Disciplines as rating rows (a Caitiff or an unchosen clan sees the base AC-16 behaviour
  and message), 3-dot pool meter. **Backgrounds**: 5-dot pool meter, a search over the 14
  Backgrounds and a chip per Background (selected ones checked, "(Sabbat)" shown on
  Black Hand Membership and Rituals as a display label only), at most six rows (base
  AC-19), Generation limited per base AC-7. **Virtues**: three rows with a 7-dot pool
  meter, an incomplete callout, and a line stating Humanity and Willpower are derived
  from them (base AC-20). Selecting a Background chip adds its row; removing a row at 0
  dots removes it from the selection.

### Phase 05 — Finishing touches, review, summary

- **RD-13** Finishing touches shows Humanity and Willpower cards (rating dots and the
  derivation — "Conscience 3 + Self-Control 4", "Courage 3 + 1 freebie dot" — with a
  Derived / "Base 3, adjusted +1" tag; base AC-20), and a **Blood Pool** card with a
  numeric field that starts empty reading "Not recorded". **Amends base AC-23**: there is
  no default; the value must be entered, a whole number from 0 to the effective
  generation's blood pool maximum; until then the card carries a "Required" tag. The field is labelled, shows the range as a
  persistent hint, commits on blur or Enter, keeps what was typed beside a refusal that
  states the range, and a blank entry returns it to "Not recorded".
- **RD-14** Freebie points section: a pool meter ("N remaining", "x / y spent"), the
  Purchases table (columns Trait, Rating `from → to`, Cost, Undo; row subtitle the
  trait's kind), a total line ("Total: 5 + 2 + 7 + 1 = 15 points"), and a "Cost per dot"
  card listing base AC-21's costs. One ledger row per trait holding freebie dots; its
  Undo removes all of that trait's freebie dots and refunds their cost (base AC-22).
  Freebie spending happens only through this section; earlier screens place creation
  dots only.
- **RD-15** **Add purchase** opens a modal dialog, disabled with an explanation ("All 15
  freebie points are spent. Undo a change to refund points") at 0 remaining. The dialog
  shows points available, a Trait category select (Attribute, Ability, Discipline,
  Background, Virtue, Humanity, Willpower) and a dependent Trait select (Disciplines:
  the catalogue plus a write-in, base AC-21; a Nosferatu's Appearance and traits already
  at their maximum are not offered). Once a trait is chosen it shows Current → After as
  dots and numbers, a Dots-to-add stepper starting at 1, the cost (`dots × cost =
  points`) and Remaining pool before → after. Raising the stepper past the trait's
  maximum or the available points is refused inline with the reason ("Maximum rating
  reached · Resources is limited to 5"), keeping the largest allowed value; **Confirm
  purchase** is disabled until a trait is chosen and enabled only for a legal purchase,
  and adds the dots as one ledger change. Cancel, the close button and Escape discard.
  Focus is trapped while open and returns to Add purchase afterwards.
- **RD-16** Merits and Flaws are not built. A card in Finishing touches says so and that
  flaw points can be added as extra freebie points, with a button that opens the
  Creation settings dialog (RD-5).
- **RD-17** Review & resolve opens with three tiles — Creation pools ("All allocated"
  or "N unplaced"), Freebie points ("x / y spent"), To resolve ("N items to resolve" / "Nothing to resolve") — a
  **Resolve before finishing** list, and a five-phase audit. Each outstanding item
  (RD-24) shows what is missing and a button that goes to the screen that fixes it. The
  audit has one row per phase with a done mark, a one-line recap of its choices and
  numbers (e.g. "Social 7 / 7 · Mental 5 / 5 · Physical 3 / 3"), a subline of provenance
  facts (automatic dots, freebie-bought dots) and an **Edit** button for that phase. A
  card states what finishing will deliver.
- **RD-24** The outstanding items are exactly: no clan chosen; every creation dot not
  placed (per pool, with counts); Blood Pool not recorded; a Blood Pool or trait above a
  maximum after a settings change (base AC-9). They are produced by one pure function
  shared with the Finish button, and the Finish button is labelled "Finish character · N
  item(s) left" and disabled while any exist. **Amends base AC-26** to add Blood Pool
  not recorded; unspent freebie points still do not block (see RD-18).
- **RD-18** Enabling Finish and activating it follows base AC-26/AC-27: with freebie
  points unspent the finish dialog asks for confirmation stating how many; the created
  character is as base AC-27 with these differences — the sheet's Concept is
  `"<sample concept> · <concept text>"` (whichever parts are set, joined with " · "),
  the character's `notes` holds "What keeps you going?", and the blood pool is the
  recorded value. A failed save keeps the build and shows "not saved".
- **RD-19** Summary (Character sheet) is shown right after a successful finish (see
  Architecture): the headline "<Name>. A story begins." ("Unnamed character" when unnamed);
  a banner "Five phases complete · No creation issues remaining"; a
  Character dossier (Player, Chronicle, Concept, Clan, Sire, Nature, Demeanor,
  Generation as the effective generation — never "not recorded"); Attributes; Abilities;
  Disciplines, Backgrounds and Virtues with Humanity and Willpower, each noting which
  ratings include freebie dots; "Blood & condition" with the Starting Blood Pool and
  Blood per Turn; a creation record line (pool totals and the freebie purchases). The
  primary button is **Open character sheet**, which opens the saved character in the
  existing sheet; a secondary link returns to the roster. There is no Export button, no
  Edit character button, and no tabs.

### Cross-cutting

- **RD-20** Rules and budgets are unchanged (base AC-6–9, 12–22, 25) and enforced in the
  creation rules, not the page. Every refusal the base spec defines still refuses, with
  its message visible on the new screens.
- **RD-21** A build saved before this change opens, renders, and can be finished; its
  Blood Pool appears as "Not recorded". New builds round-trip through reload (base AC-2)
  including screen, concept kind, drive, and Blood Pool.
- **RD-22** Existing roster behaviour (Build a character, in-progress list, continue,
  delete with confirmation) and the "New character" blank-sheet flow are unchanged.
- **RD-23** The visual language follows the frames: dark surfaces, display-serif
  headings, uppercase phase eyebrows ("PHASE 02 / SELECT ATTRIBUTES"), a primary red
  Continue/Confirm button, bordered cards, ring-style dots. The existing contrast and
  class-name tests continue to pass with the new styles.
- **RD-25** Every control is keyboard-operable with a unique accessible name and exposed
  value; each screen has one `h1` (the display headline) and a logical heading order;
  focus moves to the screen heading after navigating between screens; dialogs are native
  modal dialogs with labelled titles; disabled Continue and Add purchase explain
  themselves in text; refusals and outstanding items are perceivable without colour.
  Automated accessibility checks report no WCAG 2.1 AA violations on any screen or
  dialog.
- **RD-26** Search fields, chips and pickers (clan, archetype, Background) are labelled
  inputs; the "⌘K" hint is shown as Ctrl K off macOS; result counts are announced.
- **RD-27** At 375 px: no horizontal page scroll; the sidebar collapses into a "Screen N
  of 9" menu button that opens the screen list; the "Your character" panel moves below the screen content; reflow also holds at
  320 px; the three-column pool cards stack; dialogs fit
  the viewport with a scrollable body; Back and Continue stay reachable.
- **RD-28** New pure behaviour has unit tests: the Continue-gate reason per screen, the
  outstanding-item list, ledger derivation and undo refunds, the purchase preview and
  its refusals (over points, over maximum, unavailable trait), the concept text
  composition, the legacy-build read of `bloodPool`. End-to-end scenarios cover: each
  screen's heading and key control, Continue gating and free sidebar navigation, clan
  change announcement, archetype assignment, Add purchase (single dot, multi-dot,
  refused over-maximum, refused over-points, undo), Blood Pool required → Finish blocked
  → recorded → Finish, unspent-freebie confirmation, Summary → Open character sheet, a
  pre-change build opening, and reload resuming the same screen. The existing builder
  feature files and steps are updated, not left stale. `astro build`, the type check,
  `oxlint` and both test suites pass.

## Plan-review amendments

Made after the spec was approved, during `/plan` review (five critics), to remove
contradictions and gaps. Each edits the numbered criterion above; this table is the audit
trail.

| Criterion | Amendment | Why |
| --- | --- | --- |
| Architecture / RD-21 | Legacy record detected by missing `concept.conceptKind`, not by the value 0 | "0 reads as not recorded" made a recorded 0 unreadable after reload |
| RD-2 | Status derived from the build alone; "done once visited" removed | No place to store "visited" without another record field |
| RD-3 | Reason copy, aggregation, go-to button, inert activation | A gate could name something the player could not act on |
| RD-4 | Success silent, failure alert with next step | Avoid announcing every save; make failure actionable |
| RD-9 | Priority select swaps ranks; overspent state | "Not offered twice" made re-ranking impossible |
| RD-13 | Tag "Required"; blank clears; visible range hint | "Needs review" understated a blocking requirement |
| RD-17 | Tile wording "items to resolve" | One word for one count |
| RD-19 | Headline "<Name>. A story begins." | Present in the frame, absent from the criterion |
| RD-27 | 320 px reflow; "Chronicle notes" removed | WCAG 1.4.10; the phrase referred to nothing defined |
| Architecture | Screen in the hash via `pushState` | Browser Back should step through screens |
| RD-1 | "Your character" panel gains a freebie-points-remaining row | The old always-visible freebie bar is removed; base AC-24 still has to hold |
| RD-4 | Failure alert offers "Try saving again" | The player had no way to retry without a dummy edit |
| RD-19 | After Finish, other sidebar items are inert, Back never reaches a build screen, "Saved to your roster" line | A finished build no longer exists to edit |
| RD-5 | Dialog says changes apply immediately; Escape keeps them | Done/Escape semantics were unclear |

## Ambiguity Log

| Decision | Classification | Resolved By | Rationale / Answer |
| --- | --- | --- | --- |
| Scope relative to shipped builder | `requires-stakeholder-input` | human (approach screen) | Visual redesign of existing steps plus only the new screens the frames show |
| Replace vs merge | `requires-stakeholder-input` | human (approach screen) | Edit in place; no storage migration |
| Figma vs rules/spec on conflicts | `requires-stakeholder-input` | human (approach screen) | V20 rules and base spec win on numbers/limits; frames drive layout and UX. Exceptions are the three decisions below |
| Where creation settings live (no frame has them) | `requires-stakeholder-input` | human | Dialog from the top-bar settings button; not a screen (RD-5) |
| Blood Pool: required vs default 0 | `requires-stakeholder-input` | human | Required, no default, blocks Finish until recorded — amends base AC-23/AC-26 (RD-13, RD-24) |
| Final "Character sheet" screen | `requires-stakeholder-input` | human | Summary then Open character sheet; no Export, no Edit character, no tabs (RD-19) |
| Descriptive copy vs "no prose" | `requires-stakeholder-input` | human | Names and numbers, page refs, plus original ≤ 12-word lines; clan blurbs, archetype one-liners and personalised narrative dropped |
| Summary rendered from the in-memory build at finish, not stored | `inferable` | inference | The frame shows provenance ("includes 1 freebie dot") that a saved character does not record; storing it would change the character shape, which base AC-27/28 keeps unchanged. A reload lands on the existing "build not found / finished" message |
| "What keeps you going?" has no sheet field | `inferable` | inference | The character shape already has a free-text `notes`; writing it there loses nothing and changes no shape (RD-18) |
| Sample concept + free text → one Concept field | `inferable` | inference | The frames' dossier shows "Intellectual · Antiquarian"; the sheet stores one string |
| Player, Chronicle, Sire absent from the concept frame | `inferable` | inference | Base AC-10 requires them and the frames' header/summary display them; a details card on the concept screen keeps them editable |
| Continue disabled by gate but sidebar free | `inferable` | inference | Frames show Continue disabled until a pool is placed; base AC-25 forbids forced order. Gate only the choices base AC-26 already treats as outstanding |
| Nature and Demeanor not gated | `inferable` | inference | Base AC-10 makes them optional; Finish is not blocked on them |
| Free-text archetype kept beside the 42-name catalogue | `inferable` | inference | Base AC-10: free text with suggestions; the frame shows only picking |
| Same archetype for Nature and Demeanor allowed | `inferable` | inference | Nothing in creation prohibits it; the sheet stores two strings |
| Clan detail shows the clan's Disciplines instead of a blurb | `inferable` | inference | Replaces prose with rules data already encoded (base AC-16) and answers the user's real question when choosing |
| Freebie purchases only through Add purchase | `inferable` | inference | Frames show earlier screens with creation pools only and all freebie spending in the ledger; base AC-21/22 behaviour is unchanged |
| Ledger is a derived view, one row per trait; undo clears the trait's freebie dots | `inferable` | inference | Build records per-trait freebie dots, not a purchase history; deriving avoids a model change and matches the frame's "undo refunds all 3 points" |
| Generation shown as effective generation in summary (frame says "Not recorded") | `inferable` | inference | Base AC-7/27 derive it; showing "not recorded" would contradict the character written |
| Merits and Flaws panel replaced by a note pointing to extra freebie points | `inferable` | inference | Out of scope (base); flaw points are already represented by extra freebies (base Intent) |
| Experience row, health track and Merits/Inventory/History tabs dropped from summary | `inferable` | inference | Nothing creation-time to show; sheet owns them |
| Clan weakness text from frame ("not specified on these pages") reworded | `inferable` | inference | Base AC-14 does enforce Nosferatu Appearance; the frame text would be false for it |
| Legacy build (no `conceptKind`) with `bloodPool` 0 reads as not recorded | `inferable` | inference | 0 was the untouched default of old records; new records carry `conceptKind`, so a recorded 0 survives reload (amended after plan review) |
| Hero photograph not used | `inferable` | inference | Frame uses a raster of unknown provenance and weight; a CSS banner keeps the look with no asset licence question. Flagged for the human at the spec gate |
| "(Sabbat)" labels on two Backgrounds are display-only | `inferable` | inference | Stored Background names stay the base spec's, so conversion and the sheet are unchanged |
| Ctrl/⌘+K search focus | `inferable` | inference | The frames show a ⌘K hint; Ctrl K is the platform equivalent elsewhere |
| 375 px layout | `inferable` | inference | Frames are desktop only; collapsing the sidebar and stacking cards is the conventional reading and base AC-29 demands narrow usability |
| Narrative callouts use name/neutral phrasing | `inferable` | inference | The builder collects no pronouns; frame copy using "she" would misgender |
| Export character sheet | `requires-stakeholder-input` | human | Out of scope (resolved with the final-screen decision) |
| Tests asserting static copy and decorative markup | `LOW_VALUE` | skipped | No branching or observable outcome beyond text presence; screen-heading checks in RD-28 already cover that the screen rendered |

## Consistency Gate
- [x] Intent is unambiguous
- [x] Every behavior/goal maps to an acceptance criterion
- [x] Architecture constrains without over-engineering
- [x] Terminology consistent across artifacts
- [x] No contradictions between artifacts
- [x] Every gap/ambiguity finding is logged — inferable with rationale or resolved by human
