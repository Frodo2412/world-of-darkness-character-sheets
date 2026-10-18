import { describe, expect, test } from 'vitest';
import { blankCharacter, type V20Character } from '../../domain/v20/character';
import { disciplineView } from '../../domain/v20/disciplineView';
import { filterDisciplines, selectedDiscipline } from './filter';

function characterWith(...rows: { name: string; rating: number }[]): V20Character {
  const character = blankCharacter('abc');
  rows.forEach((row, index) => (character.disciplines[index] = row));
  return character;
}

const owned = disciplineView(characterWith({ name: 'Presence', rating: 3 }, { name: 'Auspex', rating: 2 }, { name: 'Celerity', rating: 1 })).owned;

describe('filterDisciplines', () => {
  test('keeps everything for an empty or blank query', () => {
    expect(filterDisciplines(owned, '')).toEqual(owned);
    expect(filterDisciplines(owned, '   ')).toEqual(owned);
  });

  test('finds a power by name and keeps only the Discipline that holds it, with only that power', () => {
    const found = filterDisciplines(owned, 'dread');

    expect(found.map((view) => view.name)).toEqual(['Presence']);
    expect(found[0].powers.map((power) => power.name)).toEqual(['Dread Gaze']);
  });

  test("finds a power by a word of the book's summary", () => {
    const found = filterDisciplines(owned, 'receptive');

    expect(found.map((view) => view.name)).toEqual(['Presence']);
    expect(found[0].powers.map((power) => power.name)).toEqual(['Awe']);
  });

  test('a Discipline whose name matches keeps all its powers', () => {
    const found = filterDisciplines(disciplineView(characterWith({ name: 'Presence', rating: 1 })).owned, 'pres');

    expect(found.map((view) => view.name)).toEqual(['Presence']);
    expect(found[0].powers).toHaveLength(5);
  });

  test("a query may span the Discipline's name and a power's", () => {
    const found = filterDisciplines(owned, 'presence awe');

    expect(found[0].powers.map((power) => power.name)).toEqual(['Awe']);
  });

  test('ignores case and accents', () => {
    expect(filterDisciplines(owned, 'DREAD GAZE')).toHaveLength(1);
    expect(filterDisciplines(owned, 'HEIGHTENED')).toHaveLength(1);
    expect(filterDisciplines(owned, 'héightened')).toHaveLength(1);
  });

  test('matches nothing for text no Discipline or power holds', () => {
    expect(filterDisciplines(owned, 'zzzz')).toEqual([]);
  });

  test('does not match the "See rulebook" stand-in for a missing summary', () => {
    expect(filterDisciplines(owned, 'rulebook')).toEqual([]);
  });
});

describe('selectedDiscipline', () => {
  test('is the chosen Discipline while it is in the list', () => {
    expect(selectedDiscipline(owned, 'Auspex')?.key).toBe('Auspex');
  });

  test('is the first in the list when the chosen one is not there, or none was chosen', () => {
    expect(selectedDiscipline(owned, 'Dominate')?.name).toBe('Presence');
    expect(selectedDiscipline(owned, undefined)?.name).toBe('Presence');
  });

  test('tells two rows of the same Discipline apart by key', () => {
    const twice = disciplineView(characterWith({ name: 'Auspex', rating: 2 }, { name: 'Auspex', rating: 4 })).owned;

    expect(selectedDiscipline(twice, 'Auspex (2)')?.rating).toBe(4);
    expect(selectedDiscipline(twice, 'Auspex')?.rating).toBe(2);
  });

  test('is nothing for an empty list', () => {
    expect(selectedDiscipline([], 'Presence')).toBeUndefined();
  });
});
