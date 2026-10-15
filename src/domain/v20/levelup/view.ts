// What the Level up tab shows, from the character and the choices made so far alone: the four XP figures,
// the traits in their cards and what each says, the review of the choices, and whether they can be applied.
// Computed on every draw, never stored.

import type { V20Character } from '../character';
import { CLANS } from '../creation/rules';
import { costRule, XP_COSTS } from '../experience/costs';
import { experienceTotals } from '../experience/ledger';
import { currentSession } from '../journal/sessions';
import { countLabel } from '../labels';
import { matchesQuery } from '../search';
import { ABILITY_GROUPS, ATTRIBUTE_GROUPS, VIRTUES } from '../traits';
import { figure } from '../experience/awards/validate';
import { availability } from './availability';
import { advancementCost } from './costs';
import { pendingTotals, type Pending } from './pending';
import { subjectLabel, subjectMaximum, subjectRating, type Subject } from './subjects';

export type RowState = 'affordable' | 'unavailable' | 'pending' | 'maximum';

export interface RowView {
  subject: Subject;
  label: string;
  rating: number;
  /** Dots drawn: five, or ten for a trait that goes to ten. */
  dots: number;
  state: RowState;
  /** "2 → 3"; not for a trait at its maximum. */
  change?: string;
  /** "8 XP"; not for a trait at its maximum. */
  cost?: string;
  /** What the row says in words besides its cost: "Unavailable · need 7 XP", "Maximum rating", "Pending · not applied". */
  note: string;
  /** What the "+" or "−" button is called: "Raise Stealth from 2 to 3 for 4 XP". */
  action: string;
}

export interface CardView {
  key: string;
  title: string;
  /** The rule that prices its rows: "Current rating × 4 XP". */
  rule: string;
  rows: RowView[];
}

export interface GroupView {
  key: string;
  title: string;
  hint: string;
  cards: CardView[];
}

export interface ReviewLine {
  subject: Subject;
  label: string;
  /** "4 XP". */
  cost: string;
  /** "2 → 3". */
  change: string;
  rating: number;
  dots: number;
  /** "Existing Ability · current 2 × 2 = 4 XP". */
  rule: string;
  /** "Running total 4 XP · 4 XP remaining". */
  running: string;
  /** What the remove button is called: "Remove Stealth from the review". */
  action: string;
}

export interface XpFigure {
  label: string;
  value: string;
  caption: string;
}

export interface LevelUpView {
  cards: { earned: XpFigure; spent: XpFigure; available: XpFigure; thisSession: XpFigure };
  /** Experience to spend before the review. */
  available: number;
  /** "No XP available": nothing to spend, so nothing can be raised. */
  noXp: boolean;
  /** "1 XP left in this review. Unavailable choices show the additional XP needed." */
  status: string;
  groups: GroupView[];
  review: {
    lines: ReviewLine[];
    /** "2 pending upgrades". */
    chip: string;
    count: number;
    summary: { label: string; value: string; emphasis?: boolean }[];
    /** "Journal → Experience / Session 12". */
    destination: string;
    preview: { lines: { text: string; cost: string; rule: string }[]; total: string; balance: string; ledger: string };
  };
  confirm: { label: string; disabled: boolean; reason: string | undefined };
  /** The sentence about permanent Willpower, with this character's own figures. */
  willpowerNote: string;
  /** The session the spending records will be written in, or undefined while none has been started. */
  sessionTitle: string | undefined;
}

const dotsOf = (subject: Subject): number => (subjectMaximum(subject) > 5 ? 10 : 5);

const upgrades = (count: number): string => countLabel(count, 'upgrade', 'upgrades');

function rowOf(character: V20Character, available: number, pending: Pending, subject: Subject): RowView | undefined {
  const state = availability(character, available, pending, subject);
  const rating = subjectRating(character, subject);
  if (state === undefined || rating === undefined) return undefined;
  const label = subjectLabel(character, subject);
  const base = { subject, label, rating, dots: dotsOf(subject) };
  switch (state.state) {
    case 'maximum':
      return { ...base, state: 'maximum', note: 'Maximum rating', action: `${label} is at its maximum` };
    case 'pending': {
      const item = pending.find((candidate) => candidate.subject === subject)!;
      return {
        ...base,
        state: 'pending',
        change: `${item.from} → ${item.to}`,
        cost: `${item.cost} XP`,
        note: 'Pending · not applied',
        action: `Remove ${label} from the review`,
      };
    }
    case 'affordable':
      return {
        ...base,
        state: 'affordable',
        change: `${rating} → ${rating + 1}`,
        cost: `${state.xp} XP`,
        note: '',
        action: `Raise ${label} from ${rating} to ${rating + 1} for ${state.xp} XP`,
      };
    case 'unavailable':
      return {
        ...base,
        state: 'unavailable',
        change: `${rating} → ${rating + 1}`,
        cost: `${state.xp} XP`,
        note: `Unavailable · need ${state.shortfall} XP`,
        action: `${label} from ${rating} to ${rating + 1} is unavailable: ${state.shortfall} XP short`,
      };
  }
}

