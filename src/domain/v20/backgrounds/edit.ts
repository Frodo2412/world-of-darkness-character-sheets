// Every change the Backgrounds tab makes to the stored lists. Each function returns a new character and
// leaves the one it was given; an index that is not there changes nothing.

import { setNamedRow, type V20Character } from '../character';
import { MERIT_CATEGORIES, type BackgroundRow, type Flaw, type Haven, type Merit, type OtherTrait, type Person } from '../dossier/types';
import { BACKGROUND_ROWS } from '../traits';

/** What the player is told when points are put right. */
export const POINTS_MESSAGE = 'Points kept at 0 or more.';

/** Points are whole numbers of 0 or more: anything else becomes the nearest that is, and says so. */
export function clampPoints(value: number): { points: number; corrected: boolean } {
  const points = Number.isNaN(value) ? 0 : Math.max(0, Math.trunc(value));
  return { points, corrected: points !== value };
}

/** Replaces the item at `index` with `change` applied; the list as it is when there is no such item. */
function updateAt<T>(list: readonly T[], index: number, change: (item: T) => T): T[] {
  return list.map((item, at) => (at === index ? change(item) : item));
}

const inRange = (list: readonly unknown[], index: number): boolean => Number.isInteger(index) && index >= 0 && index < list.length;

// Backgrounds

export type BackgroundChange = Partial<Pick<BackgroundRow, 'name' | 'rating' | 'summary' | 'note'>>;

/** Changes one Background's name, rating, summary or note; the rest of the row (its people) is kept. */
export function setBackground(character: V20Character, index: number, change: BackgroundChange): V20Character {
  if (!inRange(character.backgrounds, index)) return character;
  const { summary, note, ...row } = change;
  let updated = Object.keys(row).length === 0 ? character : setNamedRow(character, `backgrounds.${index}`, row);
  if (summary !== undefined || note !== undefined) {
    updated = {
      ...updated,
      backgrounds: updateAt(updated.backgrounds, index, (existing) => ({
        ...existing,
        ...(summary === undefined ? {} : { summary }),
        ...(note === undefined ? {} : { note }),
      })),
    };
  }
  return updated;
}

/** Adds a Background after the last row: the sheet shows six, and the character may have more. */
export function addBackground(character: V20Character, name = ''): V20Character {
  return { ...character, backgrounds: [...character.backgrounds, { name, rating: 0 }] };
}

const blankPerson = (): Person => ({ name: '', role: '' });

export function addPerson(character: V20Character, index: number): V20Character {
  if (!inRange(character.backgrounds, index)) return character;
  return {
    ...character,
    backgrounds: updateAt(character.backgrounds, index, (row) => ({ ...row, people: [...(row.people ?? []), blankPerson()] })),
  };
}

export function setPerson(character: V20Character, index: number, person: number, change: Partial<Person>): V20Character {
  if (!inRange(character.backgrounds, index) || !inRange(character.backgrounds[index].people ?? [], person)) return character;
  return {
    ...character,
    backgrounds: updateAt(character.backgrounds, index, (row) => ({
      ...row,
      people: updateAt(row.people ?? [], person, (existing) => ({ ...existing, ...change })),
    })),
  };
}

export function removePerson(character: V20Character, index: number, person: number): V20Character {
  if (!inRange(character.backgrounds, index) || !inRange(character.backgrounds[index].people ?? [], person)) return character;
  return {
    ...character,
    backgrounds: updateAt(character.backgrounds, index, (row) => ({ ...row, people: (row.people ?? []).filter((_, at) => at !== person) })),
  };
}

// Merits and Flaws

export type PointedFamily = 'merits' | 'flaws';

const blankPointed = (): Merit => ({ name: '', category: MERIT_CATEGORIES[0], points: 0, note: '' });

export function addPointed(character: V20Character, family: PointedFamily): V20Character {
  return { ...character, [family]: [...character[family], blankPointed()] };
}

/** Changes a Merit or Flaw; its points are kept at 0 or more. */
export function setPointed(character: V20Character, family: PointedFamily, index: number, change: Partial<Merit>): V20Character {
  if (!inRange(character[family], index)) return character;
  const { points, ...rest } = change;
  return {
    ...character,
    [family]: updateAt<Merit | Flaw>(character[family], index, (entry) => ({
      ...entry,
      ...rest,
      ...(points === undefined ? {} : { points: clampPoints(points).points }),
    })),
  };
}

