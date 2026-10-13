import { describe, expect, test } from 'vitest';
import { makeCurrent, startSession } from '../journal/sessions';
import { counterStamp, seededRandom } from '../journal/testing/stamp';
import { blankJournal, type Journal } from '../journal/types';
import { awardXp, experienceTotals, recordSpending, removeSpendings, type SpendingEntry } from './ledger';

const stamp = counterStamp();
const brawl: SpendingEntry = { label: 'Brawl', kind: 'ability', from: 1, to: 2, cost: 2 };
const withSession = (): Journal => startSession(blankJournal(), 'Prologue', stamp);
const sessionOf = (journal: Journal): string => journal.sessions.find((session) => session.current)!.id;

describe('experienceTotals', () => {
  test('an empty ledger is all zero', () => {
    expect(experienceTotals(blankJournal())).toEqual({ earned: 0, spent: 0, available: 0, thisSession: 0 });
  });

  test('sums awards and spendings', () => {
    let journal = withSession();
    const session = sessionOf(journal);
    journal = awardXp(journal, { sessionId: session, amount: 3, note: 'Good play' }, stamp);
    journal = awardXp(journal, { sessionId: session, amount: 5, note: 'Finale' }, stamp);
    journal = recordSpending(journal, session, brawl, stamp);

    expect(experienceTotals(journal)).toEqual({ earned: 8, spent: 2, available: 6, thisSession: 8 });
  });

  test('a negative award subtracts', () => {
    let journal = withSession();
    journal = awardXp(journal, { sessionId: sessionOf(journal), amount: 5, note: '' }, stamp);
    journal = awardXp(journal, { sessionId: sessionOf(journal), amount: -2, note: 'Correction' }, stamp);

    expect(experienceTotals(journal)).toMatchObject({ earned: 3, available: 3 });
  });

  test('this session counts only the current session', () => {
    let journal = withSession();
    journal = awardXp(journal, { sessionId: sessionOf(journal), amount: 4, note: '' }, stamp);
    journal = startSession(journal, 'Second', stamp);
    journal = awardXp(journal, { sessionId: sessionOf(journal), amount: 1, note: '' }, stamp);

    expect(experienceTotals(journal)).toMatchObject({ earned: 5, thisSession: 1 });
    expect(experienceTotals(makeCurrent(journal, journal.sessions[0].id))).toMatchObject({ thisSession: 4 });
  });

  test('available goes negative and is reported as such', () => {
    let journal = withSession();
    journal = awardXp(journal, { sessionId: sessionOf(journal), amount: 1, note: '' }, stamp);
    journal = recordSpending(journal, sessionOf(journal), { ...brawl, cost: 4 }, stamp);

    expect(experienceTotals(journal).available).toBe(-3);
  });

  test('records for a session that no longer exists still count', () => {
    let journal = awardXp(blankJournal(), { sessionId: 'gone', amount: 6, note: '' }, stamp);
    journal = recordSpending(journal, 'gone', brawl, stamp);

    expect(experienceTotals(journal)).toEqual({ earned: 6, spent: 2, available: 4, thisSession: 0 });
  });
});

describe('awardXp and recordSpending', () => {
  test('append records with their session, a new id and the entry', () => {
    let journal = withSession();
    const session = sessionOf(journal);
    journal = awardXp(journal, { sessionId: session, amount: 3, note: 'Good play' }, stamp);
    journal = recordSpending(journal, session, brawl, stamp);

    expect(journal.xp.awards).toEqual([{ id: expect.any(String), sessionId: session, amount: 3, note: 'Good play' }]);
    expect(journal.xp.spendings).toEqual([{ ...brawl, id: expect.any(String), sessionId: session }]);
    expect(journal.xp.awards[0].id).not.toBe(journal.xp.spendings[0].id);
  });

  test('do not change the journal they were given', () => {
    const before = withSession();
    const snapshot = structuredClone(before);

    awardXp(before, { sessionId: sessionOf(before), amount: 3, note: '' }, stamp);
    recordSpending(before, sessionOf(before), brawl, stamp);

    expect(before).toEqual(snapshot);
  });
});

describe('removeSpendings', () => {
  test('removes exactly the spendings with the ids given', () => {
    let journal = withSession();
    for (const label of ['A', 'B', 'C']) journal = recordSpending(journal, sessionOf(journal), { ...brawl, label }, stamp);
    const [first, second, third] = journal.xp.spendings;

    const after = removeSpendings(journal, [first.id, third.id]);

    expect(after.xp.spendings).toEqual([second]);
  });

  test('an id that is not there changes nothing', () => {
    const journal = recordSpending(withSession(), 'x', brawl, stamp);

    expect(removeSpendings(journal, ['nope']).xp.spendings).toEqual(journal.xp.spendings);
  });

  test('leaves awards alone', () => {
    const journal = awardXp(withSession(), { sessionId: 'x', amount: 3, note: '' }, stamp);

    expect(removeSpendings(journal, ['any']).xp.awards).toEqual(journal.xp.awards);
  });
});

describe('over random ledgers', () => {
  function randomLedger(random: () => number): Journal {
    let journal = withSession();
    const count = Math.floor(random() * 25);
    for (let step = 0; step < count; step += 1) {
      const pick = random();
      if (pick < 0.15) journal = startSession(journal, '', stamp);
      else if (pick < 0.6) journal = awardXp(journal, { sessionId: sessionOf(journal), amount: Math.floor(random() * 21) - 5, note: '' }, stamp);
      else journal = recordSpending(journal, sessionOf(journal), { ...brawl, cost: Math.floor(random() * 15) }, stamp);
    }
    return journal;
  }

  test.each([1, 2, 3, 4, 5, 6, 7, 8])('earned less spent is available (seed %i)', (seed) => {
    const journal = randomLedger(seededRandom(seed));
    const { earned, spent, available } = experienceTotals(journal);

    expect(available).toBe(earned - spent);
    expect(earned).toBe(journal.xp.awards.reduce((total, award) => total + award.amount, 0));
    expect(spent).toBe(journal.xp.spendings.reduce((total, spending) => total + spending.cost, 0));
  });

  test.each([1, 2, 3, 4, 5, 6, 7, 8])('removing exactly the spendings added restores the ledger (seed %i)', (seed) => {
    const random = seededRandom(seed);
    const before = randomLedger(random);
    let after = before;
    for (let step = 0; step < 1 + Math.floor(random() * 5); step += 1) {
      after = recordSpending(after, sessionOf(after), { ...brawl, cost: Math.floor(random() * 15) }, stamp);
    }
    const added = after.xp.spendings.slice(before.xp.spendings.length).map((spending) => spending.id);

    const restored = removeSpendings(after, added);

    expect(restored.xp).toEqual(before.xp);
    expect(experienceTotals(restored)).toEqual(experienceTotals(before));
  });
});
