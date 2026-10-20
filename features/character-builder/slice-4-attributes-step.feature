Feature: Attributes step

  Scenario: Ranking the groups sets their allotments
    Given a player on the attributes step
    When they rank Physical primary, Social secondary and Mental tertiary
    Then Physical has 7 dots remaining
    And Social has 5 dots remaining
    And Mental has 3 dots remaining

  Scenario: Dots cannot be placed in an unranked group
    Given a player on the attributes step with no ranks chosen
    When they try to raise Strength to 2
    Then they are told, beside the Physical group, to rank the group first
    And Strength is rated 1

  Scenario: An Attribute offers no dot above the maximum trait rating
    Given a 13th generation build with Physical ranked primary
    When they raise Strength to 5
    Then Strength is rated 5
    And Strength reports 5 as its highest rating

  Scenario: A more potent generation raises the Attribute maximum
    Given a 7th generation build with Physical ranked primary
    When they raise Strength to 6
    Then Strength is rated 6

  Scenario: A refusal clears after the next accepted change
    Given a player who was just told Mental has no dots remaining
    When they lower Perception by 1
    Then no message is shown beside the Mental group

  Scenario: Ranking one group leaves unranked groups alone
    Given a player on the attributes step with no ranks chosen
    When they rank Social primary
    Then Social is primary
    And Physical and Mental have no rank

  Scenario: An unranked group taking a held rank leaves the other group unranked
    Given a player who has ranked Physical primary and raised Strength to 4
    When they rank Social primary
    Then Social is primary and Physical has no rank
    And they are told Social is now Primary and Physical now has no rank, so 3 Physical dots are overspent until Physical is ranked
    And Strength is rated 4

  Scenario: Lowering from the keyboard stops at the real floor
    Given a player who has ranked Physical primary and raised Stamina to 3
    When using only the keyboard they focus Decrease Stamina and press Enter 3 times
    Then Stamina is rated 1
    And Stamina reports 1 as its lowest rating

  Scenario: Lowering an overspent group clears the report
    Given a build whose Physical group is overspent by 1 dot
    When they lower Strength by 1
    Then Physical has 0 dots remaining
    And Physical is no longer reported as overspent

  Scenario: Becoming a Nosferatu asks before removing Appearance dots
    Given a build of clan "Toreador" with Social ranked primary and Appearance rated 4
    When they choose the clan "Nosferatu"
    Then they are asked to confirm that Appearance will be set to 0 and 3 dots returned to Social
    And declining keeps the clan "Toreador" and Appearance rated 4

  Scenario: Confirming the change to Nosferatu returns the dots
    Given a build of clan "Toreador" with Social ranked primary and Appearance rated 4
    When they choose the clan "Nosferatu" and confirm
    Then they are told Appearance was set to 0 and 3 dots were returned to Social
    And Social has 7 dots remaining

  Scenario: Leaving Clan Nosferatu restores the free Appearance dot
    Given a build of clan "Nosferatu"
    When they choose the clan "Brujah"
    Then Appearance is rated 1
    And no confirmation was asked

  Scenario: Attribute choices survive a reload
    Given a player who has ranked Physical primary and raised Dexterity to 3
    When they reload the builder
    Then Physical is primary
    And Dexterity is rated 3
