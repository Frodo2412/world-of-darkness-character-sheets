# Spec: Sheet Play View Redesign

<!-- spec-version: 12.5.0 -->

Design source: Figma file `TAvjmr6RE0rHV8kz56Ffs0`, frame `5:2725` "Character sheet"
(<https://www.figma.com/design/TAvjmr6RE0rHV8kz56Ffs0/Vampire-the-Masquerade-20th-Anniversary-Edition-Character-Sheet?node-id=5-2725>).
The sibling frame `5:3452` "Disciplines and power detail" is not part of this spec.

## Intent Description

The V20 sheet stops being an on-screen copy of the paper form and becomes an
**at-the-table play view**, laid out as in the Figma frame: an application bar, the
character's identity, a row of live resources (Blood Pool, Willpower, Health, Humanity),
the Attributes and Abilities as cards of dot-rated rows, and a side column of quick
references (Selected pool, Disciplines, Virtues).

The sheet gains two modes. In **play mode** (the default) the player can only change what
changes during a session: blood, temporary willpower and health. Everything else is
read-only, so a stray click cannot alter the character. **Edit mode**, entered with an
"Edit character" button, makes identity, traits, Disciplines, Virtues, Humanity and
permanent Willpower editable in place. Changes still save automatically in both modes.

In play mode the player can pick one attribute and one ability and the **Selected pool**
card shows how many dice to roll: attribute + ability − current wound penalty.

The same visual language (colors, typefaces, cards, buttons, application bar) is applied
to the roster and the character builder so the app looks like one product. Their layout
and behavior do not change.

Out of scope: the "Disciplines and power detail" frame, the Backgrounds / Merits & Flaws /
Inventory / History & Relationships tabs, the session label, the settings icon, a light
theme, and new roster or builder behavior.

**Amendment (2026-10-06).** Three omissions were reversed after the frame and the build
were compared: Discipline power lists with their dice, specialties, and a blood-per-turn
figure that follows the generation. They are specified below and marked *(amended)*.

## Architecture Specification

**Stack.** Unchanged: Astro static output, vanilla TypeScript, plain CSS, custom
elements. No UI framework. The only permitted new dependency is self-hosted font files
for the typefaces the Figma file names; the pages make no third-party network requests
at runtime, and each typeface declares a system fallback stack.

**Components.**

| Component | Change | Constraint |
| --- | --- | --- |
| Character model (`src/domain/v20/`) | New pure functions: blood pool maximum from the Generation text, current wound penalty from the health track, dice pool from an attribute, an ability and a wound penalty, and a temporary-willpower step that respects permanent | Pure TypeScript, no DOM. *(amended)* `V20Character` gains `specialties`; `schemaVersion` stays 1 and a record saved without the field is read as having none |
| Character store (`src/storage/`) | None | Stored records are read and written exactly as today, including fields the new sheet no longer shows |
| Design tokens (`src/styles/global.css`) | Colors, typefaces, type scale, radii and spacing replaced with the Figma values; shared card, button and application-bar styles | One token set for all three pages. No color has its only definition outside `:root` |
| Layout (`src/layouts/Layout.astro`) | Renders the application bar on every page | The bar's identity links to the roster |
| Sheet page and components (`src/pages/sheet.astro`, `src/components/sheet/`) | Rebuilt to the frame's structure | Controls stay stateless custom elements that emit change events; the page script remains the only place that applies model updates and saves |
| Sheet controls (`src/components/controls/`) | Dot rating gains a read-only presentation and a selectable presentation; a stepper (− value +) presentation for Blood Pool and Willpower | Existing keyboard and ARIA behavior of editable ratings and the health track is preserved |
| Roster and builder pages | Restyled through the shared tokens and styles only | No markup restructuring beyond what the application bar requires; no behavior change |

Dependency direction is unchanged: pages → controls / store → model.

**Sheet structure**, top to bottom:

1. *Application bar* — app identity (diamond mark, "Vampire: The Masquerade", "V20"
   badge) linking to the roster, and the save status.
2. *Character identity* — monogram from the name's initials, name, a summary line of
   Clan · Generation · Concept, Nature / Demeanor, and the "Edit character" button.
3. *Live resources* — Blood Pool, Willpower, Health, Humanity cards.
4. *Workspace* — Attributes (Physical / Social / Mental) and Abilities (Talents / Skills /
   Knowledges) cards on the left; Selected pool, Disciplines and Virtues cards on the right.

No tab bar is rendered: only the "Character sheet" tab has content.

**Modes.** Mode is page state, not character state: it is not stored, and a loaded sheet
starts in play mode. The one exception is a character created with the roster's
"New V20 character" button, whose sheet opens in edit mode.

| Field | Play mode | Edit mode |
| --- | --- | --- |
| Blood Pool current, temporary Willpower, Health boxes | Editable | Editable |
| Name, Clan, Generation, Concept, Nature, Demeanor | Read-only text | Text inputs |
| Attributes, Abilities, custom abilities | Read-only dots; selectable for the pool | Editable dots (custom: name + dots) |
| Disciplines | Named rows only, read-only; *(amended)* each opens to list its powers | All 6 write-in rows, name + dots |
| Virtues, Humanity rating, path name, permanent Willpower | Read-only | Editable |
| Specialties *(amended)* | A mark after the trait's name; named in the Selected pool | A text field on every attribute and fixed ability row |

**Derived values.**

- *Blood Pool maximum*: the first whole number in the Generation text selects the V20
  maximum (13th and higher 10, 12th 11, 11th 12, 10th 13, 9th 14, 8th 15, 7th 20, 6th 30,
  5th 40, 4th 50). With no readable number, or one outside 4–15, the maximum is the
  sheet's existing Blood Pool maximum.
- *Blood per turn (amended)*: the same generation selects the V20 blood per turn (10th and
  higher 1, 9th 2, 8th 3, 7th 4, 6th 6, 5th 8, 4th 10). With no recognised generation
  none is shown. It is never entered by hand; the stored per-turn text is kept but unused.
- *Discipline powers (amended)*: a named Discipline rated 1 or more that matches the
  built-in catalogue (the builder's seventeen Disciplines, matched ignoring case and
  spacing) lists its powers up to its rating, at most five. A power that rolls an
  attribute + an ability shows that dice pool, less the wound penalty; any other power
  shows what it uses instead ("No roll", "Manipulation + Courage"). The catalogue is
  the System entries of V20 chapter four. Celerity, Fortitude
  and Potence show a one-line note; Thaumaturgy and Necromancy, learned by path, list no
  powers. A Discipline the catalogue does not know shows its name and rating only.
- *Wound penalty*: the penalty of the most severe health level holding any damage; none
  when the track is empty or only Bruised is marked. Incapacitated is its own state, not
  a number.
- *Dice pool*: attribute rating + ability rating − wound penalty, never below 0; 0 when
  Incapacitated.

**Hidden content.** Player, Chronicle, Sire, Backgrounds, Notes, Weakness, Experience,
Bearing and Bearing modifier have no control on the sheet. Their stored values survive
every save untouched.

**Responsiveness.** The frame defines the wide layout (1512px). Below it the side column
drops under the traits, three-column card groups collapse to one column, and the live
resource cards wrap. No horizontal page scroll at 320px width.

**Accessibility.** WCAG 2.1 AA, as today: every control named, keyboard-operable, with a
visible focus indicator; state never conveyed by color alone. Read-only ratings expose
their value as text, not as disabled controls. The mode change and pool result are
announced to assistive technology.

## Acceptance Criteria

**Layout and look**

1. At 1512px wide, the sheet for a saved character shows the application bar, character
   identity, live resources row, and workspace in the order and grouping of frame
   `5:2725`, with Selected pool, Disciplines and Virtues in a right-hand column.
2. Colors, typefaces, type sizes, corner radii and spacing on the sheet match the Figma
   frame's values; a side-by-side screenshot comparison at 1512px shows no structural
   difference other than the omissions listed under Out of scope.
3. No tab bar, session label or settings icon is rendered.
4. The roster and builder render with the same application bar, colors, typefaces, card
   and button styles as the sheet; every existing roster and builder scenario still
   passes. Builder scenarios that assert on sheet content are adapted to the play view;
   the plan lists each change.
5. Loading any page causes no network request to another origin.
6. At 320px wide no page scrolls horizontally and every sheet card is reachable.

**Modes**

7. A sheet opened from the roster list is in play mode: identity shows as text, and
   Attributes, Abilities, Disciplines, Virtues and Humanity cannot be changed by pointer
   or keyboard. The Abilities heading shows "Read-only in play · edit character to change".
8. Activating "Edit character" makes every field in the Modes table's edit column
   editable in place; the button then offers to leave edit mode, and leaving returns to
   play mode showing the edited values.
9. Reloading the sheet while in edit mode returns it to play mode with all edits saved.
10. A character created with "New V20 character" opens its sheet in edit mode.
11. Every change in either mode is saved without a save action and survives a reload;
    the application bar shows a saved status after a successful save and the existing
    not-saved message when the browser refuses the write.

**Live resources**

12. Blood Pool shows current / maximum, with the maximum derived from Generation per the
    table above, a tracker (one segment per point for a maximum of 20 or fewer, a single
    proportional bar above that) filled up to current, and *(amended)* the blood per
    turn derived from Generation, with no field to enter it.
13. Blood Pool − and + change current by one; − is unavailable at 0 and + at the maximum.
    A stored current above the maximum is shown as stored, and only − is available.
14. Willpower shows temporary / permanent and permanent as dots. − and + change temporary
    by one; − is unavailable at 0 and + when temporary equals or exceeds permanent.
15. Health shows the seven levels with their penalties; activating a box cycles empty →
    bashing → lethal → aggravated → empty with a distinct mark per damage type, and a
    legend names the marks. The card heading shows the current wound level and penalty
    (for example "Hurt · −1 die"), nothing when unwounded, and "Incapacitated" when that
    level is marked.
16. Humanity shows the rating as a number and as ten dots, and the path name when set.

**Selected pool**

17. In play mode, activating an attribute row selects it and activating an ability row
    (fixed or named custom) selects it; at most one of each is selected, the selected row
    is visibly and programmatically marked, and activating a selected row deselects it.
18. With one attribute and one ability selected, the card shows the formula (for example
    "Intelligence 4 + Investigation 3 − wound 1") and the dice total; with one or none
    selected it prompts for what is missing; the wound term is omitted when there is no
    penalty.
19. The total updates immediately when the health track changes, is never below 0, and
    is 0 with an Incapacitated notice when Incapacitated is marked.
20. The selection is not stored: reloading clears it. Entering edit mode clears it and
    rows are not selectable while editing.

**Side cards and custom abilities**

21. Disciplines lists each named Discipline with its rating in play mode, and shows an
    empty-state line when none is named; edit mode shows all six write-in rows.
    *(amended)* A Discipline in the catalogue opens to show its powers with their dice;
    the first starts open, and one the player opened stays open when the dice change.
21a. *(amended)* Every attribute and fixed ability has a specialty field in edit mode. In
    play a trait with a specialty is marked after its name, its button's description ends
    ", specialty <text>", and the Selected pool names the specialty of each chosen trait.
22. Virtues shows the three virtues with their ratings.
23. A custom ability with a name appears as the last row of its group in play mode; an
    unnamed one does not. Edit mode always shows the write-in row for each group.

**Data safety**

24. A character saved by the current app, with values in Player, Chronicle, Sire,
    Backgrounds, Notes, Weakness, Experience, Bearing and Bearing modifier, still holds
    exactly those values after being opened, edited and saved in the new sheet.
25. The not-found, unreadable and storage-unavailable states still appear as they do
    today, in the new look.

**Quality**

26. Unit tests cover blood pool maximum (each generation, unreadable text, out-of-range
    number), wound penalty (empty, each level, Incapacitated, non-contiguous damage),
    dice pool (floor at 0, Incapacitated) and the temporary-willpower step.
27. The automated accessibility scan reports no WCAG 2.1 AA violation on the sheet in
    play mode, the sheet in edit mode, the roster and the builder.
28. `npm run test`, `npm run test:e2e`, `npm run typecheck`, `npm run lint` and
    `npm run build` all pass.

## Ambiguity Log

All gap and ambiguity findings from the Ambiguity Resolution Protocol, with their classifications and rationale.

| Decision | Classification | Resolved By | Rationale / Answer |
|----------|---------------|-------------|-------------------|
| Which screens the rework covers | `requires-stakeholder-input` | human | Sheet rebuilt to frame 5:2725; shared look applied to roster and builder; frame 5:3452 excluded |
| Designed features with no backing data | `requires-stakeholder-input` | human | Build the Selected pool; omit power references, unbacked tabs, session label, settings |
| Always-editable vs. play / edit modes | `requires-stakeholder-input` | human | Play / edit modes; existing scenarios enter edit mode first |
| Current content absent from the frame | `requires-stakeholder-input` | human | Hidden from the UI; stored data preserved |
| Disciplines card | `requires-stakeholder-input` | human | Names + ratings, read-only in play, six write-in rows in edit mode; no power lists |
| Source of the Blood Pool maximum | `requires-stakeholder-input` | human | Derived from the Generation text via the V20 table; falls back to the sheet maximum |
| Temporary Willpower ceiling | `requires-stakeholder-input` | human | + stops at permanent; an out-of-range stored value is shown as stored |
| Custom abilities | `requires-stakeholder-input` | human | Shown when named, selectable for the pool; write-in row always present in edit mode |
| Concept is listed as hidden in the approach answer but appears in the frame's summary line ("Antiquarian") | `inferable` | inference | The frame is the stated target and shows it; Concept is displayed and editable. Player, Chronicle and Sire stay hidden |
| Tab bar with a single tab | `inferable` | inference | User chose "tabs with nothing behind them are not shown"; a one-item tab list navigates nowhere, so the bar is omitted |
| Mode persistence | `inferable` | inference | The frame labels the default as "in play"; a mode that survived reload would defeat the stray-click protection |
| New blank character opens in edit mode | `inferable` | inference | A blank character in play mode shows nothing actionable; "New V20 character" exists to fill one in |
| "Saved just now" relative time | `inferable` | inference | Existing behavior saves on every change and reports only failure; the status shows saved / not saved without a ticking timestamp |
| Application bar identity on roster and builder | `inferable` | inference | User asked for the application bar app-wide; every page today is V20-only, so the designed identity applies unchanged |
| "Back to characters" link | `inferable` | inference | Replaced by the application bar identity linking to the roster, the conventional home affordance |
| Wound penalty when damage is not contiguous | `inferable` | inference | The health track lets any box be marked; the most severe marked level is what V20 means by current wound level |
| Dice pool when Incapacitated | `inferable` | inference | V20: an Incapacitated character cannot act; the frame shows "—" for that level's penalty |
| Partial or empty pool selection | `inferable` | inference | The frame only shows the complete state; a prompt for the missing half is the only non-misleading display |
| Stored Blood Pool current above the derived maximum | `inferable` | inference | Mirrors the human's Willpower answer: show as stored, allow only − |
| Generation outside 4–15 | `inferable` | inference | The existing sheet maximum is 50 (4th generation) and the builder's base is 13th; values outside the table fall back like unreadable text |
| Webfont delivery | `inferable` | inference | The app is local-only with a same-origin referrer policy; self-hosting keeps it free of third-party requests |
| Responsive behavior below the frame width | `inferable` | inference | The existing spec requires phone support; the frame defines only desktop, so cards stack in reading order |
| Light theme | `inferable` | inference | The app is dark-only today and the design is dark-only |
| Criterion 4 required builder scenarios to pass with unchanged steps, but six assert on sheet content | `requires-stakeholder-input` | human | Amended at plan approval: those scenarios are adapted and listed in the plan |
| Criterion 12 required one tracker segment per blood point, which draws 50 boxes at the fallback maximum | `requires-stakeholder-input` | human | Amended at plan approval: a single bar above a maximum of 20 |
| Discipline powers, specialties and blood per turn, first omitted | `requires-stakeholder-input` | human | Amended 2026-10-06: built-in power catalogue for the builder's Disciplines; a specialty on any attribute or fixed ability, with no rating gate; blood per turn derived from Generation |
| Tests asserting exact pixel values per token | `LOW_VALUE` (skipped) | inference | No branching logic; covered by the screenshot comparison in criterion 2 |

## Consistency Gate
- [x] Intent is unambiguous
- [x] Every behavior/goal maps to an acceptance criterion
- [x] Architecture constrains without over-engineering
- [x] Terminology consistent across artifacts
- [x] No contradictions between artifacts
- [x] Every gap/ambiguity finding is logged — inferable with rationale or resolved by human
