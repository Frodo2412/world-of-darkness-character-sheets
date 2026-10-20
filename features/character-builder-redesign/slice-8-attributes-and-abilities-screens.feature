Feature: Attributes and Abilities screens

  Background:
    Given I am on the Attributes screen of a new build

  Scenario: Every priority is always offered
    When I open the Social priority select
    Then Primary, Secondary and Tertiary are all offered

  Scenario: Choosing a rank another group holds swaps the two
    Given Physical is Primary and Social is Tertiary
    When I set Social to Primary
    Then Social is Primary and Physical is Tertiary
    And it is announced that Social is now Primary and Physical is now Tertiary
    And the status reads "Priority order is unique"

  Scenario: Re-ranking keeps the dots that still fit
    Given Social is Primary with 7 of 7 dots placed
    When I set Social to Secondary
    Then the Social pool reads "Overspent by 2"
    And no Social dot was removed

  Scenario: Choosing a rank another Abilities group holds swaps the two
    Given I am on the Abilities screen with Talents Primary, Skills Secondary and Knowledges Tertiary
    When I set Knowledges to Primary
    Then Knowledges is Primary and Talents is Tertiary
    And Skills is still Secondary
    And it is announced that Knowledges is now Primary and Talents is now Tertiary
    And the status reads "Priority order is unique"

  Scenario: Every Abilities priority is always offered
    Given I am on the Abilities screen
    When I open the Skills priority select
    Then Primary, Secondary and Tertiary are all offered

  Scenario: Attribute priorities and Ability priorities are independent
    Given Physical is Primary on the Attributes screen
    When I set Talents to Primary on the Abilities screen
    Then Physical is still Primary
    And the Attributes status reads "Priority order is unique"

  Scenario: Re-ranking an Abilities group keeps the dots that still fit
    Given Skills is Primary with 13 of 13 dots placed
    When I set Skills to Secondary
    Then the Skills pool reads "Overspent by 4"
    And no Skills dot was removed

  Scenario: An overspent group blocks Continue with its reason
    Given Social is Tertiary with 7 dots placed
    And Physical is Primary and Mental is Secondary
    Then the Social pool reads "Overspent by 4"
    And the text beside Continue reads "Social is 4 dots over · Lower it to continue"

  Scenario: Pool meter and counts
    Given Social is Primary with 4 of 7 additional dots placed
    Then the Social pool reads "3 remaining" and "4 / 7 spent · Allocation needed"

  Scenario: A finished group says so
    Given every Attribute group is fully placed
    Then each pool reads "Complete"
    And no callout is shown

  Scenario: Dots include the automatic dot
    Given a Toreador build
    Then every Attribute shows at least one dot
    And the card says dot counts include 1 automatic dot in each trait

  Scenario: An unfinished group raises a callout
    Given Physical is Tertiary with 2 of 3 additional dots placed
    Then a callout reads "Finish Physical before moving on"
    And it says 2 of 3 additional Physical dots are placed and 1 remains
    And it names Strength, Dexterity and Stamina

  Scenario: A fully placed group refuses another dot
    Given Social is Primary with 7 of 7 additional dots placed
    When I try to raise another Social Attribute
    Then I am told the Social group has no dots left
    And the Social total is unchanged

  Scenario: An Attribute cannot be lowered below its automatic dot
    Given Stamina is at 1
    When I try to lower Stamina
    Then it stays at 1

  Scenario: Remaining counts are announced
    Given Physical is Secondary with 3 of 5 additional dots placed
    When I place one more Physical dot
    Then the Physical status region reads the new remaining count
    When the last Physical dot is placed
    Then the Physical status region reads "Complete"

  Scenario: Remaining counts are announced for an Attribute group other than Physical
    Given Social is Primary with 6 of 7 additional dots placed
    When I place the last Social dot
    Then the Social status region reads "Complete"
    When I lower one Social Attribute
    Then the Social status region reads "1 remaining"

  Scenario: Remaining counts are announced for an Abilities group
    Given Skills is Secondary with 8 of 9 dots placed
    When I place the last Skills dot
    Then the Skills status region reads "Complete"
    When I lower one Skill
    Then the Skills status region reads "1 remaining"

  Scenario: A rank swap is announced once
    Given Physical is Primary and Social is Tertiary
    When I set Social to Primary
    Then exactly one message is announced and it names both groups

  Scenario: Nosferatu Appearance is fixed
    Given a Nosferatu build
    Then Appearance shows 0 as fixed, with the reason
    And its plus and minus controls are unavailable but focusable

  Scenario: What the choices say
    Given Social is Primary, Mental Secondary and Physical Tertiary
    Then a summary names Social as strongest and Physical as tertiary
    And it contains none of the words he, she, his, her, him

  Scenario: Spending more than the creation dots is not possible here
    Given Social is Primary with 7 of 7 additional dots placed
    Then the plus controls in Social are unavailable
    And the freebie points remaining on the panel are unchanged

  Scenario: Abilities are capped at 3 at creation
    Given I am on the Abilities screen with Skills ranked Secondary
    When I raise Crafts to 3
    Then the plus control on Crafts is unavailable but still focused
    And "Maximum 3" is shown beside Increase Crafts
    And the Skills group is tagged "All ratings 0–3"

  Scenario: An unfinished Abilities group raises a callout
    Given Skills is Secondary with 8 of 9 dots placed
    And Crafts is at 3
    Then a callout says 8 of 9 Skill dots are placed and 1 remains
    And it names the Skills below 3 and not Crafts

  Scenario: Abilities start at zero in 13 / 9 / 5
    Given I am on the Abilities screen
    When I rank Knowledges Primary, Skills Secondary and Talents Tertiary
    Then the pools read "13 remaining", "9 remaining" and "5 remaining"
    And every Ability reads 0

  Scenario Outline: Screen standards
    When I choose Character concept in the sidebar and then <screen>
    Then focus is on the <screen> heading
    And there is exactly one h1
    And axe reports no violations at 1512 px and 375 px
    And every control has a unique accessible name
    And the page does not scroll horizontally at 375 px
    And the page does not scroll horizontally at 320 px

    Examples:
      | screen     |
      | Attributes |
      | Abilities  |

  Scenario: Attribute screen standards with a callout and a refusal shown
    Given Physical is Tertiary with 2 of 3 additional dots placed
    And Social is Primary with 7 of 7 additional dots placed
    When I try to raise another Social Attribute
    Then a callout reads "Finish Physical before moving on"
    And I am told the Social group has no dots left
    And axe reports no violations at 1512 px and 375 px
    And every control has a unique accessible name
    And the page does not scroll horizontally at 375 px
    And the page does not scroll horizontally at 320 px

  Scenario: Attribute screen standards with an overspent group shown
    Given Social is Tertiary with 7 dots placed
    And Physical is Primary and Mental is Secondary
    Then the Social pool reads "Overspent by 4"
    And axe reports no violations at 1512 px and 375 px
    And every control has a unique accessible name
    And the page does not scroll horizontally at 375 px
    And the page does not scroll horizontally at 320 px

  Scenario: Abilities screen standards with a callout and the cap shown
    Given Skills is Secondary with 8 of 9 dots placed
    And Crafts is at 3
    When I try to raise Crafts
    Then a callout says 8 of 9 Skill dots are placed and 1 remains
    And the plus control on Crafts is unavailable but still focused
    And axe reports no violations at 1512 px and 375 px
    And every control has a unique accessible name
    And the page does not scroll horizontally at 375 px
    And the page does not scroll horizontally at 320 px
