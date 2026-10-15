// What the Journal's session list shows and says, from the journal alone. Computed on every draw.

import { countLabel } from '../labels';
import { currentSession } from './sessions';
import type { Journal, Session } from './types';

export interface SessionRow {
  id: string;
  title: string;
  current: boolean;
}

export interface SessionsView {
  /** Newest first, the way the notes sidebar lists them. */
  rows: SessionRow[];
  /** "2 sessions". */
  count: string;
  /** What starting a session will do, said before the player does it. */
  explanation: string;
}

/** How many sessions the list shows before "Show all". */
export const SESSIONS_SHOWN = 5;

export function sessionsView(journal: Journal): SessionsView {
  const current = currentSession(journal);
  return {
    rows: [...journal.sessions].reverse().map(({ id, title, current: isCurrent }) => ({ id, title, current: isCurrent })),
    count: countLabel(journal.sessions.length, 'session', 'sessions'),
    explanation:
      current === undefined
        ? 'Notes and experience are recorded in the current session. The first session you start becomes the current one.'
        : `Starting a session makes it the current one. ${current.title} stops being current; its notes and experience stay with it.`,
  };
}

/** The rows the list shows: the newest few, and the current session wherever it stands, unless all are asked for. */
export function visibleSessions(rows: readonly SessionRow[], all: boolean, limit = SESSIONS_SHOWN): SessionRow[] {
  if (all || rows.length <= limit) return [...rows];
  return rows.filter((row, index) => index < limit || row.current);
}

const nameOf = (session: Session | undefined): string | undefined => session?.title;

/** What the player is told when the current session changed, or undefined when it did not. */
export function sessionChange(before: Journal, after: Journal): string | undefined {
  const was = currentSession(before);
  const now = currentSession(after);
  if (now === undefined || now.id === was?.id) return undefined;
  const became = `${nameOf(now)} is now the current session.`;
  return was === undefined ? became : `${became} ${nameOf(was)} stops being current.`;
}
