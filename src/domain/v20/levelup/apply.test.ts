import { describe, expect, test } from 'vitest';
import { blankCharacter, type V20Character } from '../character';
import { awardXp, experienceTotals } from '../experience/ledger';
import { startSession } from '../journal/sessions';
import { counterStamp } from '../journal/testing/stamp';
import { applyPending, undoApply } from './apply';
import { addPending, type Pending } from './pending';

function setup(xp = 10, withSession = true): { character: V20Character; stamp: ReturnType<typeof counterStamp> } {
  const stamp = counterStamp();
  const character = blankCharacter('abc');
  character.header.clan = 'Toreador';
  character.abilities.stealth = 2;
  character.abilities.melee = 0;
  character.attributes.strength = 2;
  character.disciplines[0] = { name: 'Presence', rating: 3 };
  if (withSession) {
    character.journal = startSession(character.journal, 'Session 12', stamp);
    character.journal = awardXp(character.journal, { sessionId: character.journal.sessions[0].id, amount: xp, note: '' }, stamp);
  }
  return { character, stamp };
}

const choose = (character: V20Character, available: number, ...subjects: Parameters<typeof addPending>[3][]): Pending =>
  subjects.reduce<Pending>((pending, subject) => addPending(character, available, pending, subject), []);

describe('applyPending', () => {
  test('raises each rating and writes one spending record each, in the current session, in order', () => {
    const { character, stamp } = setup(10);
    const pending = choose(character, 10, 'abilities.stealth', 'abilities.melee');

    const result = applyPending(character, pending, stamp);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.character.abilities.stealth).toBe(3);
    expect(result.character.abilities.melee).toBe(1);
    const sessionId = character.journal.sessions[0].id;
    expect(result.character.journal.xp.spendings.map(({ sessionId: at, label, kind, from, to, cost }) => ({ at, label, kind, from, to, cost }))).toEqual([
      { at: sessionId, label: 'Stealth 3', kind: 'Ability increase', from: 2, to: 3, cost: 4 },
      { at: sessionId, label: 'Melee 1', kind: 'Ability increase', from: 0, to: 1, cost: 3 },
    ]);
  });

  test('spends what was chosen and leaves what is left', () => {
    const { character, stamp } = setup(10);
    const result = applyPending(character, choose(character, 10, 'abilities.stealth', 'abilities.melee'), stamp);

    if (!result.ok) throw new Error(result.reason);
    expect(result.applied).toMatchObject({ spent: 7, available: 3 });
    expect(experienceTotals(result.character.journal)).toMatchObject({ spent: 7, available: 3 });
  });

  test('raises a Discipline by its row and a virtue, Humanity and Willpower by theirs', () => {
    const { character, stamp } = setup(60);
    character.virtues.conscience = 3;
    character.humanity.rating = 7;
    character.willpower.permanent = 6;
    const result = applyPending(character, choose(character, 60, 'disciplines.0', 'virtues.conscience', 'humanity.rating', 'willpower.permanent', 'attributes.strength'), stamp);

    if (!result.ok) throw new Error(result.reason);
    expect(result.character.disciplines[0]).toEqual({ name: 'Presence', rating: 4 });
    expect([result.character.virtues.conscience, result.character.humanity.rating, result.character.willpower.permanent, result.character.attributes.strength]).toEqual([4, 8, 7, 3]);
    expect(result.character.journal.xp.spendings.map((spending) => spending.kind)).toEqual([
      'Discipline advancement',
      'Virtue increase',
      'Humanity / Path increase',
      'Willpower increase',
      'Attribute increase',
    ]);
  });

  test('fails with no session and returns nothing changed', () => {
    const { character, stamp } = setup(10, false);
    const pending = choose(character, 10, 'abilities.stealth');

    expect(applyPending(character, pending, stamp)).toEqual({ ok: false, reason: 'no-session' });
  });

  test('fails with nothing chosen', () => {
    const { character, stamp } = setup(10);

    expect(applyPending(character, [], stamp)).toEqual({ ok: false, reason: 'nothing-pending' });
  });

  test('fails when a choice no longer fits the character', () => {
    const { character, stamp } = setup(10);
    const pending = choose(character, 10, 'abilities.stealth');

    expect(applyPending({ ...character, abilities: { ...character.abilities, stealth: 3 } }, pending, stamp)).toEqual({ ok: false, reason: 'stale' });
  });

  test('fails when the choices cost more than is available', () => {
    const { character, stamp } = setup(10);
    const pending = choose(character, 10, 'attributes.strength');

    const poorer = { ...character, journal: awardXp(character.journal, { sessionId: character.journal.sessions[0].id, amount: -5, note: '' }, stamp) };

    expect(applyPending(poorer, pending, stamp)).toEqual({ ok: false, reason: 'too-expensive' });
  });

  test('an award that names a session that is not there still counts and blocks nothing', () => {
    const { character, stamp } = setup(4);
    const odd = { ...character, journal: awardXp(character.journal, { sessionId: 'gone', amount: 6, note: '' }, stamp) };
    const result = applyPending(odd, choose(odd, 10, 'abilities.stealth', 'abilities.melee'), stamp);

    expect(result.ok).toBe(true);
  });

  test('does not change the character it was given', () => {
    const { character, stamp } = setup(10);
    const before = structuredClone(character);
    applyPending(character, choose(character, 10, 'abilities.stealth'), stamp);

    expect(character).toEqual(before);
  });
});

describe('undoApply', () => {
  test('restores the ratings and removes exactly the records written', () => {
    const { character, stamp } = setup(10);
    const result = applyPending(character, choose(character, 10, 'abilities.stealth', 'abilities.melee'), stamp);
    if (!result.ok) throw new Error(result.reason);

    const undone = undoApply(result.character, result.applied);

    expect(undone).toEqual(character);
  });

  test('leaves earlier spendings alone', () => {
    const { character, stamp } = setup(20);
    const first = applyPending(character, choose(character, 20, 'abilities.stealth'), stamp);
    if (!first.ok) throw new Error(first.reason);
    const next = first.character;
    const second = applyPending(next, choose(next, 16, 'abilities.melee'), stamp);
    if (!second.ok) throw new Error(second.reason);

    const undone = undoApply(second.character, second.applied);

    expect(undone.journal.xp.spendings.map((spending) => spending.label)).toEqual(['Stealth 3']);
    expect(undone.abilities.stealth).toBe(3);
    expect(undone.abilities.melee).toBe(0);
  });

  test('a rating the player has changed since is left as they set it', () => {
    const { character, stamp } = setup(10);
    const result = applyPending(character, choose(character, 10, 'abilities.stealth'), stamp);
    if (!result.ok) throw new Error(result.reason);
    const edited = { ...result.character, abilities: { ...result.character.abilities, stealth: 5 } };

    const undone = undoApply(edited, result.applied);

    expect(undone.abilities.stealth).toBe(5);
  });

  test('keeps the spending record of a rating it did not restore, so the ledger still matches the sheet', () => {
    const { character, stamp } = setup(10);
    const result = applyPending(character, choose(character, 10, 'abilities.stealth', 'abilities.melee'), stamp);
    if (!result.ok) throw new Error(result.reason);
    const edited = { ...result.character, abilities: { ...result.character.abilities, stealth: 4 } };

    const undone = undoApply(edited, result.applied);

    expect(undone.abilities.stealth).toBe(4);
    expect(undone.abilities.melee).toBe(0);
    expect(undone.journal.xp.spendings.map((spending) => spending.label)).toEqual(['Stealth 3']);
    expect(experienceTotals(undone.journal).spent).toBe(4);
  });
});
