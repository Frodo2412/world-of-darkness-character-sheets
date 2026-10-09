// The V20 experience cost table as data. The Journal's quick reference lists
// it and Level up prices advancements from it, so the labels live here once.

export type CostKey =
  | 'newAbility'
  | 'ability'
  | 'attribute'
  | 'inClanDiscipline'
  | 'outOfClanDiscipline'
  | 'caitiffDiscipline'
  | 'virtue'
  | 'humanity'
  | 'willpower';

/** What raising a trait costs: a fixed amount, or the trait's current rating times a multiplier. */
export type XpBasis = { basis: 'flat'; xp: number } | { basis: 'current'; multiplier: number };

export interface XpCost {
  key: CostKey;
  /** The trait as the table names it. */
  label: string;
  /** The cost in words, as the table shows it. */
  rule: string;
  cost: XpBasis;
}

const perCurrent = (multiplier: number): XpBasis => ({ basis: 'current', multiplier });

/** In the order the V20 table lists them. */
export const XP_COSTS: readonly XpCost[] = [
  { key: 'newAbility', label: 'New Ability', rule: '3', cost: { basis: 'flat', xp: 3 } },
  { key: 'ability', label: 'Ability', rule: 'Current rating × 2', cost: perCurrent(2) },
  { key: 'attribute', label: 'Attribute', rule: 'Current rating × 4', cost: perCurrent(4) },
  { key: 'inClanDiscipline', label: 'In-clan Discipline', rule: 'Current rating × 5', cost: perCurrent(5) },
  { key: 'outOfClanDiscipline', label: 'Out-of-clan Discipline', rule: 'Current rating × 7', cost: perCurrent(7) },
  { key: 'caitiffDiscipline', label: 'Caitiff Discipline', rule: 'Current rating × 6', cost: perCurrent(6) },
  { key: 'virtue', label: 'Virtue', rule: 'Current rating × 2', cost: perCurrent(2) },
  { key: 'humanity', label: 'Humanity / Path', rule: 'Current rating × 2', cost: perCurrent(2) },
  { key: 'willpower', label: 'Willpower', rule: 'Current rating', cost: perCurrent(1) },
];

export function costRule(key: CostKey): XpCost {
  return XP_COSTS.find((entry) => entry.key === key)!;
}
