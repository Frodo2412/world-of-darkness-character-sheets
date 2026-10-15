// What raising a trait one dot costs in experience, by the V20 table in `experience/costs.ts`. The
// multipliers are read from that table, never restated here.

import type { V20Character } from '../character';
import { CLANS } from '../creation/rules';
import { costRule, type CostKey } from '../experience/costs';
import { caseFolded } from '../text';
import { subjectKind, subjectLabel, subjectMaximum, subjectRating, type Subject } from './subjects';

export type ClanClass = 'in-clan' | 'out-of-clan' | 'caitiff';

const sameWords = (a: string, b: string): boolean => caseFolded(a).replace(/\s+/g, ' ') === caseFolded(b).replace(/\s+/g, ' ');

/**
 * What the clan text makes a Discipline: in-clan or out-of-clan for one of the thirteen clans (matched
 * whatever the case and spacing), and Caitiff cost for Caitiff, a blank clan or any text that is not a clan.
 */
export function clanClass(character: V20Character, discipline: string): ClanClass {
  const clan = CLANS.find((entry) => sameWords(entry.name, character.header.clan));
  if (clan === undefined || clan.disciplines.length === 0) return 'caitiff';
  return clan.disciplines.some((own) => sameWords(own, discipline)) ? 'in-clan' : 'out-of-clan';
}

const DISCIPLINE_KEYS: Readonly<Record<ClanClass, CostKey>> = {
  'in-clan': 'inClanDiscipline',
  'out-of-clan': 'outOfClanDiscipline',
  caitiff: 'caitiffDiscipline',
};

/** What the cost table calls each kind of advancement, as the review names its rule. */
const RULE_NAMES: Readonly<Record<CostKey, string>> = {
  newAbility: 'New Ability',
  ability: 'Existing Ability',
  attribute: 'Attribute',
  inClanDiscipline: 'In-clan Discipline',
  outOfClanDiscipline: 'Out-of-clan Discipline',
  caitiffDiscipline: 'Caitiff Discipline',
  virtue: 'Virtue',
  humanity: 'Humanity / Path',
  willpower: 'Willpower (permanent)',
};

export type Cost =
  | { maximum: true }
  | {
      maximum: false;
      /** The experience the next dot costs. */
      xp: number;
      /** The row of the cost table that prices it. */
      key: CostKey;
      /** The rating it is priced from. */
      current: number;
      /** The rule at length: "Existing Ability · current 2 × 2 = 4 XP". */
      rule: string;
      /** The rule at its shortest: "Existing Ability · 2 × 2". */
      shortRule: string;
    };

/** The cost-table row that prices raising this trait from `current`. */
function costKeyOf(character: V20Character, subject: Subject, current: number): CostKey {
  switch (subjectKind(subject)) {
    case 'attribute':
      return 'attribute';
    case 'ability':
      return current === 0 ? 'newAbility' : 'ability';
    case 'discipline':
      return DISCIPLINE_KEYS[clanClass(character, subjectLabel(character, subject))];
    case 'virtue':
      return 'virtue';
    case 'humanity':
      return 'humanity';
    case 'willpower':
      return 'willpower';
  }
}

/**
 * The cost of raising a trait by one dot, or "maximum" when it cannot go higher. Nothing for a trait that
 * cannot be raised at all: a Discipline row that is empty, unnamed or not there is not offered.
 */
export function advancementCost(character: V20Character, subject: Subject): Cost | undefined {
  const current = subjectRating(character, subject);
  if (current === undefined) return undefined;
  if (subjectKind(subject) === 'discipline' && (current < 1 || subjectLabel(character, subject) === '')) return undefined;
  if (current >= subjectMaximum(subject)) return { maximum: true };

  const key = costKeyOf(character, subject, current);
  const entry = costRule(key);
  const name = RULE_NAMES[key];
  if (entry.cost.basis === 'flat') {
    return { maximum: false, xp: entry.cost.xp, key, current, rule: `${name} · flat cost = ${entry.cost.xp} XP`, shortRule: `${name} · flat cost` };
  }
  const xp = current * entry.cost.multiplier;
  const times = entry.cost.multiplier === 1 ? '' : ` × ${entry.cost.multiplier}`;
  return {
    maximum: false,
    xp,
    key,
    current,
    rule: `${name} · current ${current}${times} = ${xp} XP`,
    shortRule: `${name} · ${current}${times}`,
  };
}
