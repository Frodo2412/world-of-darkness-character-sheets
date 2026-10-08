Feature: Builds on the roster

  Scenario: A build started from the roster is listed as in progress
    Given a player with no saved characters
    When they start building a character
    And they open the roster
    Then the roster lists "Unnamed build" as in progress

  Scenario: A build in progress is listed with characters
    Given a saved character named "Lucita"
    And a build in progress named "Beckett" of clan "Gangrel"
    When the player opens the roster
    Then the roster lists "Lucita"
    And the roster lists "Beckett" as in progress with clan "Gangrel"

  Scenario: A build can be continued from the roster
    Given a build in progress named "Beckett" with base generation "10th"
    When the player continues "Beckett" from the roster
    Then the builder is shown
    And the base generation is "10th"

  Scenario: Two unnamed builds can be told apart
    Given two builds in progress with no name
    When the player opens the roster
    Then the continue controls have different accessible names

  Scenario: A build name is shown as plain text
    Given a build in progress named "<b>Beckett</b>"
    When the player opens the roster
    Then the roster lists the text "<b>Beckett</b>"

  Scenario: An unreadable build does not hide anything else
    Given a saved character named "Lucita"
    And a build in progress named "Beckett"
    And a saved build whose data has been damaged
    When the player opens the roster
    Then the roster lists "Lucita"
    And the roster lists "Beckett" as in progress
    And the roster lists one unreadable build
    And the damaged data is exactly as it was

  Scenario: Creating a blank character leaves builds alone
    Given a build in progress named "Beckett"
    When they create a V20 character
    Then the sheet for a new blank character is shown
    And the roster still lists "Beckett" as in progress

  Scenario: The roster with builds is accessible and fits a phone
    Given a saved character, a build in progress and an unreadable build
    When the roster is checked
    Then no WCAG 2.1 AA violations are reported
    And every control has a unique, non-empty accessible name
    And at 375 pixels wide the page does not scroll horizontally
