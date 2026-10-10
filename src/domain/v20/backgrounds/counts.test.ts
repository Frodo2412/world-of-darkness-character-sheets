import { describe, expect, test } from 'vitest';
import { blankCharacter, type V20Character } from '../character';
import { SECTION_KEYS, sectionCounts } from './counts';

function crowded(): V20Character {
  const character = blankCharacter('abc');
  character.backgrounds[0] = { name: 'Allies', rating: 2 };
  character.backgrounds[1] = { name: 'Contacts', rating: 1 };
  character.havens.push(
    { name: 'The Orangery', kind: 'Primary', description: '', location: '', access: '', security: '' },
    { name: '', kind: 'Other', description: '', location: '', access: '', security: '' },
  );
  character.merits.push({ name: 'Acute Sense', category: 'Physical', points: 1, note: '' });
  character.flaws.push({ name: 'Hunted', category: 'Social', points: 1, note: '' }, { name: '', category: 'Social', points: 0, note: '' });
  character.otherTraits.push({ name: 'Languages', kind: 'Skill', note: '' }, { name: '  ', kind: '', note: '' });
  return character;
}

describe('sectionCounts', () => {
  test('count the named rows of every section in play', () => {
    expect(sectionCounts(crowded(), 'play')).toEqual({ backgrounds: 2, havens: 1, merits: 1, flaws: 1, otherTraits: 1 });
  });

  test('count every row of every section in edit, blank ones included', () => {
    expect(sectionCounts(crowded(), 'edit')).toEqual({ backgrounds: 6, havens: 2, merits: 1, flaws: 2, otherTraits: 2 });
  });

  test('are all 0 for a character with nothing in play', () => {
    expect(Object.values(sectionCounts(blankCharacter('abc'), 'play'))).toEqual([0, 0, 0, 0, 0]);
  });

  test('name the five sections of the index', () => {
    expect(SECTION_KEYS).toEqual(['backgrounds', 'havens', 'merits', 'flaws', 'otherTraits']);
  });
});
