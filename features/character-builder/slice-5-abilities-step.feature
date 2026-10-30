Feature: Abilities step

  Scenario: An Ability can be lowered back to 0
    Given a player who has ranked Skills secondary and raised Stealth to 2
    When they lower Stealth to 0
    Then Skills has 9 dots remaining

  Scenario: Ability choices survive a reload
    Given a player who has ranked Skills primary and raised Firearms to 2
    When they reload the builder
    Then Skills is primary
    And Firearms is rated 2
