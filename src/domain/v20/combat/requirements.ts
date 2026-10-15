// Whether the character can use a manoeuvre, and what it still asks for. Computed on every draw.

import { namedRows, type V20Character } from '../character';
import { DISCIPLINE_CATALOGUE, disciplineEntry } from '../disciplines';
import { MANOEUVRES, tagsOf, type Manoeuvre, type ManoeuvreTag, type Requirement } from './data/manoeuvres';
import type { Weapon } from './data/types';

export interface Availability {
  /** Why the character cannot use it at all, in words; undefined when they can. */
  unavailable?: string;
  /** Why it still needs a weapon, while none that fits is selected. */
  weaponNeeded?: string;
  /** What it must follow, for a manoeuvre that is performed after another. */
  prerequisite?: string;
  /** The tags the table draws beside the name: "Weapon required" until a weapon fits, "Prerequisite". */
  tags: ManoeuvreTag[];
}

type PowerRequirement = Extract<Requirement, { kind: 'power' }>;

const powerName = ({ discipline, power }: PowerRequirement['anyOf'][number]): string => `${discipline}: ${power}`;

/** The Discipline level at which the catalogue gives the power, or undefined for one it does not list. */
function powerLevel(discipline: string, power: string): number | undefined {
  const at = disciplineEntry(discipline)?.powers.findIndex((candidate) => candidate.name === power);
  return at === undefined || at < 0 ? undefined : at + 1;
}

/** Whether the character holds any of the powers: the Discipline named, rated at least the power's level. */
export function hasPower(character: V20Character, requirement: PowerRequirement): boolean {
  return requirement.anyOf.some(({ discipline, power }) => {
    const level = powerLevel(discipline, power);
    if (level === undefined) return false;
    return namedRows(character.disciplines).some(
      (row) => disciplineEntry(row.name)?.name === disciplineEntry(discipline)?.name && row.rating >= level,
    );
  });
}

function weaponFits(requirement: Extract<Requirement, { kind: 'weapon' }>, weapon: Weapon | undefined): boolean {
  if (weapon === undefined || weapon.kind !== requirement.weapon) return false;
  return requirement.automatic !== true || (weapon.kind === 'ranged' && weapon.automatic);
}

const weaponNeed = (requirement: Extract<Requirement, { kind: 'weapon' }>): string =>
  requirement.weapon === 'melee'
    ? 'Needs a melee weapon.'
    : requirement.automatic === true
      ? 'Needs a ranged weapon that fires bursts or full auto.'
      : 'Needs a ranged weapon.';

/** What the character can do with a manoeuvre, given the weapon selected (if any). */
export function manoeuvreAvailability(character: V20Character, manoeuvre: Manoeuvre, weapon?: Weapon): Availability {
  const availability: Availability = { tags: [] };
  for (const requirement of manoeuvre.requirements) {
    if (requirement.kind === 'power' && !hasPower(character, requirement)) {
      availability.unavailable = `Requires ${requirement.anyOf.map(powerName).join(' or ')}.`;
    } else if (requirement.kind === 'weapon' && !weaponFits(requirement, weapon)) {
      availability.weaponNeeded = weaponNeed(requirement);
    } else if (requirement.kind === 'prior') {
      availability.prerequisite = `After a successful ${requirement.anyOf.slice(0, -1).join(', ')} or ${requirement.anyOf.at(-1)}.`;
    }
  }
  // The "Prerequisite" tag stands for a power or a prior manoeuvre; once the power is held it is not a prerequisite any more.
  availability.tags = tagsOf(manoeuvre).filter((tag) => {
    if (tag === 'Weapon required') return availability.weaponNeeded !== undefined;
    return availability.prerequisite !== undefined || availability.unavailable !== undefined;
  });
  return availability;
}

/** The manoeuvre of the table with this name. */
export function manoeuvreNamed(name: string): Manoeuvre | undefined {
  return MANOEUVRES.find((manoeuvre) => manoeuvre.name === name);
}

/** Every Discipline power the manoeuvres ask for must be one the catalogue lists: a guard for the data. */
export function unknownPowers(): string[] {
  const listed = new Set(DISCIPLINE_CATALOGUE.flatMap((entry) => entry.powers.map((power) => `${entry.name}: ${power.name}`)));
  return MANOEUVRES.flatMap((manoeuvre) => manoeuvre.requirements)
    .filter((requirement): requirement is PowerRequirement => requirement.kind === 'power')
    .flatMap((requirement) => requirement.anyOf.map(powerName))
    .filter((name) => !listed.has(name));
}
