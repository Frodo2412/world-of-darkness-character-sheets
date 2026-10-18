Feature: The dossier tabs together

  Scenario: Every built tab is in the bar in the fixed order
    Given a saved character
    When its sheet is opened
    Then the tab bar reads Character sheet, Disciplines, Backgrounds, Combat, Journal, Level up

  Scenario Outline: The shell is the same on every tab
    Given a saved character
    When the <tab> tab is opened
    Then the character's name, the mode toggle and the save status are shown
    And the resources row is <resources>

    Examples:
      | tab         | resources |
      | Disciplines | shown     |
      | Backgrounds | shown     |
      | Combat      | shown     |
      | Journal     | shown     |
      | Level up    | not shown |

  Scenario: A tab can be opened from its address and survives a reload
    When the sheet is opened on the Combat tab and reloaded
    Then the Combat tab is shown

  Scenario: Back and Forward move between tabs
    Given the player opened Combat from the Character sheet
    When they press the browser Back button
    Then the Character sheet is shown and the address names no tab
    When they press Forward
    Then the Combat tab is shown

  Scenario: Switching tabs keeps the mode and uncommitted input
    Given a character in edit mode with a name field containing text not yet committed
    When the player switches to Journal and back
    Then they are still in edit mode and the typed text is there
    And "Editing character" was announced once, on entering edit mode, and not on switching

  Scenario: A reload returns to play mode
    Given a character in edit mode
    When the sheet is reloaded
    Then the sheet is in play mode

  Scenario Outline: Resources stay in step across tabs
    Given a character with <resource> to spend
    When the player changes it on the Combat tab and opens the Character sheet tab
    Then the <resource> shows the new amount
    When the player changes it there and opens the Combat tab
    Then the Combat tab shows that amount

    Examples:
      | resource   |
      | Blood Pool |
      | Willpower  |
      | Health     |

  Scenario: Tabs are operable from the keyboard
    Given the tab bar has focus on Disciplines
    When the player presses the right arrow, then Space
    Then Backgrounds opens, is marked selected in text, and the page has not scrolled
    When the player presses End, then Enter
    Then the last tab opens
    When the player presses Home
    Then focus is on the Character sheet tab

  Scenario: A record saved before the dossier tabs works on every tab and loses nothing
    Given a character saved before the dossier tabs with every legacy text field filled
    When every tab is opened in turn, a Discipline is viewed, a background is added in edit mode, a note is written and an advancement is confirmed
    Then each tab shows its empty state or the character's data and no error
    And every legacy text field is exactly as it was saved

  Scenario: The sheet's tab set is exactly the five tabs
    Given a saved character
    When its sheet is opened
    Then the registered tab keys are disciplines, backgrounds, combat, journal and levelup
