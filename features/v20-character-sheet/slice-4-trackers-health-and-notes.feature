Feature: Trackers, health and notes

  Scenario: Health levels are labelled
    Given a player viewing a character's sheet
    Then the health track shows Bruised 0, Hurt −1, Injured −1, Wounded −2, Mauled −2, Crippled −5 and Incapacitated — in that order

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
