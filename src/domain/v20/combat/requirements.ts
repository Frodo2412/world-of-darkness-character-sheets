// What a manoeuvre needs before the character can use it, read against the character and the weapon
// chosen for the roll: a weapon in hand, a Discipline power, or a manoeuvre performed first. Computed on
// every draw, never stored.

import type { V20Character } from '../character';
import { disciplineReadings } from '../disciplines';
import type { Manoeuvre, ManoeuvreTag, Requirement } from './data/manoeuvres';
import type { Weapon } from './data/types';

export interface RequirementReading {
  requirement: Requirement;
  /** "Weapon required" for a weapon; "Prerequisite" for a power or a prior manoeuvre. */
  tag: ManoeuvreTag;
  /** What is needed, as the book words it: "A melee weapon", "One of: Protean: Feral Claws; Vicissitude: Bonecraft". */
  text: string;
  met: boolean;
}

/** "Clinch, Hold, or Tackle": the names in a list, the way the book writes it. */
function listOf(names: readonly string[]): string {
  if (names.length <= 2) return names.join(' or ');
  return `${names.slice(0, -1).join(', ')}, or ${names[names.length - 1]}`;
}

/** What the requirement asks for, in the book's words. */
export function requirementText(requirement: Requirement): string {
  switch (requirement.kind) {
    case 'weapon':
      if (requirement.automatic) return 'A ranged weapon capable of bursts and full auto (asterisked on the chart)';
      return requirement.weapon === 'melee' ? 'A melee weapon' : 'A ranged weapon';
    case 'power': {
      const powers = requirement.anyOf.map(({ discipline, power }) => `${discipline}: ${power}`);
      return powers.length === 1 ? powers[0] : `One of: ${powers.join('; ')}`;
    }
    case 'prior':
      return `A successful ${listOf(requirement.anyOf)} first`;
  }
}

const powerKey = (discipline: string, power: string): string => `${discipline.trim().replace(/\s+/g, ' ').toLowerCase()}:${power}`;

/**
 * Reads the requirements of manoeuvres for a character with `weapon` chosen. A weapon requirement is
 * met by a weapon of the kind it names (and, for bursts and full auto, one the chart marks with an asterisk).
 * A power requirement is met by a rating that reaches the power. A prior manoeuvre is never met: the sheet
 * does not know what has happened in the scene, so it only says what is needed first.
 */
export function requirementChecker(character: V20Character, weapon?: Weapon): (manoeuvre: Manoeuvre) => RequirementReading[] {
  const known = new Set(
    disciplineReadings(character).flatMap((reading) => reading.powers.map((power) => powerKey(reading.name, power.name))),
  );
  const met = (requirement: Requirement): boolean => {
    switch (requirement.kind) {
      case 'weapon':
        return weapon?.kind === requirement.weapon && (requirement.automatic !== true || (weapon.kind === 'ranged' && weapon.automatic));
      case 'power':
        return requirement.anyOf.some(({ discipline, power }) => known.has(powerKey(discipline, power)));
      case 'prior':
        return false;
    }
  };
  return (manoeuvre) =>
    manoeuvre.requirements.map((requirement) => ({
      requirement,
      tag: requirement.kind === 'weapon' ? 'Weapon required' : 'Prerequisite',
      text: requirementText(requirement),
      met: met(requirement),
    }));
}
