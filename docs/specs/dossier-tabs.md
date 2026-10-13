# Spec: Dossier Tabs

<!-- spec-version: 12.5.0 -->

Design source: Figma file `TAvjmr6RE0rHV8kz56Ffs0`
(<https://www.figma.com/design/TAvjmr6RE0rHV8kz56Ffs0/Vampire-the-Masquerade-20th-Anniversary-Edition-Character-Sheet>).

| Tab | Frame |
| --- | --- |
| Disciplines | `5:3452` "Disciplines and power detail" |
| Backgrounds | `37:2042` "Backgrounds and personal traits" |
| Combat (melee, ranged) | `91:3380` "Combat", `97:196` "Combat — Ranged" |
| Journal | `102:1140` "Journal" |
| Level up | `152:3419` "Level up" |

The existing "Character sheet" tab is frame `5:2725` and is specified in
`docs/specs/sheet-play-view-redesign.md`, which listed these tabs as out of scope.

## Intent Description

The V20 sheet gains five more tabs beside "Character sheet", in the order the Figma
draws them: **Disciplines, Backgrounds, Combat, Journal, Level up**. Together they turn
the sheet from one page into a character dossier: a Discipline power reference with
live dice pools, the character's Backgrounds, Merits, Flaws and Havens, a Combat
reference with attack and damage pools, a session Journal with notes, experience
points and a character record, and a Level up workspace that spends experience on
advancements.

The tabs are independent features that share one foundation (the tab bar, the page
shell, the stored-data conventions and a few reused components), so after that
foundation lands they can be built in parallel, one slice per tab. The tab bar shows
only tabs that have been built; each tab appears the moment its slice ships.

Existing behavior holds throughout. Play mode is the default and edit mode is entered
with "Edit character"; a tab shows the same Identity and (except Level up) the same
live resources as the Character sheet; every change autosaves; stored records written
before this work load unchanged.

Out of scope: virtual dice rolling (pools are computed and shown, players roll physical
dice), character-owned weapons, linked records for @mentions, a light theme, any
network, account or Storyteller feature, and new roster or builder behavior.

## Architecture Specification

**Stack.** Unchanged: Astro static output, vanilla TypeScript, plain CSS, custom
elements, no UI framework, no third-party runtime requests. Dependency direction
unchanged: pages → controls / store → model. The domain stays pure TypeScript with no
DOM.

**Foundation (lands first; everything below depends on it).**

| Piece | Constraint |
| --- | --- |
| Tab bar and tab host | Renders the tabs registered by built slices, in the fixed order above, with "Character sheet" first. The active tab is addressed in the URL (`tab=<key>`, absent means Character sheet) so it survives reload and can be linked. Tabs are real links with `role="tablist"` semantics and arrow-key navigation; the active tab is not conveyed by color alone |
| Tab registration | A slice adds its tab by adding its own folder with a descriptor module (key, label, order, panel, script). The host discovers descriptors by glob, so two slices never edit the same file to register |
| Page shell | Identity, mode toggle, save status and (for tabs that show them) the live resources row are rendered once by the shell and shared. The page script keeps being the only place that applies model updates and saves; each tab script receives the character, the mode and an `apply` function and renders its own panel |
| Stored data | One additive change to `V20Character` declares every new field up front, with blank defaults, so slices never edit the type concurrently. `schemaVersion` stays 1. A record saved without a field reads as that field's blank default. Fields the new tabs do not show (`notes`, `experience`, `weakness`, …) are preserved untouched, as today |
| Reused components | Section heading + count, reference-table, expandable row, tag chips, search field and "Read-only in play · edit character to change" hint are extracted once from the existing sheet and roster styles and used by every tab |
| Shared model helpers | The dice-pool and wound-penalty functions already in `src/domain/v20/resources.ts` are the only pool arithmetic; tabs call them |

**Files per slice.** Each slice owns a disjoint set of files: `src/domain/v20/<tab>/`,
`src/components/<tab>/`, `src/scripts/<tab>/`, `src/styles/<tab>.css`, and its
`features/<tab>/` scenarios and step file. The foundation owns every shared file.

**Data added to the character (all optional on read, blank by default).**

| Field | Shape |
| --- | --- |
| Background details | Per background row: summary line, note, and named people (name + role). Rows stay the existing `backgrounds` array; in edit mode more rows can be added beyond the six blank ones |
| `merits`, `flaws` | `{ name, category (Physical / Mental / Social / Supernatural), points, note }[]` |
| `otherTraits` | `{ name, rating (optional), kind, note }[]` |
| `havens` | `{ name, kind (Primary / Secondary / Other), description, location, access, security }[]` |
| `journal.sessions` | `{ id, title, summary, current }[]`, exactly one current once any exist |
| `journal.notes` | `{ id, sessionId, title, category, tags, pinned, body, createdAt, editedAt }[]`; body is a small Markdown subset (paragraphs, bold, italic, bulleted and numbered lists, checklist items, links, block quote), rendered without raw HTML |
| `journal.xp` | `awards: { id, sessionId, amount, note }[]`, `spendings: { id, sessionId, label, kind, from, to, cost }[]` |
| `journal.record` | `gear[]`, `equipment[]` (each `{ item, detail }`), `bloodBonds[]` (`{ name, relation, rating, type }`), `derangements[]` (`{ name, status, note }`), `goals[]` (`{ text, kind }`), `description` (apparent age, date of birth, R.I.P., hair, eyes, nationality, height/weight, sex) |

**Reference data (static, in the model, no storage).** Combat: the V20 manoeuvres,
melee weapons and ranged weapons of chapter nine, pp. 274–281, with accuracy,
difficulty, damage, type, conceal, and for ranged weapons range, rate, clip and
conceal. Disciplines: for every power in the existing catalogue, activation cost,
duration, prerequisite, dice pool, difficulty / resistance, a one-line summary and the
book page, from V20 chapter four. A power whose System entry has no clean value for a
field shows "See rulebook" for it. Both are extracted from the V20 PDF in
`docs/references/sourcebooks/` (gitignored).

**Derived values (all computed on draw, never stored).**

- *Discipline power state*: Known when the power's level is at most the Discipline's
  rating, otherwise Locked ("Requires <Discipline> N"). A Discipline the character
  holds shows "N levels unlocked".
- *Combat pool*: attribute + ability − wound penalty, never below 0, 0 when
  Incapacitated, with the characters' real ratings; Melee and Brawl fall back as the
  rulebook says (Dexterity + Melee with Melee 0 uses Dexterity alone). Accuracy and
  difficulty come from the manoeuvre or weapon; the user-adjustable "other dice
  modifier", difficulty modifier and net-successes inputs are page state, not stored.
  The damage pool is weapon damage + extra successes; Strength-based damage uses the
  character's Strength.
- *Experience*: Total earned = sum of awards; Total spent = sum of spendings; Available
  = earned − spent; This session = awards of the current session.
- *Experience costs (V20)*: new Ability 3; existing Ability current × 2; Attribute
  current × 4; in-clan Discipline current × 5; out-of-clan Discipline current × 7;
  Virtue current × 2; Humanity / Path current × 2; permanent Willpower current rating.
  In-clan status comes from the clan table the builder already holds
  (`src/domain/v20/creation/rules.ts`); a Clan text that is not one of the thirteen
  clans is treated as Caitiff, for whom every Discipline costs current × 6. Backgrounds
  have no cost and are not offered.

**Behavior per tab.**

*Disciplines.* Left list of the character's Disciplines (name, rating, dots, "N levels
unlocked"); selecting one shows its heading, "Your rating", and its powers in level
order, each a Known or Locked row that expands to the full panel. A search field
filters Disciplines and powers by text; "Owned · N" and "All disciplines" switch
between the character's Disciplines and the full catalogue (all seventeen), where
Disciplines the character lacks show every power Locked. "Build pool" on a power with a
roll selects that power's attribute and ability in the Character sheet's Selected pool
and switches to that tab. Read-only in both modes: Discipline ratings are still edited
on the Character sheet.

*Backgrounds.* A section index (counts) and sections: expanded Backgrounds (cards:
name, dots, summary, note, named people), Havens, Merits (with point total), Flaws (with
point total), Other traits, and the "Character notes, not rule effects" note. Play mode
read-only; edit mode edits and adds/removes entries.

*Combat.* Search field and filter (All manoeuvres / Close combat / Ranged combat),
Melee / Ranged sub-tabs, a manoeuvre table with the character's pool, accuracy,
difficulty and base damage, a weapons table, a **Weapon roll** panel (weapon reference,
manoeuvre, target, range, attack pool + accuracy + difficulty with ± modifier inputs,
and the damage pool) and the Combat reminders card. Weapons are the rulebook's; none
are owned. No dice are rolled: the panel states pools and the player rolls physical
dice. Manoeuvres whose requirements the character fails (for example Claw without the
Discipline power) show "Unavailable" with the reason, and "Weapon required" /
"Prerequisite" tags as drawn. Read-only in both modes except the roll panel's inputs.

*Journal.* Three parts. **Notes**: sidebar (All notes, Pinned, Sessions with counts and
the current one marked, Categories, Tags), a note list for the selected scope with
search (title, body, tags, mentioned names), and an editor with title, category, tags,
the formatting toolbar, mentioned-name chips (plain chips, typed or detected from
`@name`), pin, and an autosave status ("All changes saved · time") with "Save note".
**Experience**: the four summary cards, "Award XP" (amount, note, session; negative
allowed as a correction), the award log (current session highlighted, Show all), the
spending record (Show all) and the XP costs quick reference. **Character record**:
Possessions (gear, equipment), Blood bonds & Vinculi, Derangements, Goals and
Description. "Start new session" makes a new session current. Notes and Award XP work in
play mode ("editable during play, does not change character traits"); the Character
record is read-only in play mode and editable in edit mode.

*Level up.* No live-resources row. Four XP cards, then "Choose advancements": a search
field and cards for Attributes (Physical / Social / Mental), Abilities (Talents /
Skills / Knowledges), Disciplines, Virtues and Humanity & Willpower. Each trait row
shows dots, the step "N → N+1", its cost and a "+" button; rows whose cost exceeds the
remaining XP show "Unavailable · need N XP"; one dot at a time per trait; maximum ratings
disable the row. Selected advancements form a pending list in the "Upgrade review"
panel with per-line cost, running total and a remove button, the pending subtotal, the
"After confirmation" balance, the projected totals, and a "Journal record" preview.
"Confirm & apply" writes the new ratings to the character and appends one spending
record per advancement to the current session, in one save; "Clear selections" empties
the pending list and "Cancel" discards the review; "Back to character sheet" leaves
without applying. Nothing changes the character until confirmation. "Beyond the standard
costs" shows the Storyteller guidance as text; there is no Storyteller button, because
the app has no network or accounts. Works in play mode.

**Sessions and the application bar.** The app-bar label reads "<Chronicle> /
<current session title>" from the existing Chronicle field and the current session; it
is empty when neither exists.

**Responsiveness.** Wide layout is 1512px as in the frames. Below it, two- and
three-column areas collapse to one column in reading order; tables scroll inside their
own container, never the page. No horizontal page scroll at 320px.

**Accessibility.** WCAG 2.1 AA: every control named and keyboard-operable with a visible
focus indicator; state (Known / Locked, pending, unavailable, current session, pinned)
is never conveyed by color alone; the tab bar follows the tabs pattern; expandable rows
use disclosure semantics; the pending-advancement list, Award XP result and note
autosave status are announced to assistive technology; read-only ratings expose their
value as text.

## Acceptance Criteria

Each slice is done independently; the foundation criteria (F) gate all of them.

**Foundation**

- F1. With no tabs registered besides the Character sheet, no tab bar appears, and the
  page is unchanged from today.
- F2. Registering a tab by adding its folder makes it appear in the tab bar in the
  fixed order, without editing any shared file.
- F3. Opening the sheet URL with `tab=<key>` shows that tab; an unknown key shows the
  Character sheet. Reloading keeps the tab. Switching tabs does not reload the page or
  lose unsaved input.
- F4. Tabs are keyboard-operable (arrow keys move between tabs, Enter/Space activates),
  the active tab is marked by text/shape as well as color, and the page passes the axe
  WCAG 2.1 AA scan on every registered tab.
- F5. A record saved before this work loads with every new field blank, displays
  without error, and after any edit still contains every legacy field unchanged,
  including `notes` and `experience`.
- F6. The shell shows Identity, the mode toggle and save status on every tab, and the
  live resources row on every tab except Level up; changing blood, willpower or health
  on any tab saves and is reflected on the others.
- F7. Mode (play / edit) persists across tab switches within a visit and is announced
  as today.

**Disciplines**

- D1. The list shows each named Discipline with its rating and "N levels unlocked";
  selecting one shows its powers in level order with Known for level ≤ rating and
  Locked with "Requires <Discipline> N" otherwise.
- D2. Expanding a power shows activation cost, duration, prerequisite, dice pool,
  difficulty / resistance and rulebook reference from the catalogue; a field with no
  clean value shows "See rulebook".
- D3. A power that rolls shows "Your pool: N dice" computed from the character's
  ratings less the wound penalty, with the formula text; a power that does not roll
  shows what it uses instead.
- D4. Search narrows Disciplines and powers by name and summary; "Owned" and "All
  disciplines" switch the list; all seventeen catalogued Disciplines appear under All.
- D5. "Build pool" selects that power's attribute and ability in the Selected pool and
  opens the Character sheet tab with the pool shown; it is absent for powers with no roll.
- D6. A Discipline with rating 0 or one not in the catalogue shows its name and rating
  and no powers.

**Backgrounds**

- B1. Each named background shows name, dots, summary, note and named people; unnamed
  rows are hidden in play mode and shown in edit mode.
- B2. Merits and Flaws list name, category and points with a point total per section;
  Other traits list name, optional rating and note; Havens list name, kind, description,
  location, access and security.
- B3. In play mode nothing on the tab is editable and the "Read-only in play · edit
  character to change" hint is shown; in edit mode every field is editable and entries
  can be added and removed, including more than six backgrounds.
- B4. A character with no entries shows each section's empty state, not blank space.
- B5. Edited entries survive reload; the section index counts match the lists.

**Combat**

- C1. The manoeuvre and weapon tables list the rulebook entries for Melee and Ranged
  with accuracy, difficulty and damage, and the character's pool computed from their
  ratings less the wound penalty.
- C2. Selecting a weapon and manoeuvre in the Weapon roll panel shows the attack pool,
  accuracy and difficulty; the ± inputs change the pool and difficulty and reset when
  the tab is left; nothing is stored and no random number is generated.
- C3. The damage pool equals weapon damage (Strength-based uses the character's
  Strength) plus the extra successes input, never below 0.
- C4. A manoeuvre that needs a Discipline power or a prior action the character lacks is
  marked unavailable with the reason; "Weapon required" manoeuvres use the selected weapon.
- C5. The search field and the filter narrow both tables; with no match an empty state
  is shown.
- C6. When Incapacitated every pool reads 0 and says why.

**Journal**

- J1. Creating a note with a title, category, tags and formatted body saves it to the
  current session; it appears in the list, in the session and category counts, and
  survives reload.
- J2. Pinning shows the note under Pinned; search finds a note by title, body text, tag or
  mentioned name.
- J3. The body supports bold, italic, bullet and numbered lists, checklist items that
  can be ticked, links and a quote; markup typed as raw HTML is shown as text, never
  executed.
- J4. "Start new session" makes the new session current and the previous one not;
  exactly one session is current.
- J5. "Award XP" with a positive amount adds to the current session's awards and updates
  Total earned, Available and This session; a negative amount reduces them; an empty or
  zero amount is rejected with a message.
- J6. Total earned, Total spent and Available always equal the sums defined above, for
  any ledger.
- J7. Notes and Award XP are editable in play mode; the Character record is read-only in
  play mode and editable in edit mode, with possessions, bonds, derangements, goals and
  description round-tripping through save and reload.
- J8. An empty journal shows an empty state with a prompt to start a session or add a
  note.

**Level up**

- L1. Each trait row shows its cost under the V20 formulas above for the character's
  current ratings and clan; rows that cost more than the remaining XP are unavailable
  with the shortfall stated; a trait at its maximum is disabled.
- L2. Selecting an advancement adds it to the pending list, lowers "After confirmation"
  by its cost and does not change the character or the ledger; removing it restores the
  balance.
- L3. "Confirm & apply" sets each selected trait to its new rating, appends one spending
  record each to the current session, and updates Total spent and Available, all in one
  save; after reload the ratings and records persist.
- L4. "Clear selections" and "Cancel" leave the character and ledger unchanged; "Back to
  character sheet" leaves without applying.
- L5. A Clan that is not one of the thirteen is treated as Caitiff: every Discipline
  advancement costs current × 6.
- L6. With no current session, "Confirm & apply" is disabled and the panel asks the player to start a session first; a spending record is never written without a session.
- L7. Cost and state are conveyed in text as well as color; the pending list and result
  are announced.

## Ambiguity Log

| Decision | Classification | Resolved By | Rationale / Answer |
| --- | --- | --- | --- |
| Which tabs, and in what unit of work | `requires-stakeholder-input` | human | All five (Disciplines too), one tab per slice, built in parallel after a shared foundation |
| Tab bar behavior while tabs are unbuilt | `requires-stakeholder-input` | human | Real tabs; unbuilt tabs hidden |
| Data model change style | `requires-stakeholder-input` | human | Additive fields, `schemaVersion` stays 1 |
| Roll dice or only compute pools | `requires-stakeholder-input` | human | Compute pools only |
| Weapon ownership | `requires-stakeholder-input` | human | Reference only; carried gear is free text in Journal → Possessions |
| Notes editor richness | `requires-stakeholder-input` | human | Rich text toolbar as drawn; mentions are plain chips |
| Sessions and app-bar label | `requires-stakeholder-input` | human | User-managed sessions, XP per session, label from Chronicle + current session; Award XP and Level up usable in play mode |
| XP "Available" − / + buttons | `requires-stakeholder-input` | human | Omitted; Available is derived; corrections via negative Award XP |
| Depth of Discipline power data | `requires-stakeholder-input` | human | Full fields from V20 chapter four |
| Unknown / free-text Clan in Level up | `requires-stakeholder-input` | human | Treated as Caitiff; every Discipline costs current × 6 |
| How tabs are addressed | `inferable` | inference | The sheet is a static page keyed by saved-character id with a `#edit` marker; a `tab=` query parameter beside it keeps tabs linkable without new routes |
| Tab registration without shared-file edits | `inferable` | inference | Required by "develop in parallel"; descriptor-by-glob avoids a shared registry file |
| Backgrounds beyond the six blank rows | `inferable` | inference | `backgrounds` is already an array and the Figma sample shows ten; edit mode can add rows. The plan verifies no consumer assumes six |
| Figma sample content (names, 47 XP, 10th generation) | `inferable` | inference | Marked "Sample dossier" in the frames; layout and fields are specified, content is not |
| Legacy `notes` and `experience` text fields | `inferable` | inference | Hidden today and preserved untouched; the new Journal does not import them, so no data is destroyed or silently reinterpreted |
| No Storyteller-confirmation button | `inferable` | inference | The app is static and local-only; the guidance text is kept, the action is not |
| Combat modifiers are not stored | `inferable` | inference | They are scratch inputs per roll, like the Selected pool, which is page state |
| Disciplines tab read-only in edit mode | `inferable` | inference | Ratings already have one edit surface (Character sheet); a second would duplicate it |
| Level up gated by mode | `inferable` | inference | Confirmation is itself the explicit commit, so play mode is allowed; it is the one place permanent ratings change outside edit mode |
| @mention linking to records | `inferable` | inference | No people records exist; chips of text are the smallest faithful rendering |
| Test for "an icon button has an accessible name" on each static reference table | `LOW_VALUE` | skipped | No branching logic and no observable outcome beyond the axe scan, which already covers it at a higher layer |

## Consistency Gate

- [x] Intent is unambiguous
- [x] Every behavior/goal maps to an acceptance criterion
- [x] Architecture constrains without over-engineering
- [x] Terminology consistent across artifacts
- [x] No contradictions between artifacts
- [x] Every gap/ambiguity finding is logged — inferable with rationale or resolved by human

**Verdict: PASS.** Known effort risk, for `/plan` to size: the Discipline power data
(about 85 powers) and the Combat reference tables are extracted from the sourcebook PDF
and are the largest non-UI tasks.
