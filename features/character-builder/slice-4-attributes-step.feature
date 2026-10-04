Feature: Attributes step

  Scenario: Every Attribute starts with one free dot
    Given a player who has started building a character
    When they open the attributes step
    Then every Attribute is rated 1
    And no Attribute group has a rank yet
    And each group says to rank it before placing dots

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

  Scenario: Placing dots uses up the allotment
    Given a player who has ranked Physical primary
    When they raise Strength to 4
    Then Physical has 4 dots remaining

  Scenario: A group cannot exceed its allotment
    Given a player who has ranked Mental tertiary
    And Perception is rated 3 and Intelligence is rated 2
    When they try to raise Wits to 2
    Then they are told, beside the Mental group, that Mental has no dots remaining and more can be bought with freebie points on Finishing touches
    And Wits is rated 1

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

  Scenario: Taking a rank another group holds swaps the two groups
    Given a player who has ranked Physical primary, Social secondary and Mental tertiary
    When they rank Mental primary
    Then Mental is primary and Physical is tertiary
    And they are told both changes: Mental is now primary and Physical is now tertiary

  Scenario: Ranking one group leaves unranked groups alone
    Given a player on the attributes step with no ranks chosen
    When they rank Social primary
    Then Social is primary
    And Physical and Mental have no rank

  Scenario: An unranked group taking a held rank leaves the other group unranked
    Given a player who has ranked Physical primary and raised Strength to 4
    When they rank Social primary
    Then Social is primary and Physical has no rank
    And they are told Social is now primary and Physical now has no rank, so its 3 dots are overspent until it is ranked
    And Strength is rated 4

  Scenario: Home on a rating goes to its real floor
    Given a player who has ranked Physical primary and raised Stamina to 3
    When using only the keyboard they focus Stamina and press Home
    Then Stamina is rated 1
    And Stamina reports 1 as its lowest rating

  Scenario: Re-ranking keeps dots that still fit
    Given a player who has ranked Physical primary and raised Strength to 4
    When they rank Physical secondary
    Then Strength is rated 4
    And Physical has 2 dots remaining

  Scenario: Re-ranking a group below what it holds reports it as overspent
    Given a player who has ranked Physical primary and placed all 7 Physical dots
    When they rank Physical tertiary
    Then Physical is reported in words as overspent by 4 dots, with the instruction to lower Physical traits by 4
    And the Physical ratings are unchanged
    And the step navigation marks the Attributes step "overspent"

  Scenario: Lowering an overspent group clears the report
    Given a build whose Physical group is overspent by 1 dot
    When they lower Strength by 1
    Then Physical has 0 dots remaining
    And Physical is no longer reported as overspent

  Scenario: The free dot cannot be removed
    Given a player who has ranked Physical primary
    When they try to lower Stamina to 0
    Then Stamina is rated 1
    And Stamina reports 1 as its lowest rating

  Scenario: A Nosferatu has no Appearance
    Given a build of clan "Nosferatu" with Social ranked primary
    When they open the attributes step
    Then Appearance is rated 0 and is announced as fixed for Nosferatu
    And Social has 7 dots remaining

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

  Scenario: The attributes step is accessible and fits a phone
    Given a build with ranked Attribute groups, an overspent group and a refusal showing
    When the attributes step is checked
    Then no WCAG 2.1 AA violations are reported
    And every control has a unique, non-empty accessible name
    And at 375 pixels wide the page does not scroll horizontally
