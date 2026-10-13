// The Melee Weapons Chart of V20 chapter nine (p. 280). The chart prints
// damage and concealment only: a weapon the chart marks as a blunt object (+)
// inflicts bashing damage, every other melee attack is "typically lethal"
// (p. 276).

import type { MeleeWeapon } from './types';

const BLUNT_NOTE = 'Blunt objects inflict bashing damage unless targeted at the head. Head shots inflict lethal damage.';

export const MELEE_WEAPONS: readonly MeleeWeapon[] = [
  { kind: 'melee', name: 'Sap', damage: { strength: 1 }, type: 'bashing', conceal: 'P', note: BLUNT_NOTE, page: 280 },
  { kind: 'melee', name: 'Club', damage: { strength: 2 }, type: 'bashing', conceal: 'T', note: BLUNT_NOTE, page: 280 },
  { kind: 'melee', name: 'Knife', damage: { strength: 1 }, type: 'lethal', conceal: 'J', page: 280 },
  { kind: 'melee', name: 'Sword', damage: { strength: 2 }, type: 'lethal', conceal: 'T', page: 280 },
  { kind: 'melee', name: 'Axe', damage: { strength: 3 }, type: 'lethal', conceal: 'N', page: 280 },
  {
    kind: 'melee',
    name: 'Stake',
    damage: { strength: 1 },
    type: 'lethal',
    conceal: 'T',
    note: 'May paralyze a vampire if driven through the heart. The attacker must target the heart (difficulty 9) and score three damage successes.',
    page: 280,
  },
];
