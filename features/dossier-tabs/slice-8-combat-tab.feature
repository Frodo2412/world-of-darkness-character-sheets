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

  Scenario: A weapon is chosen for the roll from its row and dropped by choosing it again
    Given a character with Dexterity 3 and Melee 0 on the Combat tab
    When the player presses "Use in roll" for the Sap on the Combat tab
    Then "Use in roll" is pressed for the Sap alone on the Combat tab
    When the player presses "Use in roll" for the Axe on the Combat tab
    Then "Use in roll" is pressed for the Axe alone on the Combat tab
    When the player presses "Use in roll" for the Axe on the Combat tab
    Then "Use in roll" is pressed for no weapon on the Combat tab
