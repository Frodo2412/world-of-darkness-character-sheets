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
