// Test helpers: build states by playing the real updates, so tests never
// depend on how a build stores its dots.

import { blankBuild, type BuildTraitRef, type V20Build } from '../build';
import type { UpdateResult } from '../result';
import { addDiscipline, setBaseGeneration, setClan, setExtraFreebies, setRank, setRating } from '../updates';

export type Step = (build: V20Build) => UpdateResult;

/** Plays each update in turn, failing the test if any is refused. */
export function play(build: V20Build, ...steps: Step[]): V20Build {
  return steps.reduce((current, step) => {
    const result = step(current);
    if (result.status === 'refused') throw new Error(`refused: ${result.reason}`);
    return result.build;
  }, build);
}

export const fresh = (): V20Build => blankBuild('abc');

export const generation = (value: number): Step => (build) => setBaseGeneration(build, value);
export const extra = (value: number): Step => (build) => setExtraFreebies(build, String(value));
export const clan = (name: string): Step => (build) => setClan(build, name);
export const rank = (group: string, value: string): Step => (build) => setRank(build, group, value);
export const creation = (ref: BuildTraitRef, value: number): Step => (build) =>
  setRating(build, ref, value, 'creation');
export const freebie = (ref: BuildTraitRef, value: number): Step => (build) =>
  setRating(build, ref, value, 'freebie');
export const addCreationDiscipline = (name: string): Step => (build) =>
  addDiscipline(build, name, 'creation');
export const buyDiscipline = (name: string): Step => (build) => addDiscipline(build, name, 'freebie');

/** Physical, Social, Mental ranked primary, secondary, tertiary. */
export const attributesRanked: Step[] = [
  rank('physical', 'primary'),
  rank('social', 'secondary'),
  rank('mental', 'tertiary'),
];

export const abilitiesRanked: Step[] = [
  rank('talents', 'primary'),
  rank('skills', 'secondary'),
  rank('knowledges', 'tertiary'),
];

/**
 * Every creation dot of a Brujah placed, at 13th generation with nothing
 * bought: Strength 3, Brawl 2, Celerity 1, Resources 1, Conscience 4,
 * Self-Control 3 and Courage 3 (so Humanity 7 and Willpower 3).
 */
export function completeBrujah(): V20Build {
  return play(
    fresh(),
    clan('Brujah'),
    ...attributesRanked,
    creation('attribute:strength', 3),
    creation('attribute:dexterity', 3),
    creation('attribute:stamina', 4),
    creation('attribute:charisma', 3),
    creation('attribute:manipulation', 3),
    creation('attribute:appearance', 2),
    creation('attribute:perception', 2),
    creation('attribute:intelligence', 2),
    creation('attribute:wits', 2),
    ...abilitiesRanked,
    creation('ability:brawl', 2),
    creation('ability:alertness', 3),
    creation('ability:athletics', 3),
    creation('ability:awareness', 3),
    creation('ability:empathy', 2),
    creation('ability:drive', 3),
    creation('ability:firearms', 3),
    creation('ability:melee', 3),
    creation('ability:academics', 3),
    creation('ability:computer', 2),
    creation('discipline:Celerity', 1),
    creation('discipline:Potence', 1),
    creation('discipline:Presence', 1),
    creation('background:Resources', 1),
    creation('background:Contacts', 2),
    creation('background:Allies', 2),
    creation('virtue:conscience', 4),
    creation('virtue:selfControl', 3),
    creation('virtue:courage', 3),
  );
}
