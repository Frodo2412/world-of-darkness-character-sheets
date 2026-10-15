// What the Journal's Experience section shows, from the character alone: four figures, the award log
// and the spending record. Computed on every draw, never stored.

import type { V20Character } from '../../character';
import { countLabel } from '../../labels';
import { currentSession } from '../../journal/sessions';
import type { Journal } from '../../journal/types';
import { experienceTotals } from '../ledger';
import { XP_COSTS, type XpCost } from '../costs';
import { figure, signedFigure } from './validate';

export interface XpCard {
  label: string;
  value: string;
  caption: string;
}

export interface AwardRow {
  id: string;
  session: string;
  /** Earned in the session that is current now. */
  current: boolean;
  /** "The Glass City · The missing portrait": the chronicle and the note, whichever are given. */
  detail: string;
  /** "+3", "−2". */
  amount: string;
  /** "XP awarded" or, for a correction, "XP taken back". */
  caption: string;
  negative: boolean;
}

export interface SpendingRow {
  id: string;
  label: string;
  /** "Session 10 · Discipline advancement". */
  detail: string;
  /** "−10". */
  cost: string;
}

export interface ExperienceView {
  cards: { earned: XpCard; spent: XpCard; available: XpCard; thisSession: XpCard };
  /** Whether Available is below zero: more has been spent than earned. */
  overspent: boolean;
  /** Newest first: the ledger keeps awards in the order they were made. */
  awards: AwardRow[];
  /** "3 awards". */
  awardCount: string;
  spendings: SpendingRow[];
  /** "2 entries · 20 XP". */
  spendingCount: string;
  /** The session new awards go to, or undefined while none has been started. */
  recordingIn: string | undefined;
}

/** How many rows a log shows before "Show all". */
export const LOG_SHOWN = 4;

const sessionTitle = (journal: Journal, id: string): string => journal.sessions.find((session) => session.id === id)?.title ?? 'Session';

const joined = (...parts: string[]): string => parts.map((part) => part.trim()).filter((part) => part !== '').join(' · ');

export function experienceView(character: V20Character): ExperienceView {
  const { journal } = character;
  const totals = experienceTotals(journal);
  const current = currentSession(journal);
  const chronicle = character.header.chronicle;
  const overspent = totals.available < 0;
  const awards: AwardRow[] = [...journal.xp.awards].reverse().map((award) => ({
    id: award.id,
    session: sessionTitle(journal, award.sessionId),
    current: current !== undefined && award.sessionId === current.id,
    detail: joined(chronicle, award.note),
    amount: signedFigure(award.amount),
    caption: award.amount < 0 ? 'XP taken back' : 'XP awarded',
    negative: award.amount < 0,
  }));
  const spendings: SpendingRow[] = [...journal.xp.spendings].reverse().map((spending) => ({
    id: spending.id,
    label: spending.label,
    detail: joined(sessionTitle(journal, spending.sessionId), spending.kind),
    cost: figure(-spending.cost),
  }));
  return {
    cards: {
      earned: { label: 'Total earned', value: figure(totals.earned), caption: `Across ${countLabel(journal.sessions.length, 'session', 'sessions')}` },
      spent: { label: 'Total spent', value: figure(totals.spent), caption: 'On traits and abilities' },
      available: { label: 'Available', value: figure(totals.available), caption: overspent ? 'Overspent' : 'Ready to spend' },
      thisSession: {
        label: 'This session',
        value: figure(totals.thisSession),
        caption: current === undefined ? 'No session yet' : `${current.title} award`,
      },
    },
    overspent,
    awards,
    awardCount: countLabel(awards.length, 'award', 'awards'),
    spendings,
    spendingCount: `${countLabel(spendings.length, 'entry', 'entries')} · ${totals.spent} XP`,
    recordingIn: current?.title,
  };
}

/** The first rows of a log, or all of them when asked for. A log of four or fewer is never cut. */
export const visibleRows = <T>(rows: readonly T[], all: boolean, limit = LOG_SHOWN): T[] => (all ? [...rows] : rows.slice(0, limit));

/** What the footer of a cut award log says about the rows it leaves out: "1 earlier award · 3 XP". */
export function earlierAwards(awards: readonly AwardRow[], limit = LOG_SHOWN): string {
  const left = awards.slice(limit);
  const points = left.reduce((total, row) => total + Number(row.amount.replace('−', '-')), 0);
  return `${countLabel(left.length, 'earlier award', 'earlier awards')} · ${figure(points)} XP`;
}

/** What the footer of a cut spending record says about the rows it leaves out: "2 earlier entries · 12 XP". */
export function earlierSpendings(spendings: readonly SpendingRow[], limit = LOG_SHOWN): string {
  const left = spendings.slice(limit);
  const points = left.reduce((total, row) => total + Math.abs(Number(row.cost.replace('−', '-'))), 0);
  return `${countLabel(left.length, 'earlier entry', 'earlier entries')} · ${points} XP`;
}

export interface ReferenceRow {
  label: string;
  rule: string;
}

/** The costs the Journal's quick reference lists, in the frame's words. A Caitiff Discipline is priced where a Discipline is raised. */
const REFERENCE: readonly { key: XpCost['key']; label: string }[] = [
  { key: 'newAbility', label: 'New Ability' },
  { key: 'ability', label: 'Ability increase' },
  { key: 'inClanDiscipline', label: 'In-clan Discipline' },
  { key: 'outOfClanDiscipline', label: 'Out-of-clan Discipline' },
  { key: 'attribute', label: 'Attribute' },
  { key: 'humanity', label: 'Humanity / Path' },
  { key: 'virtue', label: 'Virtue' },
  { key: 'willpower', label: 'Willpower (perm.)' },
];

/** "3 XP" for a fixed cost, "current × 2" for one that follows the trait's rating. */
function ruleWords(entry: XpCost): string {
  return entry.cost.basis === 'flat' ? `${entry.cost.xp} XP` : entry.rule.replace('Current rating', 'current');
}

export function costReference(): ReferenceRow[] {
  return REFERENCE.map(({ key, label }) => ({ label, rule: ruleWords(XP_COSTS.find((entry) => entry.key === key)!) }));
}
