# Spec: V20 Character Sheet

<!-- spec-version: 12.5.0 -->

## Intent Description

Players of Vampire: The Masquerade 20th Anniversary Edition (V20) can keep their
characters in this app instead of on the paper/PDF sheet. A player opens a roster of
their characters, creates a new V20 character, and fills in an interactive version of
**page 1** of the official 4-page sheet: identity fields, dot-rated traits, and the
play-time trackers (Humanity/Path, Willpower, Blood Pool, Health). Everything they
enter is saved automatically in the browser and is still there when they come back.

The sheet is a faithful *record*, not a rules engine. It accepts any value the printed
sheet can physically hold and does not judge whether a character is legal: no
creation-point budgets (7/5/3, 13/9/5, freebies), no clan-discipline checks, no
generation-based trait caps, no wound-penalty maths.

Out of scope for this ship: pages 2–4 of the sheet (merits & flaws, other traits,
rituals, paths, experience log, derangements, combat/armor, expanded backgrounds,
possessions, blood bonds, havens, history, description, visuals), character-creation
guidance, file export/import, printing, any backend or sync, other game lines (Mage),
and localisation.

## Architecture Specification

**Stack.** Astro (static output, existing `astro ^7.3.5`) + vanilla TypeScript. No UI
framework and no new runtime dependency. Vitest is added as a dev dependency for unit
tests; the already-installed `@playwright/test` covers end-to-end behavior.

**Components.**

| Component | Responsibility | Constraint |
| --- | --- | --- |
| Character model (`src/domain/v20/`) | The V20 page-1 character type, the trait catalogue (attribute/ability names and groups), the blank-character factory, and pure update functions (set rating, cycle health box, set tracker level, set text) | Pure TypeScript: no DOM, no `localStorage`, no Astro imports. Updates return a new character; inputs are never mutated |
| Character store (`src/storage/`) | Roster persistence: list, create, load, save, delete; serialisation and validation of stored data | The only module that touches `localStorage`. Depends on the model, never the reverse |
| Sheet controls (`src/components/`) | Dot rating, box tracker, and health track as custom elements; Astro components for the static sheet markup | Hold no character state of their own beyond what they render; emit change events |
| Pages (`src/pages/`) | Roster page and sheet page; wire controls → model update → store save | Static pages; the character is selected client-side by id in the URL query string, since saved characters do not exist at build time |

Dependency direction: pages → controls / store → model. The model depends on nothing.

**Routes.** `/` is the roster (replacing the Astro starter welcome content);
`/sheet/?id=<character-id>` is the sheet for one character. Exact paths may be refined
in `/plan` provided the roster is the landing page and a sheet URL is bookmarkable.

**Storage.** One `localStorage` namespace for the app. Each character is stored as its
own record with a generated unique id, a `system` discriminator (`"v20"`), and a
`schemaVersion` number, so that other game lines and later sheet pages can be added
without rewriting existing saves. Saving is automatic on every change; there is no
save button.

**Presentation.** Original CSS that follows the official page-1 section order and
grouping (header → Attributes → Abilities → Advantages → notes / Humanity–Willpower–Blood
Pool / Health–Weakness–Experience). No White Wolf / Onyx Path artwork, logo, lettering,
or background texture is copied. Layout is responsive: three columns on wide screens,
collapsing to one on phones. UI text is English.

**Accessibility.** WCAG 2.1 AA: every control has an accessible name, is operable by
keyboard alone, shows a visible focus indicator, and exposes its current value to
assistive technology. State is never conveyed by colour alone (health damage types use
distinct glyphs).

## Acceptance Criteria

### Roster

- **AC-1** The landing page lists every saved character, showing at least its name
  (or an "Unnamed character" placeholder), clan, and player. With no saved characters
  it shows an empty state with a way to create one.
- **AC-2** Creating a character adds a blank V20 character to the roster and opens its
  sheet. Creating several yields distinct characters that do not share data.
- **AC-3** Deleting a character asks for confirmation; on confirm the character is
  removed from the roster and from storage; on cancel nothing changes. Other characters
  are unaffected.
- **AC-4** Opening a sheet URL whose id matches no saved character shows a
  "character not found" message with a link back to the roster, and creates nothing.

### Sheet content (page 1)