const rowsOf = (character: V20Character, available: number, pending: Pending, subjects: readonly Subject[]): RowView[] =>
  subjects.flatMap((subject) => rowOf(character, available, pending, subject) ?? []);

const ruleOf = (key: Parameters<typeof costRule>[0]): string => `${costRule(key).rule} XP`;

/** The Disciplines card's rule: what the clan makes each Discipline cost. */
function disciplineRule(character: V20Character): string {
  const clan = CLANS.find((entry) => entry.name.toLowerCase() === character.header.clan.trim().replace(/\s+/g, ' ').toLowerCase());
  const times = (key: Parameters<typeof costRule>[0]): string => costRule(key).rule.replace('Current rating', 'current');
  if (clan === undefined || clan.disciplines.length === 0) {
    const named = character.header.clan.trim() === '' ? 'No clan' : character.header.clan.trim();
    return `${named} · Caitiff cost: ${times('caitiffDiscipline')} XP`;
  }
  return `${clan.name} · in-clan: ${times('inClanDiscipline')} XP · out-of-clan: ${times('outOfClanDiscipline')} XP`;
}

export function levelUpView(character: V20Character, pending: Pending): LevelUpView {
  const { journal } = character;
  const totals = experienceTotals(journal);
  const available = totals.available;
  const session = currentSession(journal);
  const sum = pendingTotals(pending, available);
  const has = sum.count > 0;

  const attributeSubjects = ATTRIBUTE_GROUPS.map((group) => group.traits.map((trait): Subject => `attributes.${trait.key}`));
  const abilitySubjects = ABILITY_GROUPS.map((group) => group.traits.map((trait): Subject => `abilities.${trait.key}`));
  const disciplineSubjects = character.disciplines.map((_, index): Subject => `disciplines.${index}`);
  const virtueSubjects = VIRTUES.map((virtue): Subject => `virtues.${virtue.key}`);
  const row = (subjects: readonly Subject[]): RowView[] => rowsOf(character, available, pending, subjects);

  const groups: GroupView[] = [
    {
      key: 'attributes',
      title: 'Attributes',
      hint: 'One dot at a time · cost uses the current rating',
      cards: ATTRIBUTE_GROUPS.map((group, at) => ({ key: group.key, title: group.label, rule: ruleOf('attribute'), rows: row(attributeSubjects[at]) })),
    },
    {
      key: 'abilities',
      title: 'Abilities',
      hint: `Talents, Skills & Knowledges · new Ability is a flat ${costRule('newAbility').rule} XP`,
      cards: ABILITY_GROUPS.map((group, at) => ({
        key: group.key,
        title: group.label,
        rule: `Existing: ${costRule('ability').rule.replace('Current rating', 'current')} · New: ${costRule('newAbility').rule} XP`,
        rows: row(abilitySubjects[at]),
      })),
    },
    {
      key: 'personal',
      title: 'Disciplines & Personal Traits',
      hint: 'Permanent ratings only',
      cards: [
        { key: 'disciplines', title: 'Disciplines', rule: disciplineRule(character), rows: row(disciplineSubjects) },
        { key: 'virtues', title: 'Virtues', rule: ruleOf('virtue'), rows: row(virtueSubjects) },
        {
          key: 'humanity',
          title: 'Humanity & Willpower',
          rule: `Humanity / Path: ${costRule('humanity').rule.replace('Current rating', 'current')} XP`,
          rows: row(['humanity.rating', 'willpower.permanent']),
        },
      ],
    },
  ];

  let running = 0;
  const lines: ReviewLine[] = pending.map((item) => {
    running += item.cost;
    return {
      subject: item.subject,
      label: item.label,
      cost: `${item.cost} XP`,
      change: `${item.from} → ${item.to}`,
      rating: item.from,
      dots: dotsOf(item.subject),
      rule: item.rule,
      running: `Running total ${running} XP · ${figure(available - running)} XP remaining`,
      action: `Remove ${item.label} from the review`,
    };
  });

  const willpower = character.willpower.permanent;
  const willpowerCost = advancementCost(character, 'willpower.permanent');
  const willpowerNote =
    willpowerCost !== undefined && !willpowerCost.maximum
      ? `Permanent Willpower costs its current rating (${willpowerCost.xp} XP for ${willpower} → ${willpower + 1}). Virtue increases do not automatically raise Humanity or Willpower.`
      : 'Permanent Willpower costs its current rating. Virtue increases do not automatically raise Humanity or Willpower.';

  let reason: string | undefined;
  if (!has) reason = 'Select an advancement to review.';
  else if (session === undefined) reason = 'Start a session first.';
  else if (sum.remaining < 0) reason = `Not enough XP · ${-sum.remaining} more needed.`;

  const afterSpent = totals.spent + sum.total;
  return {
    cards: {
      earned: { label: 'Total earned', value: figure(totals.earned), caption: `Across ${countLabel(journal.sessions.length, 'session', 'sessions')}${has ? ' · unchanged' : ''}` },
      spent: { label: 'Total spent', value: figure(totals.spent), caption: has ? `Applied upgrades only · ${afterSpent} after confirmation` : 'Applied upgrades only' },
      available: { label: 'Available XP', value: figure(available), caption: has ? `Current balance · ${figure(sum.remaining)} after confirmation` : 'Current balance' },
      thisSession: {
        label: 'This session',
        value: figure(totals.thisSession),
        caption: session === undefined ? 'No session yet' : `${session.title} award · already included in earned`,
      },
    },
    available,
    noXp: available <= 0,
    status: `${figure(has ? sum.remaining : available)} XP ${has ? 'left in this review' : 'available'}. Unavailable choices show the additional XP needed.`,
    groups,
    review: {
      lines,
      chip: countLabel(sum.count, 'pending upgrade', 'pending upgrades'),
      count: sum.count,
      summary: [
        { label: 'Current available', value: `${figure(available)} XP` },
        { label: `Pending subtotal · ${upgrades(sum.count)}`, value: sum.total === 0 ? '0 XP' : `−${sum.total} XP` },
        { label: 'After confirmation', value: `${figure(sum.remaining)} XP`, emphasis: true },
        { label: 'Projected total spent', value: `${totals.spent} → ${afterSpent} XP` },
        { label: 'Total earned · unchanged', value: `${totals.earned} XP` },
      ],
      destination: `Journal → Experience / ${session?.title ?? 'no session yet'}`,
      preview: {
        lines: pending.map((item) => ({ text: `${item.label} · ${item.from} → ${item.to}`, cost: `${item.cost} XP`, rule: item.shortRule })),
        total: `${sum.total} XP`,
        balance: `${figure(sum.remaining)} XP`,
        ledger: `Earned ${totals.earned} · Spent ${afterSpent} · Available ${figure(sum.remaining)}`,
      },
    },
    confirm: { label: has ? `Confirm & apply · ${sum.total} XP` : 'Confirm & apply', disabled: reason !== undefined, reason },
    willpowerNote,
    sessionTitle: session?.title,
  };
}

