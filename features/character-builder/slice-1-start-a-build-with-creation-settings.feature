Feature: Starting a build with creation settings

  # The creation settings moved into a dialog (features/character-builder-redesign/
  # slice-2-creation-settings-in-a-dialog.feature); what stays here is the roster, a build
  # that is missing or damaged, and a browser that cannot store data.

  Scenario: Building a character opens the builder without creating a character
    Given a player with no saved characters
    When they start building a character
    Then the builder opens on the concept step
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
    And they are offered a link to the roster to build a new one
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
    And the same build has been removed in another tab
    When they set the base generation to "10th"
    Then they see a "build not found" message with a link to the roster
    And the roster lists no builds in progress

  Scenario: Building is unavailable when the browser cannot store data
    Given a browser that does not allow stored data
    When the player opens the roster
    Then the build action cannot be used
    And they are told characters cannot be saved in this browser