- **AC-5** The sheet has nine free-text header fields: Name, Player, Chronicle, Nature,
  Demeanor, Concept, Clan, Generation, Sire.
- **AC-6** Attributes: nine dot ratings in three groups — Physical (Strength, Dexterity,
  Stamina), Social (Charisma, Manipulation, Appearance), Mental (Perception,
  Intelligence, Wits). Range 0–10. A blank character has 1 in each.
- **AC-7** Abilities: thirty named dot ratings in three groups — Talents (Alertness,
  Athletics, Awareness, Brawl, Empathy, Expression, Intimidation, Leadership,
  Streetwise, Subterfuge), Skills (Animal Ken, Crafts, Drive, Etiquette, Firearms,
  Larceny, Melee, Performance, Stealth, Survival), Knowledges (Academics, Computer,
  Finance, Investigation, Law, Medicine, Occult, Politics, Science, Technology) — plus
  one custom row per group with an editable name. Range 0–10. A blank character has 0
  in each.
- **AC-8** Disciplines and Backgrounds: six rows each, every row an editable name plus
  a dot rating, range 0–10, blank by default.
- **AC-9** Virtues: three ratings labelled exactly as printed — "Conscience/Conviction",
  "Self-Control/Instinct", "Courage". Range 0–5. A blank character has 1 in each.
- **AC-10** Humanity/Path: an editable path name, a rating 0–10, a free-text Bearing
  field, and a free-text Bearing modifier field (any text, e.g. "+1").
- **AC-11** Willpower: a permanent rating 0–10 and a separate temporary tracker 0–10.
  Neither constrains the other.
- **AC-12** Blood Pool: a tracker 0–50 and a "Blood Per Turn" field.
- **AC-13** Health: seven boxes labelled Bruised, Hurt (−1), Injured (−1), Wounded (−2),
  Mauled (−2), Crippled (−5), Incapacitated.
- **AC-14** Free-text fields for Weakness, Experience, and a multi-line notes area.
- **AC-15** The creation reminder line from the printed sheet (Attributes 7/5/3 •
  Abilities 13/9/5 • Disciplines 3 • Backgrounds 5 • Virtues 7 • Freebie Points 15
  (7/5/2/1)) is displayed as static reference text and enforces nothing.

### Interaction

- **AC-16** Dot ratings and box trackers: activating position *n* sets the value to *n*;
  activating the position equal to the current value lowers it to *n − 1* (so any
  value, including 0, is reachable). Values never leave the control's range.
- **AC-17** Each Health box cycles independently: empty → bashing (`/`) → lethal (`X`)
  → aggravated (`*`) → empty. Boxes are not auto-sorted and no penalty is calculated.
- **AC-18** No input is rejected or flagged for breaking V20 creation or generation
  rules; the only limits are the ranges in AC-6 to AC-12.
- **AC-19** Every control on the roster and sheet can be reached and operated with the
  keyboard alone and announces its name and current value to a screen reader; each
  control's accessible name is unique within its page; automated
  accessibility checks report no WCAG 2.1 AA violations on either page.
- **AC-20** At a 375 px-wide viewport the sheet is fully usable with no horizontal
  page scrolling.

### Persistence

- **AC-21** Any change to a character is saved automatically with no explicit save
  action; after a page reload the sheet shows exactly the values last entered, for
  every field in AC-5 to AC-14.
- **AC-22** A stored record that cannot be parsed or fails validation does not crash
  the app and does not hide the other characters: the roster still loads, the bad
  record is reported as unreadable, and it is not overwritten or deleted automatically.
- **AC-23** If the browser refuses a write (storage unavailable or quota exceeded) the
  sheet shows a visible "changes not saved" message and remains usable. If storage is
  unavailable when the roster loads, the roster says characters cannot be saved in this
  browser.

### Quality thresholds

- **AC-24** The character model has unit tests covering every update function and
  range boundary; end-to-end tests cover create → edit → reload → delete. `astro build`,
  the type check, `oxlint`, and both test suites pass.

## Ambiguity Log

All gap and ambiguity findings from the Ambiguity Resolution Protocol, with their classifications and rationale.

