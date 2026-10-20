Feature: Clan choice

  Scenario: A chosen clan is kept and cannot be cleared
    Given a player who has started building a character
    When they choose the clan "Toreador"
    Then the chosen clan is "Toreador"
    And choosing "Toreador" again leaves it chosen

  Scenario: Choosing a clan opens the way to the next screen
    Given a player who has started building a character
    When they choose the clan "Toreador"
    Then Continue reads "Continue to Nature & Demeanor" and is enabled

  Scenario: The clan question is said through a status region that is already on the page
    Given a build of clan "Toreador" with Social ranked primary and Appearance rated 4
    When they open the clan step
    Then the clan question's status region is on the page and says nothing
    When they choose the clan "Nosferatu"
    Then the clan question's status region says "Switching to Nosferatu:"
