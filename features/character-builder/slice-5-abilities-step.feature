Feature: Abilities step

  Scenario: Abilities start with no dots
    Given a player who has started building a character
    When they open the abilities step
    Then all thirty Abilities are rated 0

  Scenario: Ranking the groups sets their allotments
    Given a player on the abilities step
    When they rank Talents primary, Skills secondary and Knowledges tertiary
    Then Talents has 13 dots remaining
    And Skills has 9 dots remaining
    And Knowledges has 5 dots remaining

  Scenario: An Ability can be raised to 3 with creation dots
    Given a player who has ranked Talents primary
    When they raise Brawl to 3
    Then Brawl is rated 3
    And Talents has 10 dots remaining

  Scenario: No Ability goes above 3 at this stage, whatever the generation
    Given a 4th generation build with Talents ranked primary
    And Brawl is rated 3
    When they try to raise Brawl to 4
    Then they are told Abilities cannot go above 3 before freebie points, which are spent on Finishing touches
    And Brawl is rated 3

  Scenario: A group cannot exceed its allotment
    Given a player who has ranked Knowledges tertiary
    And Investigation is rated 3 and Medicine is rated 2
    When they try to raise Occult to 1
    Then they are told, beside the Knowledges group, that Knowledges has no dots remaining
    And Occult is rated 0

  Scenario: An Ability can be lowered back to 0
    Given a player who has ranked Skills secondary and raised Stealth to 2
    When they lower Stealth to 0
    Then Skills has 9 dots remaining

  Scenario: Ability choices survive a reload
    Given a player who has ranked Skills primary and raised Firearms to 2
    When they reload the builder
    Then Skills is primary
    And Firearms is rated 2

  Scenario: The abilities step is accessible and fits a phone
    Given a build with ranked Ability groups and dots placed
    When the abilities step is checked
    Then no WCAG 2.1 AA violations are reported
    And every control has a unique, non-empty accessible name
    And at 375 pixels wide the page does not scroll horizontally
    And with a group's last row scrolled into view, that group's remaining-dots readout is inside the viewport
