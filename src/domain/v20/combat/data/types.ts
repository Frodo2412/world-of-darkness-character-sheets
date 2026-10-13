// Shapes shared by the combat reference data: the V20 chapter nine
// manoeuvres and weapons (pp. 274-281). Static data, never stored.

/**
 * A damage dice pool as the book prints it. `strength` is the dice added to the character's
 * Strength ("Str +1" is `{ strength: 1 }`, plain "Str" is `{ strength: 0 }`); `flat` is a fixed
 * pool ("4" is `{ flat: 4 }`). Set one of the two.
 */
export interface Damage {
  readonly strength?: number;
  readonly flat?: number;
}

/** How well a weapon hides on the person: P pocket, J jacket, T trenchcoat, N not at all. */
export type Conceal = 'P' | 'J' | 'T' | 'N';

/** The meaning of each concealment letter, as the Ranged Weapons Chart (p. 281) states it. */
export const CONCEALMENT: Readonly<Record<Conceal, string>> = {
  P: 'Can be carried in the pocket',
  J: 'Can be hidden in a jacket',
  T: 'Can be hidden in a trenchcoat',
  N: 'Cannot be concealed on the person at all',
};

interface WeaponBase {
  readonly name: string;
  readonly damage: Damage;
  readonly conceal: Conceal;
  /** A footnote of the chart that belongs to this weapon, as the book states it. */
  readonly note?: string;
  /** The V20 page of the chart row. */
  readonly page: number;
}

export interface MeleeWeapon extends WeaponBase {
  readonly kind: 'melee';
  readonly type: 'bashing' | 'lethal';
}

/** A firearm or crossbow of the Ranged Weapons Chart. Its damage is a flat pool; `range` is the short range in yards or meters. */
export interface RangedWeapon extends WeaponBase {
  readonly kind: 'ranged';
  readonly range: number;
  /** The most bullets or three-round bursts it fires in a turn. */
  readonly rate: number;
  /** The shells it holds; `chambered` is the chart's "+1": a bullet held in the chamber, ready to fire. */
  readonly clip: number;
  readonly chambered: boolean;
  /** The chart's asterisk: capable of three-round bursts, full auto and sprays. */
  readonly automatic: boolean;
  /** The chart's example make and model, when it prints one. */
  readonly example?: string;
}

/** A rulebook weapon; `kind` says which chart it is on. */
export type Weapon = MeleeWeapon | RangedWeapon;
