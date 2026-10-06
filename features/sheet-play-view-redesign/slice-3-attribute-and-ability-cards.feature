Feature: Attribute and ability cards

  Scenario: Attributes and Abilities are laid out as cards
    Given a player viewing a saved character's sheet on a 1512 pixel wide screen
    Then Attributes shows the cards Physical, Social and Mental side by side
    And Abilities shows the cards Talents, Skills and Knowledges side by side
    And the Abilities heading carries the hint "Read-only in play · edit character to change"

  Scenario Outline: Ratings are shown as dots and a number
    Given a saved character whose Strength is rated <rating>
    When the player opens that character from the roster
    Then Strength shows <filled> filled dots out of <dots> and the number <rating>
    And Strength reads "Strength <rating> of <dots>" to assistive technology

    Examples:
      | rating | filled | dots |
      | 0      | 0      | 5    |
      | 5      | 5      | 5    |
      | 6      | 6      | 10   |

  Scenario: A rating above five does not push its row out of line
    Given a saved character whose Strength is rated 8 and whose Dexterity is rated 2
    When the player opens that character on a 320 pixel wide screen
    Then the Strength and Dexterity numbers line up
    And the page does not scroll sideways

  Scenario: A named custom ability is listed in play mode
    Given a saved character with the custom Talent "Hobby Talent" rated 2, a custom Skill named with only spaces and no custom Knowledge
    When the player opens that character from the roster
    Then the Talents list ends with "Hobby Talent" rated 2
    And the Skills and Knowledges lists show only their ten fixed abilities

  Scenario: Custom abilities can always be written in while editing
    Given the player is editing a saved character
    Then each of Talents, Skills and Knowledges offers a write-in ability with a name and a rating

  Scenario: Fields the play view no longer shows are not offered
    Given the player is editing a saved character
    Then there is no field for Notes, Weakness or Experience
    And no creation reminder is shown
