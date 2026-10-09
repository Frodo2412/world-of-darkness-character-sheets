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
  type CustomAbilityRef,
  type HeaderField,
  type HealthLevelKey,
  type NamedRowRef,
  type Range,
  type SpecialtyRef,
  type TextRef,
  type TraitRef,
  type VirtueKey,
} from './traits';
import type { BackgroundRow, Flaw, Haven, Merit, OtherTrait } from './dossier/types';
import { blankJournal, type Journal } from './journal/types';
import type { NamedRating } from './namedRating';

// The stored shapes live next to their families; re-exported so later slices never edit this file.
export type { NamedRating } from './namedRating';
export * from './dossier/types';
export * from './journal/types';

/** Page 1 of the V20 sheet. A record of what the player entered, not a rules check. */
export interface V20Character {
  id: string;
  system: 'v20';
  schemaVersion: 1;
  header: Record<HeaderField, string>;
  attributes: Record<AttributeKey, number>;
  abilities: Record<AbilityKey, number>;
  customAbilities: Record<AbilityGroupKey, NamedRating>;
  /** What the player wrote as a trait's specialty; a trait without one has no entry. */
  specialties: Partial<Record<SpecialtyRef, string>>;
  disciplines: NamedRating[];
  backgrounds: BackgroundRow[];
  virtues: Record<VirtueKey, number>;
  humanity: { pathName: string; rating: number; bearing: string; bearingModifier: string };
  willpower: { permanent: number; temporary: number };
  bloodPool: { current: number; perTurn: string };
  health: Record<HealthLevelKey, DamageType>;
  weakness: string;
  experience: string;
  notes: string;
  merits: Merit[];
  flaws: Flaw[];
  otherTraits: OtherTrait[];
  havens: Haven[];
  journal: Journal;
}

/** Every top-level field added for the dossier tabs; a record saved without one reads as its blank default. */
export const DOSSIER_FIELDS = ['merits', 'flaws', 'otherTraits', 'havens', 'journal'] as const satisfies readonly (keyof V20Character)[];
export type DossierField = (typeof DOSSIER_FIELDS)[number];

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
    specialties: {},
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
    merits: [],
    flaws: [],
    otherTraits: [],
    havens: [],
    journal: blankJournal(),
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

/** A trait's specialty as typed, or '' when it has none. */
export function specialtyText(character: V20Character, trait: SpecialtyRef): string {
  return character.specialties[trait] ?? '';
}

/** A trait's specialty trimmed for display, or undefined when it has none. */
export function specialtyOf(character: V20Character, trait: SpecialtyRef): string | undefined {
  return specialtyText(character, trait).trim() || undefined;
}

/** Sets a trait's specialty to exactly what was typed; clearing the text removes it. */
export function setSpecialty(character: V20Character, trait: SpecialtyRef, text: string): V20Character {
  const { [trait]: _removed, ...rest } = character.specialties;
  return { ...character, specialties: text === '' ? rest : { ...rest, [trait]: text } };
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

/** The write-in rows the player has named, in order, with trimmed names: an unnamed row is not shown in play. */
export function namedRows(rows: readonly NamedRating[]): NamedRating[] {
  return rows
    .filter((row) => row.name.trim() !== '')
    .map((row) => ({ ...row, name: row.name.trim() }));
}

/** A group's write-in ability with its trimmed name, or undefined while the player has not named it. */
export function namedCustomAbility(character: V20Character, ability: CustomAbilityRef): NamedRating | undefined {
  return namedRows([namedRow(character, ability)!])[0];
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
