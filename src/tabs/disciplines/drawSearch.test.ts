import { describe, expect, test } from 'vitest';
import { blankCharacter } from '../../domain/v20/character';
import { disciplineView } from '../../domain/v20/disciplineView';
import { narrowDisciplines } from './drawSearch';

const all = disciplineView(blankCharacter('abc'), 'all').disciplines;
const names = (query: string): string[] => narrowDisciplines(all, query).map((discipline) => discipline.name);
const powersOf = (query: string, discipline: string): string[] =>
  narrowDisciplines(all, query)
    .find((candidate) => candidate.name === discipline)!
    .powers.map((power) => power.name);

describe('narrowDisciplines', () => {
  test('keeps everything for an empty query', () => {
    expect(narrowDisciplines(all, '')).toEqual(all);
    expect(narrowDisciplines(all, '   ')).toEqual(all);
  });

  test('a Discipline whose name matches keeps all its powers', () => {
    expect(powersOf('presence', 'Presence')).toEqual(['Awe', 'Dread Gaze', 'Entrancement', 'Summon', 'Majesty']);
  });

  test('a power whose name matches is kept alone under its Discipline', () => {
    expect(names('dread')).toEqual(['Presence']);
    expect(powersOf('dread', 'Presence')).toEqual(['Dread Gaze']);
  });

  test('a power is found by its summary', () => {
    expect(names('receptive')).toEqual(['Presence']);
    expect(powersOf('receptive', 'Presence')).toEqual(['Awe']);
  });

  test('keeps a match in every Discipline that has one, in the list\'s order, narrowing the one whose name does not match', () => {
    // Obfuscate has a power that mentions Presence, though its own name does not.
    expect(names('presence')).toEqual(['Obfuscate', 'Presence']);
    expect(powersOf('presence', 'Obfuscate').length).toBeLessThan(5);
  });

  test('a query nothing has leaves nothing', () => {
    expect(narrowDisciplines(all, 'zzzz')).toEqual([]);
  });
});
