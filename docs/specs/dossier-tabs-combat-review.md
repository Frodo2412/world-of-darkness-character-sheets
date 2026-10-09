# Combat data review checklist

For the pull request review of `src/domain/v20/combat/data/`. One row per manoeuvre, weapon and modifier, and per field, with the V20 page where the value is printed. Page numbers are the printed page numbers of *Vampire: The Masquerade, 20th Anniversary Edition* (pp. 274-281; the running head of these pages reads "Chapter Six: Systems and Drama"). Tick a row by checking the value against that page.

## Pinned ranged example (for Slice 8)

Slice 8's feature file (`features/dossier-tabs/slice-8-*.feature`) does not exist in the first pull request. Step 5.3 therefore records the pinned example here, and a unit test (`ranged.test.ts`) fails if this line and the data ever differ. Slice 8 copies these values into its scenario "Ranged manoeuvres and weapons list the rulebook entries". The chart names the weapon "Revolver, Lt." (example: SW Bodyguard (.38 Special)); the scenario's wording "the light revolver" refers to it.

Pinned ranged example: Revolver, Lt. | damage 4 | range 12 | rate 3 | clip 6 | conceal P | p. 281

## How the values were read

- **Close combat manoeuvres** are the thirteen rows of the Close Combat Maneuvers Table and the **ranged manoeuvres** the five rows of the Ranged Combat Maneuvers Table, both on p. 279. Each value was also read from the manoeuvre's own entry; the page in the checklist is where that entry begins (the table is p. 279 for every row). The table prints "3-Round Burst"; the entry heading, and the data, say "Three-Round Burst".
- **accuracy** and **difficulty**: "Normal" is 0 and "+N" is N. Accuracy "Special" (Block, Dodge, Parry, Multiple Shots) is kept as the word, not a number. Two Weapons prints "+1/off-hand": difficulty +1, noted as applying to the off-hand attack only.
- **damage**: "Str" is Strength with no added dice, "Str +1" Strength plus one, and a weapon's damage is the weapon's own ("Weapon"). "Special" and "None" are kept as the words. The table's footnotes become **effects**: (A) aggravated, (C) carries over, (K) knockdown, (R) reduces an opponent's attack successes.
- **requirement** is a reading of the entry, not a table column. Weapon Strike and Parry ("using a weapon to block") need a melee weapon; Multiple Shots and Two Weapons need a ranged weapon; Automatic Fire, Strafing and Three-Round Burst need a ranged weapon the chart marks with an asterisk. Claw is "available to vampires with claws, such as those from the Protean power of Feral Claws or bone spurs constructed with the Vicissitude power of Bonecraft"; the book's "such as" is not exhaustive, so the data lists these two powers only. Bite "must first perform a successful clinch, hold, or tackle". That Bite and Claw are for vampires or other supernatural creatures is not modelled, as the sheet is a vampire's. The tags are derived: a weapon requirement is "Weapon required", a power or prior manoeuvre is "Prerequisite".
- **Melee weapons**: the Melee Weapons Chart (p. 280) prints damage and concealment only. **type** is Bashing for the weapons it marks with + (blunt objects: Sap, Club) and Lethal for the rest because p. 276 says melee attacks are "typically lethal"; the chart prints no type, so that page is cited. Notes are the chart's footnotes, word for word except the cross-reference.
- **Ranged weapons**: the Ranged Weapons Chart (p. 281). **clip** is the chart's capacity; "+1" is a bullet held in the chamber. The chart gives no damage type per weapon, so none is stored. A field the book does not print is _undefined_ in the data: the Crossbow prints no example.
- **Called shots** are the Targeting table (p. 274): "No modifier" damage is 0. **Range** is the Range maneuver (p. 278): within two meters is point blank (difficulty 4), the weapon's listed range is short range (6) and up to twice that is long range (8).
- Not in the data, because the book gives them no traits, accuracy, difficulty and damage: Aborting Actions, Ambush, Blind Fighting/Fire, Flank and Rear Attacks, Movement, Multiple Actions, Multiple Opponents, Weapon Length, Aiming, Cover, Reloading and the Maneuver Complications. The Armor Chart (p. 280), the Cover table (p. 278) and the stake rule (p. 280, in the Stake's note) are also left out of the tables; the Combat tab does not list armor.

## Close combat manoeuvres

| Entry | Field | Value | V20 page |
| --- | --- | --- | --- |
| Bite | traits | Dex + Brawl | 276; table 279 |
| Bite | accuracy | +1 | 276; table 279 |
| Bite | difficulty | Normal | 276; table 279 |
| Bite | damage | Str +1 | 276; table 279 |
| Bite | effects | (A) aggravated damage | 276; table 279 |
| Bite | requirement | A successful Clinch, Hold, or Tackle first (tag: Prerequisite) | 276 |
| Block | traits | Dex + Brawl | 275; table 279 |
| Block | accuracy | Special | 275; table 279 |
| Block | difficulty | Normal | 275; table 279 |
| Block | damage | None | 275; table 279 |
| Block | effects | (R) reduces an opponent's attack successes | 275; table 279 |
| Block | requirement | none | 275 |
| Claw | traits | Dex + Brawl | 276; table 279 |
| Claw | accuracy | Normal | 276; table 279 |
| Claw | difficulty | Normal | 276; table 279 |
| Claw | damage | Str +1 | 276; table 279 |
| Claw | effects | (A) aggravated damage | 276; table 279 |
| Claw | requirement | One of: Protean: Feral Claws; Vicissitude: Bonecraft (tag: Prerequisite) | 276 |
| Clinch | traits | Str + Brawl | 276; table 279 |
| Clinch | accuracy | Normal | 276; table 279 |
| Clinch | difficulty | Normal | 276; table 279 |
| Clinch | damage | Str | 276; table 279 |
| Clinch | effects | (C) carries over on successive turns | 276; table 279 |
| Clinch | requirement | none | 276 |
| Disarm | traits | Dex + Melee | 276; table 279 |
| Disarm | accuracy | Normal | 276; table 279 |
| Disarm | difficulty | +1 | 276; table 279 |
| Disarm | damage | Special | 276; table 279 |
| Disarm | effects | none | 276; table 279 |
| Disarm | requirement | none | 276 |
| Dodge | traits | Dex + Athletics | 275; table 279 |
| Dodge | accuracy | Special | 275; table 279 |
| Dodge | difficulty | Normal | 275; table 279 |
| Dodge | damage | None | 275; table 279 |
| Dodge | effects | (R) reduces an opponent's attack successes | 275; table 279 |
| Dodge | requirement | none | 275 |
| Hold | traits | Str + Brawl | 276; table 279 |
| Hold | accuracy | Normal | 276; table 279 |
| Hold | difficulty | Normal | 276; table 279 |
| Hold | damage | None | 276; table 279 |
| Hold | effects | (C) carries over on successive turns | 276; table 279 |
| Hold | requirement | none | 276 |
| Kick | traits | Dex + Brawl | 276; table 279 |
| Kick | accuracy | Normal | 276; table 279 |
| Kick | difficulty | +1 | 276; table 279 |
| Kick | damage | Str +1 | 276; table 279 |
| Kick | effects | none | 276; table 279 |
| Kick | requirement | none | 276 |
| Parry | traits | Dex + Melee | 275; table 279 |
| Parry | accuracy | Special | 275; table 279 |
| Parry | difficulty | Normal | 275; table 279 |
| Parry | damage | None | 275; table 279 |
| Parry | effects | (R) reduces an opponent's attack successes | 275; table 279 |
| Parry | requirement | A melee weapon (tag: Weapon required) | 275 |
| Strike | traits | Dex + Brawl | 276; table 279 |
| Strike | accuracy | Normal | 276; table 279 |
| Strike | difficulty | Normal | 276; table 279 |
| Strike | damage | Str | 276; table 279 |
| Strike | effects | none | 276; table 279 |
| Strike | requirement | none | 276 |
| Sweep | traits | Dex + Brawl/Melee | 276; table 279 |
| Sweep | accuracy | Normal | 276; table 279 |
| Sweep | difficulty | +1 | 276; table 279 |
| Sweep | damage | Str | 276; table 279 |
| Sweep | effects | (K) causes knockdown | 276; table 279 |
| Sweep | requirement | none | 276 |
| Tackle | traits | Str + Brawl | 277; table 279 |
| Tackle | accuracy | Normal | 277; table 279 |
| Tackle | difficulty | +1 | 277; table 279 |
| Tackle | damage | Str +1 | 277; table 279 |
| Tackle | effects | (K) causes knockdown | 277; table 279 |
| Tackle | requirement | none | 277 |
| Weapon Strike | traits | Dex + Melee | 277; table 279 |
| Weapon Strike | accuracy | Normal | 277; table 279 |
| Weapon Strike | difficulty | Normal | 277; table 279 |
| Weapon Strike | damage | Weapon | 277; table 279 |
| Weapon Strike | effects | none | 277; table 279 |
| Weapon Strike | requirement | A melee weapon (tag: Weapon required) | 277 |

## Ranged combat manoeuvres

| Entry | Field | Value | V20 page |
| --- | --- | --- | --- |
| Automatic Fire | traits | Dex + Firearms | 278; table 279 |
| Automatic Fire | accuracy | +10 | 278; table 279 |
| Automatic Fire | difficulty | +2 | 278; table 279 |
| Automatic Fire | damage | Special | 278; table 279 |
| Automatic Fire | effects | none | 278; table 279 |
| Automatic Fire | requirement | A ranged weapon capable of bursts and full auto (asterisked on the chart) (tag: Weapon required) | 278 |
| Multiple Shots | traits | Dex + Firearms | 278; table 279 |
| Multiple Shots | accuracy | Special | 278; table 279 |
| Multiple Shots | difficulty | Normal | 278; table 279 |
| Multiple Shots | damage | Weapon | 278; table 279 |
| Multiple Shots | effects | none | 278; table 279 |
| Multiple Shots | requirement | A ranged weapon (tag: Weapon required) | 278 |
| Strafing | traits | Dex + Firearms | 278; table 279 |
| Strafing | accuracy | +10 | 278; table 279 |
| Strafing | difficulty | +2 | 278; table 279 |
| Strafing | damage | Special | 278; table 279 |
| Strafing | effects | none | 278; table 279 |
| Strafing | requirement | A ranged weapon capable of bursts and full auto (asterisked on the chart) (tag: Weapon required) | 278 |
| Three-Round Burst | traits | Dex + Firearms | 278; table 279 |
| Three-Round Burst | accuracy | +2 | 278; table 279 |
| Three-Round Burst | difficulty | +1 | 278; table 279 |
| Three-Round Burst | damage | Weapon | 278; table 279 |
| Three-Round Burst | effects | none | 278; table 279 |
| Three-Round Burst | requirement | A ranged weapon capable of bursts and full auto (asterisked on the chart) (tag: Weapon required) | 278 |
| Two Weapons | traits | Dex + Firearms | 278; table 279 |
| Two Weapons | accuracy | Normal | 278; table 279 |
| Two Weapons | difficulty | +1 (off-hand only) | 278; table 279 |
| Two Weapons | damage | Weapon | 278; table 279 |
| Two Weapons | effects | none | 278; table 279 |
| Two Weapons | requirement | A ranged weapon (tag: Weapon required) | 278 |

## Melee weapons

| Entry | Field | Value | V20 page |
| --- | --- | --- | --- |
| Sap | damage | Strength +1 | 280 |
| Sap | type | Bashing (blunt object, marked + on the chart) | 280 |
| Sap | conceal | P | 280 |
| Sap | note | Blunt objects inflict bashing damage unless targeted at the head. Head shots inflict lethal damage. | 280 |
| Club | damage | Strength +2 | 280 |
| Club | type | Bashing (blunt object, marked + on the chart) | 280 |
| Club | conceal | T | 280 |
| Club | note | Blunt objects inflict bashing damage unless targeted at the head. Head shots inflict lethal damage. | 280 |
| Knife | damage | Strength +1 | 280 |
| Knife | type | Lethal (melee attacks are "typically lethal", p. 276; the chart prints no type) | 280; 276 |
| Knife | conceal | J | 280 |
| Knife | note | _undefined_ | 280 |
| Sword | damage | Strength +2 | 280 |
| Sword | type | Lethal (melee attacks are "typically lethal", p. 276; the chart prints no type) | 280; 276 |
| Sword | conceal | T | 280 |
| Sword | note | _undefined_ | 280 |
| Axe | damage | Strength +3 | 280 |
| Axe | type | Lethal (melee attacks are "typically lethal", p. 276; the chart prints no type) | 280; 276 |
| Axe | conceal | N | 280 |
| Axe | note | _undefined_ | 280 |
| Stake | damage | Strength +1 | 280 |
| Stake | type | Lethal (melee attacks are "typically lethal", p. 276; the chart prints no type) | 280; 276 |
| Stake | conceal | T | 280 |
| Stake | note | May paralyze a vampire if driven through the heart. The attacker must target the heart (difficulty 9) and score three damage successes. | 280 |

## Ranged weapons

| Entry | Field | Value | V20 page |
| --- | --- | --- | --- |
| Revolver, Lt. | damage | 4 | 281 |
| Revolver, Lt. | range | 12 | 281 |
| Revolver, Lt. | rate | 3 | 281 |
| Revolver, Lt. | clip | 6 | 281 |
| Revolver, Lt. | conceal | P | 281 |
| Revolver, Lt. | bursts and full auto (*) | no | 281 |
| Revolver, Lt. | example | SW Bodyguard (.38 Special) | 281 |
| Revolver, Lt. | note | _undefined_ | 281 |
| Revolver, Hvy. | damage | 6 | 281 |
| Revolver, Hvy. | range | 35 | 281 |
| Revolver, Hvy. | rate | 2 | 281 |
| Revolver, Hvy. | clip | 6 | 281 |
| Revolver, Hvy. | conceal | J | 281 |
| Revolver, Hvy. | bursts and full auto (*) | no | 281 |
| Revolver, Hvy. | example | Ruger Redhawk (.44 Magnum) | 281 |
| Revolver, Hvy. | note | _undefined_ | 281 |
| Pistol, Lt. | damage | 4 | 281 |
| Pistol, Lt. | range | 20 | 281 |
| Pistol, Lt. | rate | 4 | 281 |
| Pistol, Lt. | clip | 15 (+1 in the chamber) | 281 |
| Pistol, Lt. | conceal | P | 281 |
| Pistol, Lt. | bursts and full auto (*) | no | 281 |
| Pistol, Lt. | example | HK USP (9mm) | 281 |
| Pistol, Lt. | note | _undefined_ | 281 |
| Pistol, Hvy. | damage | 5 | 281 |
| Pistol, Hvy. | range | 25 | 281 |
| Pistol, Hvy. | rate | 3 | 281 |
| Pistol, Hvy. | clip | 13 (+1 in the chamber) | 281 |
| Pistol, Hvy. | conceal | J | 281 |
| Pistol, Hvy. | bursts and full auto (*) | no | 281 |
| Pistol, Hvy. | example | Springfield XDM (.45 ACP) | 281 |
| Pistol, Hvy. | note | _undefined_ | 281 |
| Rifle | damage | 8 | 281 |
| Rifle | range | 200 | 281 |
| Rifle | rate | 1 | 281 |
| Rifle | clip | 3 (+1 in the chamber) | 281 |
| Rifle | conceal | N | 281 |
| Rifle | bursts and full auto (*) | no | 281 |
| Rifle | example | Beretta Tikka T3 (30.06) | 281 |
| Rifle | note | _undefined_ | 281 |
| SMG, Small | damage | 4 | 281 |
| SMG, Small | range | 20 | 281 |
| SMG, Small | rate | 3 | 281 |
| SMG, Small | clip | 17 (+1 in the chamber) | 281 |
| SMG, Small | conceal | J | 281 |
| SMG, Small | bursts and full auto (*) | yes | 281 |
| SMG, Small | example | Glock 18 (9mm) | 281 |
| SMG, Small | note | _undefined_ | 281 |
| SMG, Large | damage | 4 | 281 |
| SMG, Large | range | 50 | 281 |
| SMG, Large | rate | 3 | 281 |
| SMG, Large | clip | 30 (+1 in the chamber) | 281 |
| SMG, Large | conceal | T | 281 |
| SMG, Large | bursts and full auto (*) | yes | 281 |
| SMG, Large | example | HK MP5 (9mm) | 281 |
| SMG, Large | note | _undefined_ | 281 |
| Assault Rifle | damage | 7 | 281 |
| Assault Rifle | range | 150 | 281 |
| Assault Rifle | rate | 3 | 281 |
| Assault Rifle | clip | 30 (+1 in the chamber) | 281 |
| Assault Rifle | conceal | N | 281 |
| Assault Rifle | bursts and full auto (*) | yes | 281 |
| Assault Rifle | example | FN SCAR (5.56mm) | 281 |
| Assault Rifle | note | _undefined_ | 281 |
| Shotgun | damage | 8 | 281 |
| Shotgun | range | 20 | 281 |
| Shotgun | rate | 1 | 281 |
| Shotgun | clip | 5 (+1 in the chamber) | 281 |
| Shotgun | conceal | T | 281 |
| Shotgun | bursts and full auto (*) | no | 281 |
| Shotgun | example | Remington 870 (12-Gauge) | 281 |
| Shotgun | note | _undefined_ | 281 |
| Shotgun, Semi-auto | damage | 8 | 281 |
| Shotgun, Semi-auto | range | 20 | 281 |
| Shotgun, Semi-auto | rate | 3 | 281 |
| Shotgun, Semi-auto | clip | 6 (+1 in the chamber) | 281 |
| Shotgun, Semi-auto | conceal | T | 281 |
| Shotgun, Semi-auto | bursts and full auto (*) | no | 281 |
| Shotgun, Semi-auto | example | Benelli M4 Super 90 (12-Gauge) | 281 |
| Shotgun, Semi-auto | note | _undefined_ | 281 |
| Crossbow | damage | 5 | 281 |
| Crossbow | range | 20 | 281 |
| Crossbow | rate | 1 | 281 |
| Crossbow | clip | 1 | 281 |
| Crossbow | conceal | T | 281 |
| Crossbow | bursts and full auto (*) | no | 281 |
| Crossbow | example | _undefined_ | 281 |
| Crossbow | note | The crossbow is included for characters who wish to try staking an opponent. Crossbows require five turns to reload. Unless the crossbow is aimed at the head or heart, it inflicts bashing damage on Kindred. It inflicts lethal damage versus mortals. | 281 |

## Called shots (Targeting)

| Entry | Field | Value | V20 page |
| --- | --- | --- | --- |
| Medium | examples | limb, briefcase | 274 |
| Medium | difficulty | +1 | 274 |
| Medium | damage | No modifier (0) | 274 |
| Small | examples | hand, head, cellphone | 274 |
| Small | difficulty | +2 | 274 |
| Small | damage | +1 | 274 |
| Precise | examples | eye, heart, lock | 274 |
| Precise | difficulty | +3 | 274 |
| Precise | damage | +2 | 274 |

## Range

| Entry | Field | Value | V20 page |
| --- | --- | --- | --- |
| Point blank | reach | Within 2 meters | 278 |
| Point blank | difficulty | 4 | 278 |
| Short range | reach | Up to the weapon's range | 278 |
| Short range | difficulty | 6 | 278 |
| Long range | reach | Up to 2 times the weapon's range | 278 |
| Long range | difficulty | 8 | 278 |
