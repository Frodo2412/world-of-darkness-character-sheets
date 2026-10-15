import { describe, expect, test } from 'vitest';
import { blankCharacter, type V20Character } from '../character';
import { awardXp, recordSpending } from '../experience/ledger';
import { startSession } from '../journal/sessions';
import { counterStamp } from '../journal/testing/stamp';
import { addPending, type Pending } from './pending';
import { costTable, filterGroups, levelUpView, rowCount, type CardView, type RowView } from './view';

function toreador(xp = 8, change: (character: V20Character) => void = () => {}): V20Character {
  const stamp = counterStamp();
  const character = blankCharacter('abc');
  character.header.clan = 'Toreador';
  character.abilities.stealth = 2;
  character.abilities.melee = 0;
  character.attributes.strength = 2;
  character.virtues.conscience = 3;
  character.virtues.courage = 5;
  character.humanity.rating = 7;
  character.willpower.permanent = 6;
  character.disciplines[0] = { name: 'Presence', rating: 3 };
  character.disciplines[1] = { name: 'Auspex', rating: 0 };
  character.journal = startSession(character.journal, 'Session 12', stamp);
  character.journal = awardXp(character.journal, { sessionId: character.journal.sessions[0].id, amount: xp, note: '' }, stamp);
  change(character);
  return character;
}

const rowFor = (character: V20Character, pending: Pending, label: string): RowView => {
  const view = levelUpView(character, pending);
  const found = view.groups.flatMap((group) => group.cards).flatMap((card: CardView) => card.rows).find((row) => row.label === label);
  if (found === undefined) throw new Error(`no row for ${label}`);
  return found;
};

describe('the rows', () => {
  test('say what the next dot costs', () => {
    const made = toreador(30);

    expect(rowFor(made, [], 'Stealth')).toMatchObject({ state: 'affordable', change: '2 → 3', cost: '4 XP', note: '', action: 'Raise Stealth from 2 to 3 for 4 XP' });
    expect(rowFor(made, [], 'Melee')).toMatchObject({ change: '0 → 1', cost: '3 XP' });
    expect(rowFor(made, [], 'Presence')).toMatchObject({ change: '3 → 4', cost: '15 XP' });
    expect(rowFor(made, [], 'Humanity')).toMatchObject({ change: '7 → 8', cost: '14 XP', dots: 10 });
    expect(rowFor(made, [], 'Willpower (perm.)')).toMatchObject({ change: '6 → 7', cost: '6 XP' });
    expect(rowFor(made, [], 'Conscience')).toMatchObject({ change: '3 → 4', cost: '6 XP', dots: 5 });
  });

  test('say how much is missing when it cannot be afforded', () => {
    expect(rowFor(toreador(7), [], 'Strength')).toMatchObject({ state: 'unavailable', note: 'Unavailable · need 1 XP' });
    expect(rowFor(toreador(8), [], 'Strength')).toMatchObject({ state: 'affordable', cost: '8 XP' });
  });

  test('say Maximum for a trait that cannot go higher', () => {
    expect(rowFor(toreador(), [], 'Courage')).toMatchObject({ state: 'maximum', note: 'Maximum rating' });
  });

  test('a chosen trait is pending, with the choice\'s own change and cost', () => {
    const made = toreador();
    const pending = addPending(made, 8, [], 'abilities.stealth');

    expect(rowFor(made, pending, 'Stealth')).toMatchObject({ state: 'pending', note: 'Pending · not applied', change: '2 → 3', cost: '4 XP', action: 'Remove Stealth from the review' });
  });

  test('later rows are judged against the balance left after the choices', () => {
    const made = toreador();
    const pending = addPending(made, 8, [], 'abilities.stealth');

    expect(rowFor(made, pending, 'Strength')).toMatchObject({ state: 'unavailable', note: 'Unavailable · need 4 XP' });
  });

  test('only Disciplines the character holds are offered, and no Backgrounds', () => {
    const view = levelUpView(toreador(), []);
    const labels = view.groups.flatMap((group) => group.cards).flatMap((card) => card.rows).map((row) => row.label);

    expect(labels).toContain('Presence');
    expect(labels).not.toContain('Auspex');
    expect(view.groups.map((group) => group.title)).toEqual(['Attributes', 'Abilities', 'Disciplines & Personal Traits']);
  });

  test('every attribute and ability is offered, in the sheet\'s groups', () => {
    const view = levelUpView(toreador(), []);

    expect(view.groups[0].cards.map((card) => [card.title, card.rows.length])).toEqual([['Physical', 3], ['Social', 3], ['Mental', 3]]);
    expect(view.groups[1].cards.map((card) => [card.title, card.rows.length])).toEqual([['Talents', 10], ['Skills', 10], ['Knowledges', 10]]);
  });

  test('each card states its rule', () => {
    const view = levelUpView(toreador(), []);

    expect(view.groups[0].cards[0].rule).toBe('Current rating × 4 XP');
    expect(view.groups[1].cards[0].rule).toBe('Existing: current × 2 · New: 3 XP');
    expect(view.groups[2].cards[0].rule).toBe('Toreador · in-clan: current × 5 XP · out-of-clan: current × 7 XP');
    expect(view.groups[2].cards[1].rule).toBe('Current rating × 2 XP');
    expect(view.groups[2].cards[2].rule).toBe('Humanity / Path: current × 2 XP');
  });

  test('a clan that is not one of the thirteen is Caitiff for Disciplines', () => {
    expect(levelUpView(toreador(8, (c) => void (c.header.clan = 'Self-made')), []).groups[2].cards[0].rule).toBe('Self-made · Caitiff cost: current × 6 XP');
    expect(levelUpView(toreador(8, (c) => void (c.header.clan = '')), []).groups[2].cards[0].rule).toBe('No clan · Caitiff cost: current × 6 XP');
  });
});

