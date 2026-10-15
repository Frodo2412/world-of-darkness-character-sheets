import { describe, expect, test } from 'vitest';
import { blankCharacter, setTrait, type V20Character } from '../character';
import { addPending, clearPending, pendingTotals, removePending, reprice, type Pending } from './pending';

function toreador(change: (character: V20Character) => void = () => {}): V20Character {
  const made = blankCharacter('abc');
  made.header.clan = 'Toreador';
  made.abilities.stealth = 2;
  made.abilities.melee = 0;
  made.attributes.strength = 2;
  change(made);
  return made;
}

describe('addPending', () => {
  test('chooses the next dot with its cost and the rule that prices it', () => {
    const [item] = addPending(toreador(), 8, [], 'abilities.stealth');

    expect(item).toMatchObject({ subject: 'abilities.stealth', label: 'Stealth', from: 2, to: 3, cost: 4, rule: 'Existing Ability · current 2 × 2 = 4 XP' });
  });

  test('keeps the order chosen', () => {
    const made = toreador();
    const pending = addPending(made, 10, addPending(made, 10, [], 'abilities.stealth'), 'abilities.melee');

    expect(pending.map((item) => item.label)).toEqual(['Stealth', 'Melee']);
  });

  test('adds nothing for a trait already chosen', () => {
    const made = toreador();
    const once = addPending(made, 20, [], 'abilities.stealth');

    expect(addPending(made, 20, once, 'abilities.stealth')).toBe(once);
  });

  test('adds nothing that costs more than what is left', () => {
    const made = toreador();
    const once = addPending(made, 8, [], 'abilities.stealth');

    expect(addPending(made, 8, once, 'attributes.strength')).toBe(once);
    expect(addPending(made, 3, [], 'abilities.stealth')).toEqual([]);
  });

  test('adds nothing at the maximum, or for a trait that is not offered', () => {
    const made = toreador((c) => void (c.virtues.courage = 5));

    expect(addPending(made, 99, [], 'virtues.courage')).toEqual([]);
    expect(addPending(made, 99, [], 'disciplines.0')).toEqual([]);
  });

  test('does not change the character or the list it was given', () => {
    const made = toreador();
    const before = structuredClone(made);
    const list: Pending = [];
    addPending(made, 8, list, 'abilities.stealth');

    expect(made).toEqual(before);
    expect(list).toEqual([]);
  });
});

describe('removing and clearing', () => {
  const two = (): { made: V20Character; pending: Pending } => {
    const made = toreador();
    return { made, pending: addPending(made, 10, addPending(made, 10, [], 'abilities.stealth'), 'abilities.melee') };
  };

  test('removes only that trait and keeps the order of the rest', () => {
    const { pending } = two();

    expect(removePending(pending, 'abilities.melee').map((item) => item.label)).toEqual(['Stealth']);
    expect(removePending(pending, 'abilities.stealth').map((item) => item.label)).toEqual(['Melee']);
  });

  test('removing what is not there changes nothing', () => {
    const { pending } = two();

    expect(removePending(pending, 'attributes.strength')).toEqual(pending);
  });

  test('clearing leaves nothing', () => {
    expect(clearPending()).toEqual([]);
  });
});

describe('pendingTotals', () => {
  test('counts the choices, what they cost, and what is left', () => {
    const made = toreador();
    const pending = addPending(made, 10, addPending(made, 10, [], 'abilities.stealth'), 'abilities.melee');

    expect(pendingTotals(pending, 10)).toEqual({ count: 2, total: 7, remaining: 3 });
  });

  test('nothing chosen costs nothing', () => {
    expect(pendingTotals([], 8)).toEqual({ count: 0, total: 0, remaining: 8 });
  });

  test('costing more than is available leaves a negative balance', () => {
    const made = toreador();
    const pending = addPending(made, 10, [], 'attributes.strength');

    expect(pendingTotals(pending, 5).remaining).toBe(-3);
  });
});

describe('reprice', () => {
  test('keeps what still fits the character, as it was', () => {
    const made = toreador();
    const pending = addPending(made, 8, [], 'abilities.stealth');

    const result = reprice(made, pending);

    expect(result.pending).toBe(pending);
    expect(result.dropped).toEqual([]);
  });

  test('drops a choice whose trait has since changed, and says so', () => {
    const made = toreador();
    const pending = addPending(made, 8, [], 'abilities.stealth');

    const result = reprice(setTrait(made, 'abilities.stealth', 3), pending);

    expect(result.pending).toEqual([]);
    expect(result.dropped).toEqual([{ label: 'Stealth', text: 'Stealth changed from 2 to 3 · removed from the review' }]);
  });

  test('drops a choice that has reached its maximum', () => {
    const made = toreador((c) => void (c.virtues.courage = 4));
    const pending = addPending(made, 10, [], 'virtues.courage');

    expect(reprice(setTrait(made, 'virtues.courage', 5), pending).dropped).toHaveLength(1);
  });

  test('keeps the others when one is dropped, in order', () => {
    const made = toreador();
    const pending = addPending(made, 20, addPending(made, 20, [], 'abilities.stealth'), 'attributes.strength');

    const result = reprice(setTrait(made, 'abilities.stealth', 3), pending);

    expect(result.pending.map((item) => item.label)).toEqual(['Strength']);
  });

  test('a Discipline that was renamed or removed is dropped', () => {
    const made = toreador((c) => void (c.disciplines[0] = { name: 'Presence', rating: 3 }));
    const pending = addPending(made, 20, [], 'disciplines.0');
    const renamed = { ...made, disciplines: [{ name: 'Auspex', rating: 3 }, ...made.disciplines.slice(1)] };
    const removed = { ...made, disciplines: [{ name: '', rating: 0 }, ...made.disciplines.slice(1)] };

    expect(reprice(renamed, pending).dropped[0].text).toBe('Presence is no longer on the sheet · removed from the review');
    expect(reprice(removed, pending).pending).toEqual([]);
  });

  test('prices a choice again when the clan changed under it', () => {
    const made = toreador((c) => void (c.disciplines[0] = { name: 'Auspex', rating: 2 }));
    const pending = addPending(made, 20, [], 'disciplines.0');
    const brujah = { ...made, header: { ...made.header, clan: 'Brujah' } };

    expect(pending[0].cost).toBe(10);
    expect(reprice(brujah, pending).pending[0]).toMatchObject({ cost: 14, rule: 'Out-of-clan Discipline · current 2 × 7 = 14 XP' });
  });

  test('an empty list stays empty', () => {
    expect(reprice(toreador(), [])).toEqual({ pending: [], dropped: [] });
  });
});
