import {
  ABILITY_GROUPS,
  ABILITY_KEYS,
  ATTRIBUTE_DEFAULT,
  ATTRIBUTE_KEYS,
  BACKGROUND_ROWS,
  DISCIPLINE_ROWS,
  HEADER_FIELDS,
  HEALTH_LEVELS,
  VIRTUES,
  VIRTUE_DEFAULT,
  type AbilityGroupKey,
  type AbilityKey,
  rangeOf,
  type AttributeKey,
  type HeaderField,
  type HealthLevelKey,
  type Range,
  type TraitRef,
  type VirtueKey,
} from './traits';

export type DamageType = 'empty' | 'bashing' | 'lethal' | 'aggravated';

/** A write-in row: the player supplies the trait's name as well as its rating. */
export interface NamedRating {
  name: string;
  rating: number;
}

/** Page 1 of the V20 sheet. A record of what the player entered, not a rules check. */
export interface V20Character {
  id: string;
  system: 'v20';
  schemaVersion: 1;
  header: Record<HeaderField, string>;
  attributes: Record<AttributeKey, number>;
  abilities: Record<AbilityKey, number>;
  customAbilities: Record<AbilityGroupKey, NamedRating>;
  disciplines: NamedRating[];
  backgrounds: NamedRating[];
  virtues: Record<VirtueKey, number>;
  humanity: { pathName: string; rating: number; bearing: string; bearingModifier: string };
  willpower: { permanent: number; temporary: number };
  bloodPool: { current: number; perTurn: string };
  health: Record<HealthLevelKey, DamageType>;
  weakness: string;
  experience: string;
  notes: string;
}

function recordOf<K extends string, V>(keys: readonly K[], value: () => V): Record<K, V> {
  return Object.fromEntries(keys.map((key) => [key, value()])) as Record<K, V>;
}

function keysOf<K extends string>(entries: readonly { key: K }[]): K[] {
  return entries.map((entry) => entry.key);
}

const blankRow = (): NamedRating => ({ name: '', rating: 0 });

function blankRows(count: number): NamedRating[] {
  return Array.from({ length: count }, blankRow);
}

export function blankCharacter(id: string): V20Character {
  return {
    id,
    system: 'v20',
    schemaVersion: 1,
    header: recordOf(keysOf(HEADER_FIELDS), () => ''),
    attributes: recordOf(ATTRIBUTE_KEYS, () => ATTRIBUTE_DEFAULT),
    abilities: recordOf(ABILITY_KEYS, () => 0),
    customAbilities: recordOf(keysOf(ABILITY_GROUPS), blankRow),
    disciplines: blankRows(DISCIPLINE_ROWS),
    backgrounds: blankRows(BACKGROUND_ROWS),
    virtues: recordOf(keysOf(VIRTUES), () => VIRTUE_DEFAULT),
    humanity: { pathName: '', rating: 0, bearing: '', bearingModifier: '' },
    willpower: { permanent: 0, temporary: 0 },
    bloodPool: { current: 0, perTurn: '' },
    health: recordOf(keysOf(HEALTH_LEVELS), (): DamageType => 'empty'),
    weakness: '',
    experience: '',
    notes: '',
  };
}

export const UNNAMED_CHARACTER = 'Unnamed character';

/** The name to show for a character wherever it is listed. */
export function displayName(character: V20Character): string {
  return character.header.name.trim() || UNNAMED_CHARACTER;
}

export function setHeaderField(
  character: V20Character,
  field: HeaderField,
  text: string,
): V20Character {
  return { ...character, header: { ...character.header, [field]: text } };
}

function clamp(value: number, range: Range): number {
  if (Number.isNaN(value)) return range.min;
  return Math.min(range.max, Math.max(range.min, Math.trunc(value)));
}

/**
 * The rating that results from activating the dot or box at `position`:
 * that position, or one less when it is already the current rating, so
 * every rating down to zero can be reached with one activation.
 */
export function activateRating(current: number, position: number, range: Range): number {
  return clamp(position === current ? position - 1 : position, range);
}

export function traitValue(character: V20Character, trait: TraitRef): number {
  const [section, key] = trait.split('.') as [keyof V20Character, string];
  return (character[section] as unknown as Record<string, number>)[key];
}

/** Sets a fixed rating, keeping it within that trait's range. */
export function setTrait(character: V20Character, trait: TraitRef, value: number): V20Character {
  const [section, key] = trait.split('.') as [keyof V20Character, string];
  return {
    ...character,
    [section]: { ...(character[section] as object), [key]: clamp(value, rangeOf(trait)) },
  };
}
