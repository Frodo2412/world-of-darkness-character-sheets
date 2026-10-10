Feature: Combat tab

  Scenario: Manoeuvres show the character's pool
    Given a character with Dexterity 3, Brawl 1 and a Hurt wound (1 die off every pool) on the Combat tab
    When the Combat tab is opened
    Then Strike shows "3 dice" with "Dexterity 3 + Brawl 1 − wound 1" on the Combat tab
    And these manoeuvres show "3 dice" and the rulebook's values on the Combat tab
      | Manoeuvre | Accuracy | Difficulty | Base damage | Page |
      | Strike    | Normal   | Normal     | Str         | p. 276 |
      | Kick      | Normal   | +1         | Str +1      | p. 276 |
      | Claw      | Normal   | Normal     | Str +1      | p. 276 |
    And the character's name, the mode toggle, the save status and the resources row are shown

  Scenario: Melee weapons list the rulebook entries with the character's pool
    Given a character with Dexterity 3 and Melee 0 on the Combat tab
    When Melee is chosen on the Combat tab
    Then every melee weapon shows "3 dice" and its V20 page "p. 280" on the Combat tab
    And the melee weapons show the rulebook's damage, type and concealment on the Combat tab
      | Weapon | Damage | Type    | Concealment |
      | Sap    | Str +1 | Bashing | P           |
      | Club   | Str +2 | Bashing | T           |
      | Knife  | Str +1 | Lethal  | J           |
      | Sword  | Str +2 | Lethal  | T           |
      | Axe    | Str +3 | Lethal  | N           |
      | Stake  | Str +1 | Lethal  | T           |

  Scenario: Ranged manoeuvres and weapons list the rulebook entries
    Given a character with Dexterity 3 and Firearms 2 on the Combat tab
    When Ranged is chosen on the Combat tab
    Then "Three-Round Burst" shows "5 dice", accuracy "+2", difficulty "+1" and damage "Weapon" on the Combat tab
    And "Automatic Fire" shows accuracy "+10", difficulty "+2" and damage "Special" on the Combat tab
    And "Revolver, Lt." shows damage 4, range 12, rate 3, clip 6, concealment "P" and "p. 281" on the Combat tab
    And "Revolver, Lt." shows "5 dice" on the Combat tab
    And "Pistol, Lt." shows clip "15 (+1 in the chamber)" on the Combat tab

  Scenario: A weapon is chosen for the roll from its row and dropped by choosing it again
    Given a character with Dexterity 3 and Melee 0 on the Combat tab
    When the player presses "Use in roll" for the Sap on the Combat tab
    Then "Use in roll" is pressed for the Sap alone on the Combat tab
    When the player presses "Use in roll" for the Axe on the Combat tab
    Then "Use in roll" is pressed for the Axe alone on the Combat tab
    When the player presses "Use in roll" for the Axe on the Combat tab
    Then "Use in roll" is pressed for no weapon on the Combat tab

  Scenario: The section control and search narrow the tables
    When the Combat tab is opened
    Then "All" is chosen and thirteen close combat manoeuvres, five ranged manoeuvres, six melee weapons and eleven ranged weapons are listed on the Combat tab
    When the player chooses "Close combat" on the Combat tab
    Then only the thirteen close combat manoeuvres and the six melee weapons are listed and the Melee sub-tab is selected on the Combat tab
    When the player chooses "Ranged combat" on the Combat tab
    Then only the five ranged manoeuvres and the eleven ranged weapons are listed and the Ranged sub-tab is selected on the Combat tab
    When Melee is chosen on the Combat tab
    Then "Close combat" is chosen on the Combat tab
    When the player chooses "All" on the Combat tab
    And the player searches "stake" on the Combat tab
    Then only the one melee weapon Stake is listed on the Combat tab
    When the player searches "revolver" on the Combat tab
    Then the ranged weapons table lists exactly "Revolver, Lt." and "Revolver, Hvy." on the Combat tab
    And only the two ranged weapons are listed on the Combat tab
    When the player chooses "Close combat" on the Combat tab
    Then "No manoeuvres or weapons match." is shown on the Combat tab
    When the player searches "zzzz" on the Combat tab
    Then "No manoeuvres or weapons match." is shown on the Combat tab

  Scenario: Selecting a weapon and manoeuvre builds the attack pool
    Given a character with Dexterity 3 and Melee 0 on the Combat tab
    When the player selects the Sap and "Weapon Strike" on the Combat tab
    Then the attack pool reads "3 dice" with "Dexterity 3 + Melee 0" on the Combat tab
    And accuracy reads "Normal" and difficulty reads 6 on the Combat tab

  Scenario: Modifiers and Target change the pool and are forgotten on leaving
    Given a character with Dexterity 3, Melee 0 and Strength 2 with the Sap and "Weapon Strike" selected on the Combat tab
    And the Weapon roll panel shows an attack pool of 3 dice, accuracy "Normal" and difficulty 6 on the Combat tab
    And the damage pool reads 3 dice on the Combat tab
    When the player adds one die and raises the difficulty by one on the Combat tab
    Then the attack pool reads "4 dice" and the difficulty reads 7 on the Combat tab
    When the player chooses the Target "Small (hand, head, cellphone)" on the Combat tab
    Then the difficulty reads 9 on the Combat tab
    And the damage pool reads 4 dice on the Combat tab
    And the Targeting table entry it follows reads difficulty "+2" and damage "+1" (V20 p. 274) on the Combat tab
    When the player leaves the Combat tab for the Character sheet tab and returns without reloading on the Combat tab
    Then the dice modifier and the difficulty modifier read 0 on the Combat tab
    And Target and Range are back at their defaults on the Combat tab
    And the stored record is identical to the record before the visit on the Combat tab

  Scenario: A dice modifier larger than the pool floors the attack pool at zero
    Given a character with Dexterity 3 and Melee 0 with the Sap and "Weapon Strike" selected on the Combat tab
    When the player sets the dice modifier to -5 on the Combat tab
    Then the attack pool reads "0 dice" on the Combat tab

  Scenario Outline: Range sets the base difficulty
    Given a character with Dexterity 3 and Firearms 2 with "Revolver, Lt." and "Multiple Shots" selected on the Combat tab
    When the player chooses the Range "<range>" on the Combat tab
    Then the difficulty reads <difficulty> on the Combat tab

    Examples:
      | range       | difficulty |
      | Point blank | 4          |
      | Short range | 6          |
      | Long range  | 8          |

  Scenario: The damage pool adds the weapon and the extra successes
    Given a character with Strength 3 on the Combat tab
    When the player selects the Sap and enters 2 extra successes on the Combat tab
    Then the damage pool reads 6 dice on the Combat tab
    And the damage is Bashing and its difficulty reads 6 on the Combat tab

  Scenario: Flat damage and a negative entry
    Given a character with Strength 3 with "Revolver, Lt." and "Multiple Shots" selected on the Combat tab
    Then the damage pool reads 4 dice on the Combat tab
    When the player enters -2 extra successes on the Combat tab
    Then the entry shows 0 on the Combat tab
    And "Extra successes kept at 0 or more." is shown on the Combat tab
    And the damage pool still reads 4 dice on the Combat tab
    When the player enters 1 extra successes on the Combat tab
    Then the damage pool reads 5 dice on the Combat tab
    And "Extra successes kept at 0 or more." is not shown on the Combat tab

  Scenario: Nothing is rolled
    Given a character with Dexterity 3 and Melee 0 with the Sap and "Weapon Strike" selected on the Combat tab
    Then the Weapon roll panel has no control whose name contains "Roll" on the Combat tab
    And the Weapon roll panel says "Pools only — roll your own dice." on the Combat tab
    And repeated redraws of the Weapon roll panel show no random result on the Combat tab

  Scenario: A manoeuvre the character cannot use says why
    Given a character with Protean 1 and no weapon selected on the Combat tab
    When the Combat tab is opened
    Then Claw is marked "Unavailable" and "Prerequisite" on the Combat tab
    And Claw states its requirement "One of: Protean: Feral Claws; Vicissitude: Bonecraft" on the Combat tab
    And Weapon Strike is marked "Weapon required" and states "A melee weapon" on the Combat tab

  Scenario: A manoeuvre becomes usable when the requirement is met
    Given a character with Protean 2 on the Combat tab
    When the Combat tab is opened
    Then Claw is not marked "Unavailable" or "Prerequisite" on the Combat tab
    When the player selects the Sap on the Combat tab
    Then Weapon Strike no longer says "Weapon required" and uses the Sap on the Combat tab

  Scenario: A manoeuvre that needs a prior manoeuvre says what comes first
    Given a character with Dexterity 3 on the Combat tab
    When the Combat tab is opened
    Then Bite is marked "Unavailable" and "Prerequisite" on the Combat tab
    And Bite states its requirement "A successful Clinch, Hold, or Tackle first" on the Combat tab

  Scenario: A ranged manoeuvre needs a ranged weapon, and bursts need one the chart marks
    Given a character with Dexterity 3 and Firearms 2 with "Revolver, Lt." and "Multiple Shots" selected on the Combat tab
    Then Multiple Shots no longer says "Weapon required" and uses the Revolver, Lt. on the Combat tab
    And Three-Round Burst is marked "Weapon required" and states "A ranged weapon capable of bursts and full auto (asterisked on the chart)" on the Combat tab
    When the player selects the SMG, Large on the Combat tab
    Then Three-Round Burst no longer says "Weapon required" and uses the SMG, Large on the Combat tab

  Scenario Outline: A Prerequisite manoeuvre is marked until its power is known
    Given a character with <discipline> <rating> on the Combat tab
    When the Combat tab is opened
    Then Claw is <marking> on the Combat tab

    Examples:
      | discipline  | rating | marking                                                                           |
      | Protean     | 1      | marked "Prerequisite" with "One of: Protean: Feral Claws; Vicissitude: Bonecraft" |
      | Protean     | 2      | not marked                                                                        |
      | Vicissitude | 2      | marked "Prerequisite" with "One of: Protean: Feral Claws; Vicissitude: Bonecraft" |
      | Vicissitude | 3      | not marked                                                                        |

  Scenario: An incapacitated character has no pools
    Given a character with Dexterity 3, Strength 3 and the health track fully marked Incapacitated on the Combat tab
    When the player selects the Sap and "Weapon Strike" on the Combat tab
    Then every manoeuvre and weapon pool reads "0 dice" on the Combat tab
    And the attack pool reads "0 dice" and the damage pool reads "0 dice" on the Combat tab
    And "Incapacitated: every pool is 0 dice." is shown on the Combat tab

  Scenario: A Crippled wound floors a pool at zero
    Given a character with Dexterity 3, Brawl 1 and a Crippled wound (5 dice off every pool) on the Combat tab
    When the Combat tab is opened
    Then Strike shows "0 dice" with "Dexterity 3 + Brawl 1 − wound 5" on the Combat tab
    And "Incapacitated: every pool is 0 dice." is not shown on the Combat tab

  Scenario: The reminders and disclaimers are shown
    When the Combat tab is opened
    Then the reminders card lists "Range and cover" (V20 p. 278), "Called shots" (V20 p. 274), "Staking" (V20 p. 280) and "Grappling" (V20 p. 276) on the Combat tab
    And "Rulebook reference — not owned equipment" is shown on the Combat tab
    And "Base pools shown without Celerity, blood boosts, armor or situational modifiers" is shown on the Combat tab

  Scenario: The Combat tab is accessible and fits a phone
    Given a character with Dexterity 5, Strength 8 and Firearms 4 on the Combat tab
    And a weapon, modifiers, a Target, a Range and a search are entered on the Combat tab
    When the Combat tab is scanned for accessibility problems
    Then no problems are reported
    When the Combat tab is opened at 320 pixels wide with crowded content
    And a weapon, modifiers, a Target, a Range and a search are entered on the Combat tab
    Then the page does not scroll sideways
    And the reference tables scroll inside their own containers on the Combat tab

