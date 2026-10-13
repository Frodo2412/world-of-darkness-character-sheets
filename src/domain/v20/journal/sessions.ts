// Sessions of the journal. Exactly one is current once any exist; every
// function here returns a new journal and leaves the one it was given.

import type { Stamp } from './stamp';
import type { Journal, Session } from './types';

/** The session notes and experience are recorded in, or undefined while none has been started. */
export function currentSession(journal: Journal): Session | undefined {
  return journal.sessions.find((session) => session.current);
}

/** The sessions with `id` marked current and every other one not. */
function withCurrent(sessions: readonly Session[], id: string): Session[] {
  return sessions.map((session) => ({ ...session, current: session.id === id }));
}

/** What a session is called when its title is left blank: its place in the list. */
const titled = (title: string, position: number): string => title.trim() || `Session ${position}`;

/** Starts a session and makes it the only current one. */
export function startSession(journal: Journal, title: string, stamp: Stamp): Journal {
  const id = stamp.newId();
  const started: Session = { id, title: titled(title, journal.sessions.length + 1), summary: '', current: false };
  return { ...journal, sessions: withCurrent([...journal.sessions, started], id) };
}

/** Renames a session; a blank title becomes "Session N" for its place in the list. A session that is not there changes nothing. */
export function renameSession(journal: Journal, id: string, title: string): Journal {
  return {
    ...journal,
    sessions: journal.sessions.map((session, index) =>
      session.id === id ? { ...session, title: titled(title, index + 1) } : session,
    ),
  };
}

/** Makes an earlier session the current one. A session that is not there changes nothing. */
export function makeCurrent(journal: Journal, id: string): Journal {
  if (!journal.sessions.some((session) => session.id === id)) return journal;
  return { ...journal, sessions: withCurrent(journal.sessions, id) };
}
