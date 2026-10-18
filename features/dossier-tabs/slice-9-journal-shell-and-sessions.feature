Feature: Journal shell and sessions

  Scenario: An empty journal prompts for a first session or note
    Given a character with no session
    When the Journal tab is opened
    Then an empty state above the sections offers "Start session" and "New note"

  Scenario: Starting a session makes it the current one
    Given a character with "Session 11" current
    When the player starts a new session titled "Session 12" on the Journal tab
    Then "Session 12" is marked "current" and "Session 11" is not
    And the page explains that Session 11 stops being current

  Scenario: A blank title gets a default
    Given a character with no session
    When the player starts a session with no title on the Journal tab
    Then the new session is named "Session 1"

  Scenario: A session can be renamed and an earlier one made current again
    Given a character with "Session 11" and "Session 12" current
    When the player renames "Session 12" to "The portrait" on the Journal tab
    And makes "Session 11" current
    Then "Session 11" is the only current session and the other is named "The portrait"

  Scenario: Sessions persist
    Given a started session
    When the sheet is reloaded
    Then the same session is current on the Journal tab

  Scenario Outline: The application bar names the chronicle and session
    Given a character in the chronicle "<chronicle>" with "<session>" current
    When the Journal tab is opened
    Then the application bar reads "<label>"

    Examples:
      | chronicle      | session    | label                       |
      | The Glass City | Session 12 | The Glass City / Session 12 |
      | The Glass City |            | The Glass City              |
      |                | Session 12 | Session 12                  |
      |                |            |                             |

  Scenario: The label follows a new session on every tab
    Given a character in the chronicle "The Glass City" with "Session 11" current
    When the player starts "Session 12" and opens the Character sheet tab
    Then the application bar reads "The Glass City / Session 12"

  Scenario: The Journal has its three sections under one sub-navigation
    Given a saved character
    When the Journal tab is opened
    Then "Notes", "Experience" and "Character Record" are headings in that order
    And a sub-navigation links to each of them

  Scenario: The Journal shell is accessible
    Given a saved character
    When the Journal tab is scanned for accessibility problems
    Then no problems are reported

  Scenario: The Journal shell fits a phone
    Given a character with many sessions and a very long session title
    When the Journal tab is opened at 320 pixels wide with crowded content
    Then the page does not scroll sideways
