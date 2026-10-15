import { describe, expect, test } from 'vitest';
import { makeCurrent, renameSession, startSession } from './sessions';
import { SESSIONS_SHOWN, sessionChange, sessionsView, visibleSessions } from './sessionView';
import { counterStamp } from './testing/stamp';
import { blankJournal, type Journal } from './types';

/** One stamp for the whole file's journals would repeat ids across them, so each journal and what is later added to it share one. */
const stamps = new WeakMap<Journal, ReturnType<typeof counterStamp>>();

function journalWith(...titles: string[]): Journal {
  const stamp = counterStamp();
  const journal = titles.reduce((made, title) => startSession(made, title, stamp), blankJournal());
  stamps.set(journal, stamp);
  return journal;
}

describe('sessionsView', () => {
  test('lists the sessions newest first and marks the current one', () => {
    const view = sessionsView(journalWith('Session 10', 'Session 11', 'Session 12'));

    expect(view.rows.map((row) => [row.title, row.current])).toEqual([
      ['Session 12', true],
      ['Session 11', false],
      ['Session 10', false],
    ]);
  });

  test('counts the sessions in words', () => {
    expect(sessionsView(blankJournal()).count).toBe('0 sessions');
    expect(sessionsView(journalWith('One')).count).toBe('1 session');
    expect(sessionsView(journalWith('One', 'Two')).count).toBe('2 sessions');
  });

  test('says what starting a session will do to the current one', () => {
    expect(sessionsView(journalWith('Session 11')).explanation).toContain('Session 11 stops being current');
  });

  test('says where notes go while there is no session', () => {
    expect(sessionsView(blankJournal()).explanation).toMatch(/first session you start becomes the current one/);
  });

  test('follows the session made current', () => {
    const journal = journalWith('A', 'B');
    const earlier = makeCurrent(journal, journal.sessions[0].id);

    expect(sessionsView(earlier).rows.find((row) => row.current)?.title).toBe('A');
    expect(sessionsView(earlier).explanation).toContain('A stops being current');
  });
});

describe('visibleSessions', () => {
  const many = (): ReturnType<typeof sessionsView>['rows'] =>
    sessionsView(journalWith(...Array.from({ length: 8 }, (_, at) => `Session ${at + 1}`))).rows;

  test('shows the newest few and offers the rest', () => {
    expect(visibleSessions(many(), false)).toHaveLength(SESSIONS_SHOWN);
    expect(visibleSessions(many(), true)).toHaveLength(8);
  });

  test('shows a short list whole', () => {
    expect(visibleSessions(sessionsView(journalWith('A', 'B')).rows, false)).toHaveLength(2);
  });

  test('keeps the current session in view when it is an old one', () => {
    const journal = journalWith(...Array.from({ length: 8 }, (_, at) => `Session ${at + 1}`));
    const rows = sessionsView(makeCurrent(journal, journal.sessions[0].id)).rows;

    const shown = visibleSessions(rows, false);

    expect(shown).toHaveLength(SESSIONS_SHOWN + 1);
    expect(shown.at(-1)).toMatchObject({ title: 'Session 1', current: true });
  });
});

describe('sessionChange', () => {
  test('says the new session is current and the old one is not', () => {
    const before = journalWith('Session 11');
    const after = startSession(before, 'Session 12', stamps.get(before)!);

    expect(sessionChange(before, after)).toBe('Session 12 is now the current session. Session 11 stops being current.');
  });

  test('says only the new one is current for a first session', () => {
    expect(sessionChange(blankJournal(), journalWith('Session 1'))).toBe('Session 1 is now the current session.');
  });

  test('says nothing when the current session is the same, as after a rename', () => {
    const before = journalWith('Session 11');

    expect(sessionChange(before, renameSession(before, before.sessions[0].id, 'The portrait'))).toBeUndefined();
  });

  test('says nothing when there is no session', () => {
    expect(sessionChange(blankJournal(), blankJournal())).toBeUndefined();
  });
});