describe('the figures', () => {
  test('are the ledger as it stands, and say so', () => {
    const made = toreador(8, (c) => {
      c.journal = recordSpending(c.journal, c.journal.sessions[0].id, { label: 'Auspex 3', kind: 'Discipline advancement', from: 2, to: 3, cost: 3 }, counterStamp());
    });
    const { cards } = levelUpView(made, []);

    expect(cards.earned).toMatchObject({ value: '8', caption: 'Across 1 session' });
    expect(cards.spent).toMatchObject({ value: '3', caption: 'Applied upgrades only' });
    expect(cards.available).toMatchObject({ label: 'Available XP', value: '5', caption: 'Current balance' });
    expect(cards.thisSession).toMatchObject({ value: '8', caption: 'Session 12 award · already included in earned' });
  });

  test('with choices made, say what they would make of them', () => {
    const made = toreador(8);
    const pending = addPending(made, 8, [], 'abilities.stealth');
    const { cards, status } = levelUpView(made, pending);

    expect(cards.spent.caption).toBe('Applied upgrades only · 4 after confirmation');
    expect(cards.available.caption).toBe('Current balance · 4 after confirmation');
    expect(cards.earned.caption).toBe('Across 1 session · unchanged');
    expect(status).toBe('4 XP left in this review. Unavailable choices show the additional XP needed.');
  });

  test('with no XP, say so', () => {
    expect(levelUpView(toreador(0), []).noXp).toBe(true);
    expect(levelUpView(toreador(1), []).noXp).toBe(false);
    expect(levelUpView(blankCharacter('abc'), []).noXp).toBe(true);
  });
});

describe('the review', () => {
  test('lists each choice with its working and a running total', () => {
    const made = toreador(10);
    const pending = addPending(made, 10, addPending(made, 10, [], 'abilities.stealth'), 'abilities.melee');
    const { review } = levelUpView(made, pending);

    expect(review.lines.map((line) => [line.label, line.cost, line.change, line.rule, line.running])).toEqual([
      ['Stealth', '4 XP', '2 → 3', 'Existing Ability · current 2 × 2 = 4 XP', 'Running total 4 XP · 6 XP remaining'],
      ['Melee', '3 XP', '0 → 1', 'New Ability · flat cost = 3 XP', 'Running total 7 XP · 3 XP remaining'],
    ]);
    expect(review.chip).toBe('2 pending upgrades');
    expect(review.summary).toEqual([
      { label: 'Current available', value: '10 XP' },
      { label: 'Pending subtotal · 2 upgrades', value: '−7 XP' },
      { label: 'After confirmation', value: '3 XP', emphasis: true },
      { label: 'Projected total spent', value: '0 → 7 XP' },
      { label: 'Total earned · unchanged', value: '10 XP' },
    ]);
    expect(review.preview).toEqual({
      lines: [
        { text: 'Stealth · 2 → 3', cost: '4 XP', rule: 'Existing Ability · 2 × 2' },
        { text: 'Melee · 0 → 1', cost: '3 XP', rule: 'New Ability · flat cost' },
      ],
      total: '7 XP',
      balance: '3 XP',
      ledger: 'Earned 10 · Spent 7 · Available 3',
    });
    expect(review.destination).toBe('Journal → Experience / Session 12');
  });

  test('says one upgrade in the singular, and nothing when none is chosen', () => {
    const made = toreador();

    expect(levelUpView(made, addPending(made, 8, [], 'abilities.stealth')).review.chip).toBe('1 pending upgrade');
    expect(levelUpView(made, []).review.chip).toBe('0 pending upgrades');
    expect(levelUpView(made, []).review.summary[1]).toEqual({ label: 'Pending subtotal · 0 upgrades', value: '0 XP' });
  });
});

