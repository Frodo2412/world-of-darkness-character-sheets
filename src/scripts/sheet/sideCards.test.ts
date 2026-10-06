import { describe, expect, test } from 'vitest';
import { blankCharacter } from '../../domain/v20/character';
import { disciplineLines } from './sideCards';

describe('disciplineLines', () => {
  test('lists named Disciplines as "Name rating" in stored order, including one rated 0', () => {
    const character = blankCharacter('c');
    character.disciplines[0] = { name: 'Presence', rating: 3 };
    character.disciplines[1] = { name: 'Auspex', rating: 2 };
    character.disciplines[2] = { name: '  Obfuscate ', rating: 0 };
    character.disciplines[3] = { name: '   ', rating: 4 };
    expect(disciplineLines(character)).toEqual(['Presence 3', 'Auspex 2', 'Obfuscate 0']);
  });

  test('lists nothing when no Discipline is named', () => {
    expect(disciplineLines(blankCharacter('c'))).toEqual([]);
  });
});
