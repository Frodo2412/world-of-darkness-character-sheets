Feature: Character roster

  Scenario: Empty roster invites creation
    Given a player with no saved characters
    When they open the roster
    Then they see a message that there are no characters yet
    And they see a way to create a V20 character

  Scenario: Creating a character opens its sheet
    Given a player with no saved characters
    When they create a V20 character
    Then the sheet for a new blank character is shown
    And the roster lists one character shown as "Unnamed character"

  Scenario: Several characters are independent
    Given a player who has created two characters
    When they open the roster
    Then two separate characters are listed
    And opening each one shows a different sheet address

  Scenario: Roster shows identifying details
    Given a saved character named "Lucita" of clan "Lasombra" played by "Ana"
    When the player opens the roster
    Then the entry shows "Lucita" and "Lasombra"
    And the entry does not show "Ana"

  Scenario: Roster survives a reload
    Given a player who has created a character
    When they reload the roster
    Then the character is still listed
