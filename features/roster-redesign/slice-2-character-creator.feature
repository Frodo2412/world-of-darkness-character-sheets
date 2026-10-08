Feature: Character creator

  Scenario: The creator card explains what building involves
    Given a player with no saved characters
    When they open the roster
    Then the Character creator card is headed "A new story begins."
    And it names the stages "Concept & clan", "Traits & disciplines" and "Finishing touches"
    And it offers "Start character creator" and "Start with a blank sheet"

  Scenario: Starting the character creator opens a new build
    Given a player with no saved characters
    When they open the roster
    And they choose "Start character creator"
    Then the builder is shown
    When they open the roster
    Then the roster lists "Unnamed build" as in progress

  Scenario Outline: A refused create keeps the player on the roster
    Given the roster is open and the browser will not accept further saved data
    When they choose "<action>"
    Then they see "<message>"
    And they are still on the roster
    And the roster lists 0 entries

    Examples:
      | action                   | message                                                                 |
      | Start character creator  | The new build could not be saved. This browser refused to store it.     |
      | Start with a blank sheet | The new character could not be saved. This browser refused to store it. |

  Scenario: A second refusal is announced again
    Given the roster is open and the browser will not accept further saved data
    When they choose "Start with a blank sheet" twice
    Then the refusal has been announced twice

  Scenario: Without storage the library says so and offers nothing to do
    Given the browser provides no storage to the page
    When they open the roster
    Then they see that characters cannot be saved in this browser
    And the message that there are no characters yet is not shown
    And both create actions are disabled, can still be focused and are described by the message
    And choosing either create action leaves them on the roster
    And no tabs, search field, clan filter, status filter or sort control are shown

  Scenario: An empty library offers no browsing controls
    Given a player with no saved characters or builds
    When they open the roster
    Then they see "No characters yet. Create one to get started."
    And no tabs, search field, clan filter, status filter, sort control, heading row or summary row are shown
    And the Character creator card is shown
