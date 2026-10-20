Feature: Clan choice

  Scenario: The clan choices are the thirteen clans and Caitiff
    Given a player who has started building a character
    When they look at the clan choices
    Then apart from the "Choose a clan" placeholder the choices are exactly
      | Assamite | Brujah | Follower of Set | Gangrel | Giovanni | Lasombra | Malkavian | Nosferatu | Ravnos | Toreador | Tremere | Tzimisce | Ventrue | Caitiff |

  Scenario: A new build has no clan chosen
    Given a player who has started building a character
    When they open the clan step
    Then no clan is chosen

  Scenario: A chosen clan is kept and cannot be cleared
    Given a player who has started building a character
    When they choose the clan "Toreador"
    And they reload the builder
    Then the chosen clan is "Toreador"
    And the "Choose a clan" placeholder can no longer be chosen

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
