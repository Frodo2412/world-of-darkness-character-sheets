Feature: The Character concept screen speaks to browsers and assistive technology

  Scenario: Only the Player field invites the browser to fill in a name
    Given I am on the Character concept screen of a new build
    Then the Player field asks the browser for the player's name
    And the Chronicle and Sire fields ask the browser for no autofill

  Scenario: The description of a chosen sample concept is announced as a status
    Given I am on the Character concept screen of a new build
    When I choose the sample concept "Intellectual"
    Then the description of Intellectual is announced as a status
    When I choose the sample concept "Soldier"
    Then the description of Soldier is announced as a status

  Scenario: Letting a sample concept go leaves the status empty
    Given I am on the Character concept screen of a new build
    And the sample concept "Intellectual" is selected
    When I choose "Intellectual" again
    Then the sample concept status is empty
