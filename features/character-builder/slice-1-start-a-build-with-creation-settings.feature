Feature: Starting a build with creation settings

  Scenario: Building a character opens the builder with the standard settings
    Given a player with no saved characters
    When they start building a character
    Then the builder is shown on its settings step
    And the base generation is "13th"
    And the extra freebie points are 0
    And the freebie budget is 15
    And the roster lists no characters

  Scenario: The build action sits beside the blank-sheet action
    Given a player with no saved characters
    When they open the roster
    Then they see a way to create a V20 character
    And they see a way to build a character

  Scenario: Creating a blank character is unchanged
    Given a player with no saved characters
    When they create a V20 character
    Then the sheet for a new blank character is shown
    And the roster lists one character shown as "Unnamed character"

  Scenario: A Storyteller's house settings change the budgets
    Given a player who has started building a character
    When they set the base generation to "11th"
    And they set the extra freebie points to 75
    Then the freebie budget is 90
    And the maximum trait rating is 5
    And the blood pool maximum is 12
    And the blood points per turn are 1

  Scenario Outline: Generation fixes the trait and blood limits
    Given a player who has started building a character
    When they set the base generation to "<generation>"
    Then the maximum trait rating is <trait>
    And the blood pool maximum is <pool>
    And the blood points per turn are <turn>

    Examples:
      | generation | trait | pool | turn |
      | 9th        | 5     | 14   | 2    |
      | 7th        | 6     | 20   | 4    |
      | 4th        | 9     | 50   | 10   |

  Scenario: Only generations from 4th to 13th are offered
    Given a player who has started building a character
    When they look at the base generation choices
    Then the choices run from "4th" to "13th" and nothing else

  Scenario Outline: Extra freebie points outside 0 to 999 are rejected
    Given a player who has set the extra freebie points to 20
    When they enter "<entry>" as the extra freebie points
    Then they are told, beside the field, that extra freebie points must be a whole number from 0 to 999
    And the field is marked invalid and still shows "<entry>"
    And the freebie budget is still 35

    Examples:
      | entry |
      | -1    |
      | 1000  |
      | 2.5   |
      | lots  |

  Scenario: An emptied extra freebie points field is rejected
    Given a player who has set the extra freebie points to 20
    When they clear the extra freebie points and leave the field
    Then they are told, beside the field, that extra freebie points must be a whole number from 0 to 999
    And the freebie budget is still 35

  Scenario: A rejected entry is not saved
    Given a player who has set the extra freebie points to 20
    When they enter "1000" as the extra freebie points
    And they reload the builder
    Then the extra freebie points are 20

  Scenario: Typing a number is judged only when the entry is finished
    Given a player who has set the extra freebie points to 90
    When they type "2" then "0" in place of the extra freebie points without leaving the field
    Then no message is shown beside the field
    And leaving the field sets the freebie budget to 35

  Scenario: The largest allowed extra freebie points are accepted
    Given a player who has started building a character
    When they set the extra freebie points to 999
    Then the freebie budget is 1014

  Scenario: Correcting a rejected entry clears its message
    Given a player whose extra freebie points entry "1000" was rejected
    When they set the extra freebie points to 50
    Then no message is shown beside the field
    And the freebie budget is 65

  Scenario: Settings survive a reload
    Given a player who has set the base generation to "9th" and the extra freebie points to 30
    When they reload the builder
    Then the base generation is "9th"
    And the extra freebie points are 30

  Scenario Outline: A builder address that names no build is reported, not created
    Given a player with no saved characters
    When they open the builder address <address>
    Then they see a "build not found" message with a link to the roster
    And no build has been saved

    Examples:
      | address                           |
      | of a build that does not exist    |
      | with no build id                  |

  Scenario: A build that cannot be read is reported and left untouched
    Given a saved build whose data has been damaged
    When the player opens that build
    Then they are told the build could not be read and has not been changed
    And they are offered a link to the roster to delete it or build a new one
    And the damaged data is exactly as it was

  Scenario: A refused save is reported and the builder stays usable
    Given a player who has started building a character
    And the browser has started refusing to store data
    When they set the base generation to "10th"
    Then they are told changes are not being saved and not to close or reload the page
    And the base generation is "10th"
    And they can still set the extra freebie points to 5

  Scenario: The not-saved message stays until a save works
    Given a player whose last change could not be saved
    When their entry "1000" as the extra freebie points is rejected
    Then the not-saved message is still shown

  Scenario: The not-saved message clears when saving works again
    Given a player whose last change could not be saved
    And the browser accepts stored data again
    When they set the base generation to "9th"
    Then the not-saved message is gone
    And reloading the builder shows the base generation "9th"

  Scenario: A build deleted in another tab is not saved again
    Given a player with the builder open on a build
    And the same build has been deleted from the roster in another tab
    When they set the base generation to "10th"
    Then they see a "build not found" message with a link to the roster
    And the roster lists no builds in progress

  Scenario: Building is unavailable when the browser cannot store data
    Given a browser that does not allow stored data
    When the player opens the roster
    Then the build action cannot be used
    And they are told characters cannot be saved in this browser

  Scenario: The settings step is accessible and fits a phone
    Given a player who has started building a character
    When the settings step is checked
    Then no WCAG 2.1 AA violations are reported
    And every control has a unique, non-empty accessible name
    And at 375 pixels wide the page does not scroll horizontally
