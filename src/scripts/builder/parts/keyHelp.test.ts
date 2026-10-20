import { describe, expect, it } from 'vitest';
import { ARCHETYPE_KEYS_HELP, BACKGROUND_KEYS_HELP, CLAN_LIST_HELP } from './keyHelp';

/** Any pronoun at all, including the relative ones: the lines name keys and acts, never a person. */
const PRONOUN =
  /\b(?:i|me|my|mine|myself|we|us|our|ours|ourselves|you|your|yours|yourself|he|him|his|himself|she|her|hers|herself|it|its|itself|they|them|their|theirs|themselves|who|whom|whose|which|that|this|these|those)\b/i;

const words = (line: string): string[] => line.split(/\s+/).filter(Boolean);

describe('the key descriptions', () => {
  it('say how the keys work on each list', () => {
    expect(CLAN_LIST_HELP).toBe('Arrow keys move between clans; Space or Enter chooses.');
    expect(ARCHETYPE_KEYS_HELP).toBe('Arrow keys switch role; Tab moves between archetypes; Space or Enter assigns.');
    expect(BACKGROUND_KEYS_HELP).toBe('Tab moves between chips; Space or Enter chooses or clears a Background.');
  });

  it.each([CLAN_LIST_HELP, ARCHETYPE_KEYS_HELP, BACKGROUND_KEYS_HELP])('the line %j is short and has no pronoun', (line) => {
    expect(words(line).length).toBeLessThanOrEqual(12);
    expect(line).not.toMatch(PRONOUN);
  });
});
