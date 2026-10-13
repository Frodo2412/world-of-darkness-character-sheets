// The called-shot and range modifiers that drive Target and Range in the
// Weapon roll panel: the Targeting table (p. 274) and the Range maneuver
// (p. 278).

/** A row of the Targeting table: the difficulty and damage added to aim at a smaller part of the target. */
export interface CalledShot {
  readonly key: 'medium' | 'small' | 'precise';
  /** The table's "Target Size". */
  readonly label: string;
  /** The table's examples in parentheses. */
  readonly examples: string;
  /** Added to the attack's difficulty. */
  readonly difficulty: number;
  /** Added to the damage dice pool; the table's "No modifier" is 0. */
  readonly damage: number;
  readonly page: number;
}

export const CALLED_SHOTS: readonly CalledShot[] = [
  { key: 'medium', label: 'Medium', examples: 'limb, briefcase', difficulty: 1, damage: 0, page: 274 },
  { key: 'small', label: 'Small', examples: 'hand, head, cellphone', difficulty: 2, damage: 1, page: 274 },
  { key: 'precise', label: 'Precise', examples: 'eye, heart, lock', difficulty: 3, damage: 2, page: 274 },
];

/** How far the target is: within two meters, up to the weapon's range, or up to twice that. */
export interface RangeBand {
  readonly key: 'point-blank' | 'short' | 'long';
  readonly label: string;
  /** The reach of the band: `withinMeters` from the shooter, or `timesRange` the weapon's range. */
  readonly reach: { readonly withinMeters: number } | { readonly timesRange: number };
  /** The attack's difficulty at this range, before manoeuvre and called-shot modifiers. */
  readonly difficulty: number;
  readonly page: number;
}

export const RANGE_BANDS: readonly RangeBand[] = [
  { key: 'point-blank', label: 'Point blank', reach: { withinMeters: 2 }, difficulty: 4, page: 278 },
  { key: 'short', label: 'Short range', reach: { timesRange: 1 }, difficulty: 6, page: 278 },
  { key: 'long', label: 'Long range', reach: { timesRange: 2 }, difficulty: 8, page: 278 },
];
