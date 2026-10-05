import { describe, expect, test } from 'vitest';
import { blankCharacter } from '../character';
import { createCharacterStore } from '../../../storage/characterStore';
import { bloodPool, clan, completeBuild, creation, extra, freebie, generation, play, rank } from './testing/play';
import { rating } from './ratings';
import { toCharacter } from './toCharacter';
import { addDiscipline } from './updates';

function lucita() {
  const build = play(
    completeBuild('Lasombra'),
    generation(11),
    extra(10),
    creation('background:Contacts', 0),
    creation('background:Generation', 2),
    creation('discipline:Obtenebration', 0),
    creation('discipline:Dominate', 2),
    freebie('virtue:courage', 4),
    freebie('willpower', 4),
    bloodPool(6),
  );
  build.concept = { name: 'Lucita', player: 'Ana', chronicle: 'Madrid by Night', nature: 'Rebel', demeanor: 'Gallant', concept: 'Fallen noble', sire: 'Moncada' };
  return build;
}

describe('toCharacter', () => {
  test('keeps the build id and writes the header with the effective generation', () => {
    const character = toCharacter(lucita());
    expect(character.id).toBe('abc');
    expect(character.header).toEqual({
      name: 'Lucita',
      player: 'Ana',
      chronicle: 'Madrid by Night',
      nature: 'Rebel',
      demeanor: 'Gallant',
      concept: 'Fallen noble',
      clan: 'Lasombra',
      generation: '9th',
      sire: 'Moncada',
    });
  });

  test('writes final ratings, Humanity, Willpower and blood', () => {
    const build = lucita();
    const character = toCharacter(build);
    expect(character.attributes.strength).toBe(3);
    expect(character.abilities.brawl).toBe(2);
    expect(character.virtues).toEqual({ conscience: 4, selfControl: 3, courage: 4 });
    expect(character.humanity).toMatchObject({ pathName: 'Humanity', rating: 7 });
    expect(character.willpower).toEqual({ permanent: 4, temporary: 4 });
    expect(character.bloodPool).toEqual({ current: 6, perTurn: '2' });
    expect(rating(build, 'humanity')).toBe(7);
  });

  test('writes held Disciplines in clan order and Backgrounds in catalogue order, the rest blank', () => {
    const character = toCharacter(lucita());
    expect(character.disciplines).toEqual([
      { name: 'Dominate', rating: 2 },
      { name: 'Potence', rating: 1 },
      { name: '', rating: 0 },
      { name: '', rating: 0 },
      { name: '', rating: 0 },
      { name: '', rating: 0 },
    ]);
    expect(character.backgrounds.slice(0, 3)).toEqual([
      { name: 'Allies', rating: 2 },
      { name: 'Generation', rating: 2 },
      { name: 'Resources', rating: 1 },
    ]);
    expect(character.backgrounds.slice(3)).toEqual([...Array(3)].map(() => ({ name: '', rating: 0 })));
  });

  test('a bought Discipline outside the clan follows the clan ones', () => {
    const result = addDiscipline(completeBuild('Brujah'), 'Auspex', 'freebie');
    expect(toCharacter(result.build).disciplines.slice(0, 4).map((row) => row.name)).toEqual(['Celerity', 'Potence', 'Presence', 'Auspex']);
  });

  test('a Nosferatu has Appearance 0', () => {
    expect(toCharacter(completeBuild('Nosferatu')).attributes.appearance).toBe(0);
  });

  test('a 4th generation elder keeps ratings above 5', () => {
    const build = play(completeBuild('Brujah'), generation(4), rank('physical', 'primary'), creation('attribute:dexterity', 1), creation('attribute:stamina', 1), creation('attribute:strength', 8));
    const character = toCharacter(build);
    expect(character.attributes.strength).toBe(8);
    expect(character.header.generation).toBe('4th');
    expect(character.bloodPool.perTurn).toBe('10');
  });

  test('everything else is as on a blank character, and the character store reads it back', () => {
    const character = toCharacter(play(completeBuild('Brujah'), clan('Ventrue')));
    const blank = blankCharacter('abc');
    expect(character.health).toEqual(blank.health);
    expect(character.weakness).toBe('');
    expect(character.customAbilities).toEqual(blank.customAbilities);
    const records = new Map<string, string>();
    const store = createCharacterStore({
      get length() {
        return records.size;
      },
      key: (index) => [...records.keys()][index] ?? null,
      getItem: (key) => records.get(key) ?? null,
      setItem: (key, value) => void records.set(key, value),
      removeItem: (key) => void records.delete(key),
    });
    store.save(character);
    expect(store.load('abc')).toEqual({ status: 'found', character });
  });
});
