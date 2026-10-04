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
  DAMAGE_TYPES,
  rangeOf,
  type AttributeKey,
  type DamageType,
  RATING_RANGE,
  type HeaderField,
  type HealthLevelKey,
  type NamedRowRef,
  type Range,
  type TextRef,
  type TraitRef,
  type VirtueKey,
} from './traits';

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
  return setText(character, `header.${field}`, text);
}

export function textValue(character: V20Character, field: TextRef): string {
  const [section, key] = field.split('.') as [keyof V20Character, string?];
  const value = character[section];
  return key === undefined ? (value as string) : (value as unknown as Record<string, string>)[key];
}

/** Sets a free-text field to exactly what was typed. */
export function setText(character: V20Character, field: TextRef, text: string): V20Character {
  const [section, key] = field.split('.') as [keyof V20Character, string?];
  if (key === undefined) return { ...character, [section]: text };
  return { ...character, [section]: { ...(character[section] as object), [key]: text } };
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

type NamedRows = NamedRating[] | Record<string, NamedRating>;

function rowsOf(character: V20Character, row: NamedRowRef): [keyof V20Character, NamedRows, string] {
  const [section, key] = row.split('.') as ['customAbilities' | 'disciplines' | 'backgrounds', string];
  return [section, character[section], key];
}

/** The write-in row at `row`, or undefined when the sheet has no such row. */
export function namedRow(character: V20Character, row: NamedRowRef): NamedRating | undefined {
  const [, rows, key] = rowsOf(character, row);
  return Array.isArray(rows) ? rows[Number(key)] : rows[key];
}

/** Changes the name, the rating or both of a write-in row. */
export function setNamedRow(
  character: V20Character,
  row: NamedRowRef,
  change: Partial<NamedRating>,
): V20Character {
  const current = namedRow(character, row);
  if (current === undefined) return character;

  const updated: NamedRating = {
    name: change.name ?? current.name,
    rating: change.rating === undefined ? current.rating : clamp(change.rating, RATING_RANGE),
  };
  const [section, rows, key] = rowsOf(character, row);
  return {
    ...character,
    [section]: Array.isArray(rows)
      ? rows.map((existing, index) => (index === Number(key) ? updated : existing))
      : { ...rows, [key]: updated },
  };
}

/** Steps one health box to its next damage type: empty, bashing, lethal, aggravated, empty. */
export function cycleHealthBox(character: V20Character, level: HealthLevelKey): V20Character {
  const position = DAMAGE_TYPES.indexOf(character.health[level]);
  const next = DAMAGE_TYPES[(position + 1) % DAMAGE_TYPES.length];
  return { ...character, health: { ...character.health, [level]: next } };
}
