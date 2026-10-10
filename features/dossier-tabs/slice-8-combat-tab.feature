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