describe('confirming', () => {
  test('is disabled with nothing chosen, and says to select an advancement', () => {
    expect(levelUpView(toreador(), []).confirm).toEqual({ label: 'Confirm & apply', disabled: true, reason: 'Select an advancement to review.' });
  });

  test('is enabled with a choice and a session, and names the cost', () => {
    const made = toreador();

    expect(levelUpView(made, addPending(made, 8, [], 'abilities.stealth')).confirm).toEqual({ label: 'Confirm & apply · 4 XP', disabled: false, reason: undefined });
  });

  test('is disabled with no session, whatever is chosen', () => {
    const made = toreador();
    const pending = addPending(made, 8, [], 'abilities.stealth');
    const without = { ...made, journal: { ...made.journal, sessions: [] } };

    expect(levelUpView(without, pending).confirm).toMatchObject({ disabled: true, reason: 'Start a session first.' });
    expect(levelUpView(without, []).confirm.reason).toBe('Select an advancement to review.');
  });

  test('is disabled when the choices now cost more than is available', () => {
    const made = toreador(8);
    const pending = addPending(made, 8, [], 'attributes.strength');
    const poorer = toreador(5);

    expect(levelUpView(poorer, pending).confirm).toMatchObject({ disabled: true, reason: 'Not enough XP · 3 more needed.' });
  });
});

describe('the Willpower note', () => {
  test('gives this character\'s own figures', () => {
    expect(levelUpView(toreador(), []).willpowerNote).toContain('(6 XP for 6 → 7)');
  });

  test('stays general when Willpower cannot be raised', () => {
    expect(levelUpView(toreador(8, (c) => void (c.willpower.permanent = 10)), []).willpowerNote).toBe(
      'Permanent Willpower costs its current rating. Virtue increases do not automatically raise Humanity or Willpower.',
    );
  });
});

describe('filterGroups', () => {
  const groups = levelUpView(toreador(8), []).groups;

  test('keeps only the traits that match the search, and drops the cards and groups left empty', () => {
    const found = filterGroups(groups, { query: 'stealth', affordableOnly: false });

    expect(found.flatMap((group) => group.cards).flatMap((card) => card.rows).map((row) => row.label)).toEqual(['Stealth']);
    expect(found).toHaveLength(1);
    expect(found[0].cards).toHaveLength(1);
  });

  test('ignores case and accents and the space around the words', () => {
    expect(rowCount(filterGroups(groups, { query: '  WILLPOWER ', affordableOnly: false }))).toBe(1);
  });

  test('"Show only affordable" hides what is unavailable and what is at its maximum', () => {
    const all = rowCount(groups);
    const affordable = filterGroups(groups, { query: '', affordableOnly: true });
    const labels = affordable.flatMap((group) => group.cards).flatMap((card) => card.rows).map((row) => row.state);

    expect(rowCount(affordable)).toBeLessThan(all);
    expect(labels.every((state) => state === 'affordable' || state === 'pending')).toBe(true);
    expect(labels.length).toBeGreaterThan(0);
  });

  test('a chosen trait stays under "Show only affordable"', () => {
    const made = toreador(8);
    const pending = addPending(made, 8, [], 'attributes.strength');
    const kept = filterGroups(levelUpView(made, pending).groups, { query: '', affordableOnly: true });

    expect(kept.flatMap((group) => group.cards).flatMap((card) => card.rows).some((row) => row.label === 'Strength' && row.state === 'pending')).toBe(true);
  });

  test('a search nothing matches leaves nothing', () => {
    expect(filterGroups(groups, { query: 'zzzz', affordableOnly: false })).toEqual([]);
  });

  test('no search and no filter leaves everything', () => {
    expect(rowCount(filterGroups(groups, { query: '', affordableOnly: false }))).toBe(rowCount(groups));
  });
});

describe('the cost table', () => {
  test('lists every row of the experience cost table, in the words the card uses', () => {
    expect(costTable()).toEqual([
      { label: 'New Ability', rule: '3 XP' },
      { label: 'Existing Ability', rule: 'Current rating × 2' },
      { label: 'Attribute', rule: 'Current rating × 4' },
      { label: 'In-clan Discipline', rule: 'Current rating × 5' },
      { label: 'Out-of-clan Discipline', rule: 'Current rating × 7' },
      { label: 'Caitiff Discipline', rule: 'Current rating × 6' },
      { label: 'Virtue', rule: 'Current rating × 2' },
      { label: 'Humanity / Path', rule: 'Current rating × 2' },
      { label: 'Permanent Willpower', rule: 'Current rating' },
    ]);
  });
});
