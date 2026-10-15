import type { V20Character } from '../../../src/domain/v20/character';
import { ABILITY_GROUPS, ATTRIBUTE_GROUPS, HEALTH_LEVELS, VIRTUES } from '../../../src/domain/v20/traits';

// Reads the phrases a scenario uses to arrange a character ("Presence 3, Charisma 3 and a Hurt wound")
// and arranges it. Used by the shared step "a character with …" and by tab steps that go further.

const TRAIT = String.raw`[A-Z][A-Za-z' -]* \d+`;
const WOUND = String.raw`an? [A-Z][a-z]+ wound`;
const ITEM = `(?:${TRAIT}|${WOUND})`;

/** The phrase "a character with <items>" where every item is a rated trait or a wound, and nothing else. */
export const CHARACTER_WITH = new RegExp(`^a character with (${ITEM}(?:(?:, and |, | and )${ITEM})*)$`);

const SEPARATOR = /, and |, | and /;

const sameWords = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Gives the first unnamed Discipline row this name and rating. */
export function addDiscipline(character: V20Character, name: string, rating: number): void {
  const row = character.disciplines.find((candidate) => candidate.name.trim() === '');
  if (row === undefined) throw new Error(`no free Discipline row for ${name}`);
  row.name = name;
  row.rating = rating;
}

/** Marks the wound level as taking damage, which is what makes it the character's wound. */
export function wound(character: V20Character, label: string): void {
  const level = HEALTH_LEVELS.find((candidate) => sameWords(candidate.label, label));
  if (level === undefined) throw new Error(`no health level called ${label}`);
  character.health[level.key] = 'lethal';
}

/** Sets a rated trait by the name the sheet gives it; a name the sheet does not know is a Discipline. */
export function rate(character: V20Character, name: string, rating: number): void {
  const attribute = ATTRIBUTE_GROUPS.flatMap((group) => [...group.traits]).find((trait) => sameWords(trait.label, name));
  if (attribute !== undefined) {
    character.attributes[attribute.key] = rating;
    return;
  }
  const ability = ABILITY_GROUPS.flatMap((group) => [...group.traits]).find((trait) => sameWords(trait.label, name));
  if (ability !== undefined) {
    character.abilities[ability.key] = rating;
    return;
  }
  const virtue = VIRTUES.find((candidate) => sameWords(candidate.label.split('/')[0], name) || sameWords(candidate.label, name));
  if (virtue !== undefined) {
    character.virtues[virtue.key] = rating;
    return;
  }
  if (sameWords(name, 'Humanity')) {
    character.humanity.rating = rating;
    return;
  }
  if (sameWords(name, 'Willpower')) {
    character.willpower.permanent = rating;
    character.willpower.temporary = rating;
    return;
  }
  addDiscipline(character, name, rating);
}

/** Arranges the character as the items say: "Presence 3, Charisma 3 and a Hurt wound". */
export function arrangeTraits(character: V20Character, phrase: string): void {
  for (const item of phrase.split(SEPARATOR)) {
    const hurt = item.match(/^an? ([A-Z][a-z]+) wound$/);
    if (hurt !== null) {
      wound(character, hurt[1]);
      continue;
    }
    const rated = item.match(/^(.+) (\d+)$/)!;
    rate(character, rated[1], Number(rated[2]));
  }
}
