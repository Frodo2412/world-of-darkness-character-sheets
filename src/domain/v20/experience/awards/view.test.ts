import { describe, expect, test } from 'vitest';
import { blankCharacter, type V20Character } from '../../character';
import { startSession } from '../../journal/sessions';
import { counterStamp } from '../../journal/testing/stamp';
import { awardXp, recordSpending } from '../ledger';
import { costReference, earlierAwards, earlierSpendings, experienceView, LOG_SHOWN, visibleRows } from './view';

interface Ledger {
  character: V20Character;
  stamp: ReturnType<typeof counterStamp>;
}

function ledger(chronicle = 'The Glass City'): Ledger {
  const stamp = counterStamp();
  const character = blankCharacter('abc');
  character.header.chronicle = chronicle;
  return { character, stamp };
}

const session = ({ character, stamp }: Ledger, title: string): void => {
  character.journal = startSession(character.journal, title, stamp);
};
const currentId = ({ character }: Ledger): string => character.journal.sessions.find((entry) => entry.current)!.id;
const award = (l: Ledger, amount: number, note = '', sessionId = currentId(l)): void => {
  l.character.journal = awardXp(l.character.journal, { sessionId, amount, note }, l.stamp);
};
const spend = (l: Ledger, label: string, cost: number, kind = 'Discipline advancement', sessionId = currentId(l)): void => {
  l.character.journal = recordSpending(l.character.journal, sessionId, { label, kind, from: 2, to: 3, cost }, l.stamp);
};

describe('the four figures', () => {
  test('are the ledger sums', () => {
    const l = ledger();
    session(l, 'Session 11');
    const earlier = currentId(l);
    award(l, 4, '', earlier);
    award(l, 4, '', earlier);
    session(l, 'Session 12');
    award(l, 3);
    spend(l, 'Auspex 3', 6);
    spend(l, 'Brawl 2', 2);

    const { cards } = experienceView(l.character);

    expect(cards.earned).toMatchObject({ label: 'Total earned', value: '11', caption: 'Across 2 sessions' });
    expect(cards.spent).toMatchObject({ value: '8', caption: 'On traits and abilities' });
    expect(cards.available).toMatchObject({ value: '3', caption: 'Ready to spend' });
    expect(cards.thisSession).toMatchObject({ value: '3', caption: 'Session 12 award' });
  });

  test('a blank ledger is zeroes, and says there is no session', () => {
    const { cards, recordingIn } = experienceView(ledger().character);

    expect([cards.earned.value, cards.spent.value, cards.available.value, cards.thisSession.value]).toEqual(['0', '0', '0', '0']);
    expect(cards.earned.caption).toBe('Across 0 sessions');
    expect(cards.thisSession.caption).toBe('No session yet');
    expect(recordingIn).toBeUndefined();
  });

  test('overspending reads negative, with a true minus sign, and says so in words', () => {
    const l = ledger();
    session(l, 'Session 1');
    award(l, 5);
    spend(l, 'Presence 3', 7);

    const view = experienceView(l.character);

    expect(view.cards.available).toMatchObject({ value: '−2', caption: 'Overspent' });
    expect(view.overspent).toBe(true);
  });

  test('a correction lowers the figures it touches', () => {
    const l = ledger();
    session(l, 'Session 12');
    award(l, 8);
    award(l, -2, 'Correction');

    const { cards } = experienceView(l.character);

    expect([cards.earned.value, cards.available.value, cards.thisSession.value]).toEqual(['6', '6', '6']);
  });
});

describe('the award log', () => {
  test('lists the newest first, with the session, the chronicle and note, and the amount', () => {
    const l = ledger();
    session(l, 'Session 11');
    award(l, 4, 'Elysium and the stolen frame');
    session(l, 'Session 12');
    award(l, 3, 'The missing portrait');

    const { awards, awardCount } = experienceView(l.character);

    expect(awards.map((row) => [row.session, row.current, row.detail, row.amount, row.caption])).toEqual([
      ['Session 12', true, 'The Glass City · The missing portrait', '+3', 'XP awarded'],
      ['Session 11', false, 'The Glass City · Elysium and the stolen frame', '+4', 'XP awarded'],
    ]);
    expect(awardCount).toBe('2 awards');
  });

  test('a correction shows a true minus sign and says it took points back', () => {
    const l = ledger();
    session(l, 'Session 12');
    award(l, -2, 'Correction');

    expect(experienceView(l.character).awards[0]).toMatchObject({ amount: '−2', caption: 'XP taken back', negative: true });
  });

  test('leaves out what is not there: no chronicle, no note', () => {
    const l = ledger('');
    session(l, 'Session 12');
    award(l, 1, '');
    award(l, 1, 'Note only');

    expect(experienceView(l.character).awards.map((row) => row.detail)).toEqual(['Note only', '']);
  });

  test('counts one award in the singular', () => {
    const l = ledger();
    session(l, 'Session 12');
    award(l, 1);

    expect(experienceView(l.character).awardCount).toBe('1 award');
  });
});

describe('the spending record', () => {
  test('lists the newest first with session, kind and cost, and counts entries and points', () => {
    const l = ledger();
    session(l, 'Session 8');
    spend(l, 'Presence 3', 10);
    session(l, 'Session 10');
    spend(l, 'Auspex 3', 10);

    const { spendings, spendingCount } = experienceView(l.character);

    expect(spendings.map((row) => [row.label, row.detail, row.cost])).toEqual([
      ['Auspex 3', 'Session 10 · Discipline advancement', '−10'],
      ['Presence 3', 'Session 8 · Discipline advancement', '−10'],
    ]);
    expect(spendingCount).toBe('2 entries · 20 XP');
  });

  test('an empty record counts nothing', () => {
    expect(experienceView(ledger().character).spendingCount).toBe('0 entries · 0 XP');
  });
});

describe('cutting a log', () => {
  const rows = Array.from({ length: 5 }, (_, at) => at);

  test('shows the first four unless all are asked for', () => {
    expect(visibleRows(rows, false)).toEqual([0, 1, 2, 3]);
    expect(visibleRows(rows, true)).toEqual(rows);
    expect(LOG_SHOWN).toBe(4);
  });

  test('a log of four or fewer is never cut', () => {
    expect(visibleRows([1, 2, 3, 4], false)).toHaveLength(4);
  });

  test('the footer counts what is left out', () => {
    const l = ledger();
    session(l, 'Session 12');
    for (const amount of [1, 2, 3, 4, 5, 6]) award(l, amount);
    for (const cost of [3, 4, 5, 6, 7]) spend(l, `T${cost}`, cost);
    const view = experienceView(l.character);

    // Newest first: 6, 5, 4, 3 are shown; 2 and 1 are left out.
    expect(earlierAwards(view.awards)).toBe('2 earlier awards · 3 XP');
    // Newest first: 7, 6, 5, 4 are shown; 3 is left out.
    expect(earlierSpendings(view.spendings)).toBe('1 earlier entry · 3 XP');
  });
});

describe('the cost reference', () => {
  test('lists the costs the frame lists, in its words', () => {
    expect(costReference()).toEqual([
      { label: 'New Ability', rule: '3 XP' },
      { label: 'Ability increase', rule: 'current × 2' },
      { label: 'In-clan Discipline', rule: 'current × 5' },
      { label: 'Out-of-clan Discipline', rule: 'current × 7' },
      { label: 'Attribute', rule: 'current × 4' },
      { label: 'Humanity / Path', rule: 'current × 2' },
      { label: 'Virtue', rule: 'current × 2' },
      { label: 'Willpower (perm.)', rule: 'current' },
    ]);
  });
});
