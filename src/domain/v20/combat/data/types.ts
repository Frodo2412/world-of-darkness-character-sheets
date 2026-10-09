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
