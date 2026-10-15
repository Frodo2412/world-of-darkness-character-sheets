Feature: Journal character record

  Scenario: The record shows its five parts
    Given a character with gear, equipment, two blood bonds, a derangement, three goals and a description
    When the Journal tab is opened in play mode
    Then Possessions, Blood Bonds & Vinculi, Derangements, Goals and Description show their entries

  Scenario: The record is read-only in play mode
    Given a character in play mode
    When the Journal tab is opened
    Then nothing in the Character record can be edited
    And the read-only hint is shown in that section

  Scenario: Every part is editable in edit mode and survives a reload
    Given a character in edit mode
    When the player adds a gear item, an equipment item, a blood bond, a derangement and a goal on the Journal record
    And sets every description field
    And reloads the sheet
    Then every entry and every description field is shown

  Scenario: Removing an entry can be undone
    Given a character in edit mode with two goals
    When the player removes the first goal on the Journal record
    Then one goal remains and "Removed" with its text and "Undo" is announced
    When the player presses Undo
    Then both goals are back in their order and focus is on the restored one

  Scenario: A blood bond rating outside 0 to 10 is corrected with a message
    Given a character in edit mode
    When the player enters a bond rating of 11, then -1, on the Journal record
    Then the rating shows 10, then 0, and "Rating kept between 0 and 10." is shown

  Scenario: Empty parts say so
    Given a character with an empty record
    When the Journal tab is opened
    Then Possessions, Blood bonds, Derangements and Goals each show an empty-state message
    And Description shows each field as "Not recorded"

  Scenario: The Journal record is accessible and fits a phone
    Given a character in edit mode with a full record
    When the Journal tab is scanned for accessibility problems
    Then no problems are reported
    When the Journal tab is opened at 320 pixels wide with crowded content
    Then the page does not scroll sideways
