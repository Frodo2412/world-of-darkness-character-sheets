// A finished build becomes an ordinary sheet character. Built through the
// character model's own functions, so the result always has the sheet's shape.

import {
  blankCharacter,
  setHeaderField,
  setNamedRow,
  setText,
  setTrait,
  type V20Character,
} from '../character';
import type { TraitRef } from '../traits';
import { CONCEPT_FIELDS, FIXED_TRAIT_REFS, type BuildTraitRef, type V20Build } from './build';
import { effectiveGeneration, limits, ordinal } from './limits';
import { clanDisciplines, keyOf, kindOf, rating } from './ratings';
import { BACKGROUNDS } from './rules';

type Change = (character: V20Character) => V20Character;

/** The sheet's address for a fixed build trait: `attribute:strength` → `attributes.strength`. */
function sheetTrait(ref: BuildTraitRef): TraitRef {
  const section = { attribute: 'attributes', ability: 'abilities', virtue: 'virtues' }[kindOf(ref) as string];
  return `${section}.${keyOf(ref)}` as TraitRef;
}

/** Held Disciplines in the builder's order: the clan's, then the rest as added. */
function heldDisciplines(build: V20Build): { name: string; rating: number }[] {
  const clan = clanDisciplines(build);
  const names = [
    ...clan,
    ...build.disciplines.map((entry) => entry.name).filter((name) => !clan.includes(name)),
  ];
  return names
    .map((name) => ({ name, rating: rating(build, `discipline:${name}`) }))
    .filter((entry) => entry.rating > 0);
}

function heldBackgrounds(build: V20Build): { name: string; rating: number }[] {
  return BACKGROUNDS.map((name) => ({ name, rating: rating(build, `background:${name}`) })).filter(
    (entry) => entry.rating > 0,
  );
}

export function toCharacter(build: V20Build): V20Character {
  const { bloodPerTurn } = limits(build);
  const willpower = rating(build, 'willpower');
  const changes: Change[] = [
    ...CONCEPT_FIELDS.map((field): Change => (character) => setHeaderField(character, field, build.concept[field])),
    (character) => setHeaderField(character, 'clan', build.clan),
    (character) => setHeaderField(character, 'generation', ordinal(effectiveGeneration(build))),
    ...FIXED_TRAIT_REFS.filter((ref) => ['attribute', 'ability', 'virtue'].includes(kindOf(ref))).map(
      (ref): Change => (character) => setTrait(character, sheetTrait(ref), rating(build, ref)),
    ),
    ...heldDisciplines(build).map((row, index): Change => (character) => setNamedRow(character, `disciplines.${index}`, row)),
    ...heldBackgrounds(build).map((row, index): Change => (character) => setNamedRow(character, `backgrounds.${index}`, row)),
    (character) => setText(character, 'humanity.pathName', 'Humanity'),
    (character) => setTrait(character, 'humanity.rating', rating(build, 'humanity')),
    (character) => setTrait(character, 'willpower.permanent', willpower),
    (character) => setTrait(character, 'willpower.temporary', willpower),
    (character) => setTrait(character, 'bloodPool.current', build.bloodPool),
    (character) => setText(character, 'bloodPool.perTurn', String(bloodPerTurn)),
  ];
  return changes.reduce((character, change) => change(character), blankCharacter(build.id));
}
