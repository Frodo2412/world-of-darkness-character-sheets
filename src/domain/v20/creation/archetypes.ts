// What the Nature & Demeanor screen shows: the Archetype names a search keeps, which role each name is
// assigned to, and the cards and words around them. The names are the rules' (ARCHETYPES); the words here
// are original. Assigning is `setConceptText` on the active role: choosing a name sets it, choosing the name
// the role holds clears it, and emptying the role's text clears it too.

import type { V20Build } from './build';
import { matchByName } from './catalogue';
import { ARCHETYPES } from './rules';
import { NOT_CHOSEN, searchListWords } from './wording';

export type ArchetypeRole = 'nature' | 'demeanor';

export interface RoleInfo {
  role: ArchetypeRole;
  title: 'Nature' | 'Demeanor';
  /** The letter an Archetype carries when it fills this role. */
  mark: 'N' | 'D';
  /** The role switch's option. */
  assignLabel: string;
}

/** Nature first: the role that is active when the screen opens. */
export const ARCHETYPE_ROLES: readonly RoleInfo[] = [
  { role: 'nature', title: 'Nature', mark: 'N', assignLabel: 'Assign as Nature' },
  { role: 'demeanor', title: 'Demeanor', mark: 'D', assignLabel: 'Assign as Demeanor' },
];

export const roleInfo = (role: ArchetypeRole): RoleInfo => ARCHETYPE_ROLES.find((info) => info.role === role)!;

/** Said as the description of the role switch: how the keys work. The arrow keys do nothing on the list. */
export const ARCHETYPE_KEYS_HELP = 'Arrow keys switch role; Tab moves between archetypes; Space or Enter assigns.';

/** Said beside the field for a player's own Archetype: it fills the active role. */
export const OWN_ARCHETYPE_HELP = 'Fills the active role. Emptying the field clears the role.';

type Temperament = Pick<V20Build['concept'], ArchetypeRole>;

const named = (text: string): string => text.trim().toLowerCase();

/** Whether `text` is the Archetype called `name`, ignoring case and the space around it; blank is no one. */
const isArchetype = (text: string, name: string): boolean => named(text) !== '' && named(text) === named(name);

/** The Archetypes whose name holds `query`, ignoring case and the space around it, in catalogue order. */
export const matchArchetypes = (query: string): string[] =>
  matchByName(
    ARCHETYPES.map((name) => ({ name })),
    query,
  ).map((item) => item.name);

export interface ArchetypeEntry {
  name: string;
  /** The roles this Archetype fills, Nature before Demeanor. */
  marks: ArchetypeRole[];
  /** The marks as written beside the name: "N", "D" or "N D"; empty when it fills neither. */
  markText: string;
  /** What the marks mean, for assistive technology: "Assigned as Nature and Demeanor"; empty when it fills neither. */
  assigned: string;
  /** It fills the active role, which is what the pressed state shows. */
  pressed: boolean;
}

export interface ArchetypeListView {
  entries: ArchetypeEntry[];
  /** "All Archetypes · 42": the Archetypes the search keeps. */
  heading: string;
  /** Said to assistive technology each time the search changes the list. */
  results: string;
}

/** The list for a search `query`, marked for the roles `concept` fills, with `active` the role a press assigns. */
export function archetypeListView(query: string, concept: Temperament, active: ArchetypeRole): ArchetypeListView {
  const entries = matchArchetypes(query).map((name): ArchetypeEntry => {
    const filled = ARCHETYPE_ROLES.filter(({ role }) => isArchetype(concept[role], name));
    return {
      name,
      marks: filled.map(({ role }) => role),
      markText: filled.map(({ mark }) => mark).join(' '),
      assigned: filled.length === 0 ? '' : `Assigned as ${filled.map(({ title }) => title).join(' and ')}`,
      pressed: filled.some(({ role }) => role === active),
    };
  });
  return { entries, ...searchListWords('archetype', 'archetypes', entries.length, query) };
}

export interface RoleCard {
  role: ArchetypeRole;
  title: 'Nature' | 'Demeanor';
  /** The Archetype, or "Not chosen". */
  value: string;
}

/** The two summary cards: what each role holds now. */
export const roleCards = (concept: Temperament): RoleCard[] =>
  ARCHETYPE_ROLES.map(({ role, title }) => ({ role, title, value: concept[role].trim() || NOT_CHOSEN }));

/** The label of the field for a player's own Archetype, which holds the text of the active role. */
export const ownArchetypeLabel = (role: ArchetypeRole): string => `Your own ${roleInfo(role).title}`;

/** What is said when a name is assigned to a role. */
export const assignedNotice = (name: string, role: ArchetypeRole): string => `${name} assigned as ${roleInfo(role).title}.`;

/** What is said when a name is cleared from a role. */
export const clearedNotice = (name: string, role: ArchetypeRole): string => `${name} cleared as ${roleInfo(role).title}.`;

/** What a press did, said until the build stops being as the press left it. */
export interface ArchetypeNotice {
  kind: 'assigned' | 'cleared';
  name: string;
  role: ArchetypeRole;
}

export interface Press {
  /** The text the role is to hold: the name, or blank to clear it. */
  text: string;
  notice: ArchetypeNotice;
}

/** A press on `name` for `role`: a name the role holds is cleared, any other is set. */
export function pressOutcome(concept: Temperament, role: ArchetypeRole, name: string): Press {
  const clears = isArchetype(concept[role], name);
  return { text: clears ? '' : name, notice: { kind: clears ? 'cleared' : 'assigned', name, role } };
}

export const noticeText = (notice: ArchetypeNotice | null): string =>
  notice === null ? '' : (notice.kind === 'assigned' ? assignedNotice : clearedNotice)(notice.name, notice.role);

/**
 * The notice, or null once the build no longer holds what it says: an assignment while the role holds the
 * name, a clearing while the role is blank. Once null it stays null, so the words do not return when later
 * text happens to match again.
 */
export function settleNotice(notice: ArchetypeNotice | null, concept: Temperament): ArchetypeNotice | null {
  if (notice === null) return null;
  const text = concept[notice.role];
  const holds = notice.kind === 'assigned' ? isArchetype(text, notice.name) : text.trim() === '';
  return holds ? notice : null;
}
