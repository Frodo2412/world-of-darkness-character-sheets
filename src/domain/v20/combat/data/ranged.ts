// The Ranged Weapons Chart of V20 chapter nine (p. 281). Damage is the chart's
// damage dice pool; the chart does not give a damage type per weapon (see its
// notes: firearms are lethal against mortals and bashing against vampires
// unless the head is targeted).

import type { Conceal, RangedWeapon } from './types';

interface Row {
  readonly name: string;
  readonly damage: number;
  readonly range: number;
  readonly rate: number;
  readonly clip: number;
  readonly chambered?: true;
  readonly conceal: Conceal;
  readonly automatic?: true;
  readonly example?: string;
  readonly note?: string;
}

const CROSSBOW_NOTE =
  'The crossbow is included for characters who wish to try staking an opponent. Crossbows require five turns to reload. Unless the crossbow is aimed at the head or heart, it inflicts bashing damage on Kindred. It inflicts lethal damage versus mortals.';

const ROWS: readonly Row[] = [
  { name: 'Revolver, Lt.', damage: 4, range: 12, rate: 3, clip: 6, conceal: 'P', example: 'SW Bodyguard (.38 Special)' },
  { name: 'Revolver, Hvy.', damage: 6, range: 35, rate: 2, clip: 6, conceal: 'J', example: 'Ruger Redhawk (.44 Magnum)' },
  { name: 'Pistol, Lt.', damage: 4, range: 20, rate: 4, clip: 15, chambered: true, conceal: 'P', example: 'HK USP (9mm)' },
  { name: 'Pistol, Hvy.', damage: 5, range: 25, rate: 3, clip: 13, chambered: true, conceal: 'J', example: 'Springfield XDM (.45 ACP)' },
  { name: 'Rifle', damage: 8, range: 200, rate: 1, clip: 3, chambered: true, conceal: 'N', example: 'Beretta Tikka T3 (30.06)' },
  { name: 'SMG, Small', damage: 4, range: 20, rate: 3, clip: 17, chambered: true, conceal: 'J', automatic: true, example: 'Glock 18 (9mm)' },
  { name: 'SMG, Large', damage: 4, range: 50, rate: 3, clip: 30, chambered: true, conceal: 'T', automatic: true, example: 'HK MP5 (9mm)' },
  { name: 'Assault Rifle', damage: 7, range: 150, rate: 3, clip: 30, chambered: true, conceal: 'N', automatic: true, example: 'FN SCAR (5.56mm)' },
  { name: 'Shotgun', damage: 8, range: 20, rate: 1, clip: 5, chambered: true, conceal: 'T', example: 'Remington 870 (12-Gauge)' },
  { name: 'Shotgun, Semi-auto', damage: 8, range: 20, rate: 3, clip: 6, chambered: true, conceal: 'T', example: 'Benelli M4 Super 90 (12-Gauge)' },
  { name: 'Crossbow', damage: 5, range: 20, rate: 1, clip: 1, conceal: 'T', note: CROSSBOW_NOTE },
];

export const RANGED_WEAPONS: readonly RangedWeapon[] = ROWS.map(
  ({ damage, chambered, automatic, ...row }): RangedWeapon => ({
    kind: 'ranged',
    ...row,
    damage: { flat: damage },
    chambered: chambered === true,
    automatic: automatic === true,
    page: 281,
  }),
);