// Havens

const blankHaven = (): Haven => ({ name: '', kind: 'Primary', description: '', location: '', access: '', security: '' });

export const addHaven = (character: V20Character): V20Character => ({ ...character, havens: [...character.havens, blankHaven()] });

export function setHaven(character: V20Character, index: number, change: Partial<Haven>): V20Character {
  if (!inRange(character.havens, index)) return character;
  return { ...character, havens: updateAt(character.havens, index, (haven) => ({ ...haven, ...change })) };
}

// Other traits

const blankTrait = (): OtherTrait => ({ name: '', kind: '', note: '' });

export const addOtherTrait = (character: V20Character): V20Character => ({ ...character, otherTraits: [...character.otherTraits, blankTrait()] });

/** Changes an other trait; a rating of `undefined` makes it unrated, and a rating is kept to 0-10. */
export function setOtherTrait(character: V20Character, index: number, change: Partial<OtherTrait>): V20Character {
  if (!inRange(character.otherTraits, index)) return character;
  return {
    ...character,
    otherTraits: updateAt(character.otherTraits, index, (trait) => {
      const { rating, ...rest } = { ...trait, ...change };
      if (rating === undefined || Number.isNaN(rating)) return rest;
      return { ...rest, rating: Math.min(10, Math.max(0, Math.trunc(rating))) };
    }),
  };
}

// Removing and putting back

export type Family = 'backgrounds' | PointedFamily | 'havens' | 'otherTraits';

/** What was taken out, and where: all that is needed to put it back exactly. */
export type Removal =
  | { family: 'backgrounds'; index: number; entry: BackgroundRow; blanked: boolean }
  | { family: PointedFamily; index: number; entry: Merit }
  | { family: 'havens'; index: number; entry: Haven }
  | { family: 'otherTraits'; index: number; entry: OtherTrait };

const without = <T>(list: readonly T[], index: number): T[] => list.filter((_, at) => at !== index);

const inserted = <T>(list: readonly T[], index: number, entry: T): T[] => [...list.slice(0, index), entry, ...list.slice(index)];

/**
 * Takes an entry out. The sheet always shows its first six Backgrounds, so one of those is left as an
 * empty row; any other entry is removed from its list. Nothing for an index that is not there.
 */
export function removeEntry(character: V20Character, family: Family, index: number): { character: V20Character; removal: Removal } | undefined {
  if (!inRange(character[family], index)) return undefined;
  if (family === 'backgrounds') {
    const entry = character.backgrounds[index];
    const blanked = character.backgrounds.length <= BACKGROUND_ROWS;
    const backgrounds = blanked ? updateAt(character.backgrounds, index, () => ({ name: '', rating: 0 })) : without(character.backgrounds, index);
    return { character: { ...character, backgrounds }, removal: { family, index, entry, blanked } };
  }
  const entry = character[family][index];
  return {
    character: { ...character, [family]: without<unknown>(character[family], index) },
    removal: { family, index, entry } as Removal,
  };
}

const isEmptyRow = (row: BackgroundRow): boolean => row.name === '' && row.rating === 0 && !row.summary && !row.note && !row.people?.length;

/**
 * Puts a removed entry back where it was. A blanked row that has been filled in since is never
 * overwritten: the entry goes to the end of the list instead.
 */
export function restoreEntry(character: V20Character, removal: Removal): V20Character {
  if (removal.family === 'backgrounds') {
    const row = character.backgrounds[removal.index];
    const backgrounds = !removal.blanked
      ? inserted(character.backgrounds, removal.index, removal.entry)
      : row !== undefined && isEmptyRow(row)
        ? updateAt(character.backgrounds, removal.index, () => removal.entry)
        : [...character.backgrounds, removal.entry];
    return { ...character, backgrounds };
  }
  const list = character[removal.family] as unknown[];
  return { ...character, [removal.family]: inserted(list, Math.min(removal.index, list.length), removal.entry) };
}
