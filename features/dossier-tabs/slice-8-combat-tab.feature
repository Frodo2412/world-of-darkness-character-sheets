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
    When the player adds one die and raises the difficulty by one on the Combat tab
    Then the attack pool reads "4 dice" and the difficulty reads 7 on the Combat tab
    When the player chooses the Target "Small (hand, head, cellphone)" on the Combat tab
    Then the difficulty reads 9 on the Combat tab
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

  Scenario: Nothing is rolled
    Given a character with Dexterity 3 and Melee 0 with the Sap and "Weapon Strike" selected on the Combat tab
    Then the Weapon roll panel has no control whose name contains "Roll" on the Combat tab
    And the Weapon roll panel says "Pools only — roll your own dice." on the Combat tab
    And repeated redraws of the Weapon roll panel show no random result on the Combat tab

