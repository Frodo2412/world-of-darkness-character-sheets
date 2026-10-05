Feature: Trackers, health and notes

  Scenario: Spending and regaining temporary Willpower
    Given temporary Willpower shows 0 boxes marked
    When the player activates the 5th temporary Willpower box
    Then 5 boxes are marked
    When the player activates the 5th box again
    Then 4 boxes are marked

  Scenario: Temporary Willpower is independent of permanent Willpower
    Given permanent Willpower shows 3 dots
    When the player activates the 10th temporary Willpower box
    Then 10 temporary boxes are marked and permanent Willpower still shows 3 dots

  Scenario: Blood Pool
    Given the Blood Pool shows 0 boxes marked
    When the player activates the 50th Blood Pool box
    Then 50 boxes are marked and there is no 51st box
    When the player activates the 1st Blood Pool box twice
    Then 0 boxes are marked

  Scenario: Blood Per Turn
    When the player enters "3" as Blood Per Turn and reloads the sheet
    Then Blood Per Turn shows "3"

  Scenario: Health levels are labelled
    Given a player viewing a character's sheet
    Then the health track shows Bruised, Hurt -1, Injured -1, Wounded -2, Mauled -2, Crippled -5 and Incapacitated in that order

  Scenario: A health box cycles through damage types
    Given the Bruised box is empty
    When the player activates it
    Then it shows bashing damage
    When the player activates it again
    Then it shows lethal damage
    When the player activates it again
    Then it shows aggravated damage
    When the player activates it again
    Then it is empty

  Scenario: Health boxes are independent
    Given every health box is empty
    When the player activates the Wounded box twice
    Then Wounded shows lethal damage and every other box is empty

  Scenario: Damage type is announced, not only drawn
    Given the Hurt box shows lethal damage
    Then assistive technology reports "Hurt, lethal"

  Scenario: Trackers are saved
    Given the player marks 4 temporary Willpower, 12 Blood Pool and aggravated damage on Hurt
    When they reload the sheet
    Then the same marks are shown