| Decision | Classification | Resolved By | Rationale / Answer |
|----------|---------------|-------------|-------------------|
| What "supporting V20 characters" delivers first | `requires-stakeholder-input` | human (approach screen) | Interactive fillable sheet; no creation-rules enforcement |
| How much of the 4-page sheet | `requires-stakeholder-input` | human (approach screen) | Page 1 only; pages 2–4 are later ships |
| Where character data lives | `requires-stakeholder-input` | human (approach screen) | Browser `localStorage`; no export/import |
| How the work lands | `requires-stakeholder-input` | human (approach screen) | User adds a GitHub remote; PR flow once it exists. No remote at spec time, so the spec is a file |
| One character or many | `requires-stakeholder-input` | human | Multiple characters with a roster |
| Health box behavior | `requires-stakeholder-input` | human | Per-box cycle empty → bashing → lethal → aggravated; no penalty maths, no sorting |
| UI technology | `requires-stakeholder-input` | human | Astro + vanilla TypeScript, custom elements, no framework |
| Visual fidelity to the PDF | `requires-stakeholder-input` | human | Same layout and section order, original styling, no copied artwork |
| Maximum dots for attributes, abilities, disciplines, backgrounds | `inferable` | inference | The printed sheet has 10 dots per row and the user excluded generation limits, so the range is what the sheet can hold: 0–10 |
| Minimum for attributes and virtues despite the pre-filled first dot | `inferable` | inference | The pre-filled dot is a default, not a floor: V20 permits Appearance 0 (Nosferatu) and Conviction/Instinct start without the free dot. Default 1, minimum 0 |
| Temporary Willpower may exceed permanent; Blood Pool not capped by generation | `inferable` | inference | Both caps are rules enforcement, which the scope decision excludes |
| Clan, Nature, Demeanor, Generation as free text vs. pick-lists | `inferable` | inference | The printed sheet uses blank lines for all nine header fields, and pick-lists would encode sourcebook rules content the scope excludes |
| Dot/box click behavior | `inferable` | inference | Set-to-*n* with click-current-to-decrement is the standard convention for digital dot sheets and is the only single-click scheme that reaches 0 |
| Explicit save vs. autosave | `inferable` | inference | The accepted persistence option was described as "characters save automatically" |
| Per-trait specialty text | `inferable` | inference | Not included: on the printed sheet the underscores after a trait name are a leader line, not a separate field. Specialties can go in the notes area; a dedicated field can follow with later pages |
| Custom ability rows | `inferable` | inference | The sheet prints exactly one blank row per ability group; replicate that count |
| Roster landing page replaces the Astro starter welcome | `inferable` | inference | The welcome page is template boilerplate with no product content; the repo is named for multiple game lines, so a roster is the natural index |
| Selecting a character by query-string id | `inferable` | inference | Astro static output cannot pre-render routes for data that only exists in the visitor's browser |
| Stored-record `system` and `schemaVersion` fields | `inferable` | inference | Pages 2–4 and Mage are stated follow-ups; versioned, system-tagged records are the minimum needed to add them without breaking saves |
| Corrupt record handling | `inferable` | inference | With several characters in storage, one bad record must not cost the user the rest; never auto-deleting is the reversible choice |
| Unit-test runner | `inferable` | inference | Playwright is installed but is an e2e tool; Vitest is the standard Vite/Astro unit runner |
| UI language | `inferable` | inference | The source sheet and all V20 trait names are English |
| Printing, export, sync | `inferable` | inference | Not requested; export was offered and declined at the approach screen |
| Virtue labels | `inferable` | inference | The printed sheet labels the rows "Conscience/Conviction" and "Self-Control/Instinct"; showing both keeps the sheet usable for Path characters without a rules-driven toggle |
| Bearing modifier input type | `inferable` | inference | Free text, like every other write-in on the sheet; a numeric input would reject entries the paper accepts |
| Tests asserting that static labels render | `LOW_VALUE` | skipped | No branching, and the e2e create/edit flow already exercises every labelled control |

## Consistency Gate
- [x] Intent is unambiguous
- [x] Every behavior/goal maps to an acceptance criterion
- [x] Architecture constrains without over-engineering
- [x] Terminology consistent across artifacts
- [x] No contradictions between artifacts
- [x] Every gap/ambiguity finding is logged — inferable with rationale or resolved by human