export interface Filter {
  query: string;
  /** Only rows that can be chosen now, or are chosen already. */
  affordableOnly: boolean;
}

/** The groups with the rows that match the search and the filter; a card or group left with none is left out. */
export function filterGroups(groups: readonly GroupView[], filter: Filter): GroupView[] {
  const keep = (row: RowView): boolean =>
    matchesQuery(filter.query, row.label) && (!filter.affordableOnly || row.state === 'affordable' || row.state === 'pending');
  return groups
    .map((group) => ({ ...group, cards: group.cards.map((card) => ({ ...card, rows: card.rows.filter(keep) })).filter((card) => card.rows.length > 0) }))
    .filter((group) => group.cards.length > 0);
}

/** How many rows the groups hold. */
export const rowCount = (groups: readonly GroupView[]): number => groups.reduce((total, group) => total + group.cards.reduce((sum, card) => sum + card.rows.length, 0), 0);

/** What the Experience costs card calls the rows whose name in the cost table is shorter than the rule it states. */
const TABLE_LABELS: Partial<Record<(typeof XP_COSTS)[number]['key'], string>> = { ability: 'Existing Ability', willpower: 'Permanent Willpower' };

/** The table of costs the Experience costs card lists: every row of the cost table, in its order. */
export const costTable = (): { label: string; rule: string }[] =>
  XP_COSTS.map((entry) => ({ label: TABLE_LABELS[entry.key] ?? entry.label, rule: entry.cost.basis === 'flat' ? `${entry.rule} XP` : entry.rule }));
