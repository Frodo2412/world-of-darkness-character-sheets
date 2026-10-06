// The rules behind the live resources on the play view: what the Blood Pool
// can hold, how far each resource may be stepped and how wounded the character
// is. Computed on every draw, never stored.

import { namedCustomAbility, traitValue, type V20Character } from './character';
import { GENERATION_TABLE, generationNumber } from './generations';
import {
  ABILITY_GROUPS,
  ATTRIBUTE_GROUPS,
  BLOOD_POOL_RANGE,
  HEALTH_LEVELS,
  type AbilityKey,
  type AttributeKey,
  type CustomAbilityRef,
  type HealthLevelKey,
} from './traits';

const LEAST_POTENT = GENERATION_TABLE[GENERATION_TABLE.length - 1];
/** The table stops at the 13th, but V20 gives every generation up to the 15th the same pool. */
const LAST_RECOGNISED_GENERATION = 15;

export interface BloodPoolMaximum {
  maximum: number;
  /** True when the Generation text gave no recognised generation and the sheet's own maximum stands in. */
  assumed: boolean;
}

/** The most blood the character can hold, read from the Generation text. */
export function bloodPoolMaximum(character: V20Character): BloodPoolMaximum {
  const generation = generationNumber(character.header.generation);
  const row = GENERATION_TABLE.find((candidate) => candidate.generation === generation);
  if (row) return { maximum: row.bloodPoolMax, assumed: false };
  if (generation !== undefined && generation > LEAST_POTENT.generation && generation <= LAST_RECOGNISED_GENERATION) {
    return { maximum: LEAST_POTENT.bloodPoolMax, assumed: false };
  }
  return { maximum: BLOOD_POOL_RANGE.max, assumed: true };
}

export interface Wound {
  level: HealthLevelKey;
  label: string;
  /** Dice taken off every pool. */
  penalty: number;
}

/** A wound, incapacitated (its own state, not a number), or none. */
export type WoundState = Wound | 'incapacitated' | undefined;

/**
 * The wound the health track shows: the most severe level holding any damage,
 * whatever the damage type and wherever the gaps are. Incapacitated is its own
 * state, not a number; none when the track is empty or only Bruised is marked.
 */
export function woundState(character: V20Character): WoundState {
  const worst = [...HEALTH_LEVELS].reverse().find((level) => character.health[level.key] !== 'empty');
  if (worst === undefined) return undefined;
  if (!('dicePenalty' in worst)) return 'incapacitated';
  if (worst.dicePenalty === 0) return undefined;
  return { level: worst.key, label: worst.label, penalty: worst.dicePenalty };
}

/** What a dice pool is built from: at most one attribute and one ability, named as the sheet's rows are. */
export interface PoolSelection {
  attribute?: `attributes.${AttributeKey}`;
  ability?: `abilities.${AbilityKey}` | CustomAbilityRef;
}

export interface PoolTerm {
  label: string;
  rating: number;
}

export interface DicePool {
  attribute?: PoolTerm;
  ability?: PoolTerm;
  /** Dice the wound takes off, when it takes any. */
  woundPenalty?: number;
  /** Only when both an attribute and an ability are selected. */
  total?: number;
  incapacitated: boolean;
}

const TRAIT_LABELS = new Map<string, string>(
  [
    ...ATTRIBUTE_GROUPS.flatMap((group) => group.traits.map((trait) => [`attributes.${trait.key}`, trait.label] as const)),
    ...ABILITY_GROUPS.flatMap((group) => group.traits.map((trait) => [`abilities.${trait.key}`, trait.label] as const)),
  ],
);

function abilityTerm(character: V20Character, ability: NonNullable<PoolSelection['ability']>): PoolTerm | undefined {
  if (ability.startsWith('abilities.')) {
    const fixed = ability as `abilities.${AbilityKey}`;
    return { label: TRAIT_LABELS.get(fixed)!, rating: traitValue(character, fixed) };
  }
  const named = namedCustomAbility(character, ability as CustomAbilityRef);
  return named && { label: named.name, rating: named.rating };
}

/** The dice pool of the selected attribute and ability, less what the wound takes off. */
export function dicePool(character: V20Character, selection: PoolSelection): DicePool {
  const attribute = selection.attribute && {
    label: TRAIT_LABELS.get(selection.attribute)!,
    rating: traitValue(character, selection.attribute),
  };
  const ability = selection.ability && abilityTerm(character, selection.ability);
  const wound = woundState(character);
  const incapacitated = wound === 'incapacitated';
  const penalty = typeof wound === 'object' ? wound.penalty : 0;

  const pool: DicePool = { incapacitated };
  if (attribute) pool.attribute = attribute;
  if (ability) pool.ability = ability;
  if (penalty > 0) pool.woundPenalty = penalty;
  if (attribute && ability) pool.total = incapacitated ? 0 : Math.max(0, attribute.rating + ability.rating - penalty);
  return pool;
}

export type Resource = 'blood' | 'willpower';

/** Where a stepped resource stands and which way it can still move. */
export interface ResourceReading {
  current: number;
  /** The most it can be raised to: the generation's maximum, or permanent Willpower. */
  maximum: number;
  canSpend: boolean;
  canGain: boolean;
  /** Stored above the maximum: shown as stored, and able only to fall. */
  over: boolean;
  /** Blood only: the Generation text gave no recognised generation and the sheet's own maximum stands in. */
  assumed: boolean;
}

function readingOf(current: number, maximum: number, assumed = false): ResourceReading {
  return { current, maximum, canSpend: current > 0, canGain: current < maximum, over: current > maximum, assumed };
}

/** The reading of a stepped resource: the one rule its steppers, its announcement and its card all follow. */
export function resourceReading(character: V20Character, resource: Resource): ResourceReading {
  if (resource === 'willpower') return readingOf(character.willpower.temporary, character.willpower.permanent);
  const { maximum, assumed } = bloodPoolMaximum(character);
  return readingOf(character.bloodPool.current, maximum, assumed);
}

/** One step of a resource: never below 0 and never raised above its maximum, but a stored excess is left and can only fall. */
function boundedStep(reading: ResourceReading, delta: number): number {
  return Math.max(0, Math.min(reading.current + delta, Math.max(reading.current, reading.maximum)));
}

/** Spends (negative) or gains (positive) blood, up to what the generation allows. */
export function stepBlood(character: V20Character, delta: number): V20Character {
  const current = boundedStep(resourceReading(character, 'blood'), delta);
  return { ...character, bloodPool: { ...character.bloodPool, current } };
}

/** Spends or regains temporary Willpower, which may be raised no higher than permanent Willpower. */
export function stepTemporaryWillpower(character: V20Character, delta: number): V20Character {
  const temporary = boundedStep(resourceReading(character, 'willpower'), delta);
  return { ...character, willpower: { ...character.willpower, temporary } };
}
