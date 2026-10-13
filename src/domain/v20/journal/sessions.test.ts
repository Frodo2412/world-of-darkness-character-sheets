import { describe, expect, test } from 'vitest';
import { currentSession, makeCurrent, renameSession, startSession } from './sessions';
import { counterStamp, seededRandom } from './testing/stamp';
import { blankJournal, type Journal } from './types';

const started = (...titles: string[]): Journal => {
  const stamp = counterStamp();
  return titles.reduce((journal, title) => startSession(journal, title, stamp), blankJournal());
};

const currentCount = (journal: Journal): number => journal.sessions.filter((session) => session.current).length;

describe('startSession', () => {
  test('the first session is the current one', () => {
    const journal = started('Prologue');

    expect(journal.sessions).toEqual([{ id: 'id-1', title: 'Prologue', summary: '', current: true }]);
    expect(currentSession(journal)).toMatchObject({ title: 'Prologue' });
  });

  test('a second session becomes current and the first is not', () => {
    const journal = started('Prologue', 'The Elysium');

    expect(journal.sessions.map((session) => [session.title, session.current])).toEqual([
      ['Prologue', false],
      ['The Elysium', true],
    ]);
  });

  test.each(['', '   ', '\t\n'])('a blank title %j becomes "Session N" for its place', (blank) => {
    const journal = started('Prologue', blank);

    expect(journal.sessions[1].title).toBe('Session 2');
  });

  test('a title is stored without its surrounding blanks', () => {
    expect(started('  Night one ').sessions[0].title).toBe('Night one');
  });

  test('does not change the journal it was given', () => {
    const before = started('Prologue');
    const snapshot = structuredClone(before);

    startSession(before, 'Next', counterStamp());

    expect(before).toEqual(snapshot);
  });

  test('keeps notes and experience as they were', () => {
    const journal = { ...started('One'), notes: [], xp: { awards: [], spendings: [] } };

    expect(startSession(journal, 'Two', counterStamp()).xp).toBe(journal.xp);
  });

  test('gives every session its own id', () => {
    const ids = started('a', 'b', 'c', 'd').sessions.map((session) => session.id);

    expect(new Set(ids).size).toBe(4);
  });
});

describe('currentSession', () => {
  test('is undefined while there are no sessions', () => {
    expect(currentSession(blankJournal())).toBeUndefined();
  });
});

describe('makeCurrent', () => {
  test('swaps the current session to an earlier one', () => {
    const journal = makeCurrent(started('One', 'Two', 'Three'), 'id-1');

    expect(journal.sessions.map((session) => session.current)).toEqual([true, false, false]);
  });

  test('a session that is not there changes nothing', () => {
    const journal = started('One', 'Two');

    expect(makeCurrent(journal, 'nope')).toBe(journal);
  });
});

describe('renameSession', () => {
  test('changes only the named session', () => {
    const journal = renameSession(started('One', 'Two'), 'id-1', 'Prologue');

    expect(journal.sessions.map((session) => session.title)).toEqual(['Prologue', 'Two']);
  });

  test('a blank title becomes "Session N" for its place', () => {
    expect(renameSession(started('One', 'Two'), 'id-2', '  ').sessions[1].title).toBe('Session 2');
  });

  test('does not change which session is current', () => {
    expect(renameSession(started('One', 'Two'), 'id-1', 'Prologue').sessions.map((s) => s.current)).toEqual([
      false,
      true,
    ]);
  });

  test('a session that is not there changes nothing', () => {
    const journal = started('One');

    expect(renameSession(journal, 'nope', 'x').sessions).toEqual(journal.sessions);
  });
});

describe('after any sequence of starts and swaps', () => {
  test.each([1, 2, 3, 4, 5])('exactly one session is current and ids stay unique (seed %i)', (seed) => {
    const random = seededRandom(seed);
    const stamp = counterStamp();
    let journal = blankJournal();

    for (let step = 0; step < 60; step += 1) {
      const pick = random();
      if (journal.sessions.length === 0 || pick < 0.4) {
        journal = startSession(journal, pick < 0.1 ? '' : `Night ${step}`, stamp);
      } else {
        const target = journal.sessions[Math.floor(random() * journal.sessions.length)];
        journal = pick < 0.7 ? makeCurrent(journal, target.id) : renameSession(journal, target.id, `Renamed ${step}`);
      }
      expect(currentCount(journal)).toBe(1);
    }
    expect(new Set(journal.sessions.map((session) => session.id)).size).toBe(journal.sessions.length);
  });
});
